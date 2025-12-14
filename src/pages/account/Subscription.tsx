import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import Button from "@/components/ui/Button";
import { ApiError, apiGet, apiPost, isUnauthorizedError } from "@/lib/api";
import { useAuth } from "@/store/auth";
import {
  selectHasActiveSub,
  selectSetHasActiveSub,
  useSubscriptionStore,
} from "@/store/subscription";
import type { AccountOutletContext } from "./Layout";

type SubscriptionStatusResponse = {
  ok?: boolean;
  plan?: string | null;
  status?: string | null;
  status_label?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  payment_method?: string | null;
  can_cancel?: boolean;
  error?: string | null;
};

type UiPlan = "month" | "year";
type ApiPlan = "monthly" | "annual";

function mapUiPlanToApi(plan: UiPlan): ApiPlan {
  if (plan === "month") return "monthly";
  return "annual";
}

function TariffCard({
  title,
  price,
  hint,
  description,
  accent,
  onSelect,
  disabled,
}: {
  title: string;
  price: string;
  hint: string;
  description?: string;
  accent?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`account-subscription__tile account-subscription__tile-button${accent ? " account-subscription__tile--accent" : ""}`}
      role="listitem"
      onClick={onSelect}
      disabled={disabled}
    >
      <div className="account-subscription__tile-header">
        <p className="account-subscription__tariff-name">{title}</p>
        <span className={`account-subscription__badge${accent ? " account-subscription__badge--success" : ""}`}>
          {accent ? "выгодно" : "попробовать"}
        </span>
      </div>
      <p className="account-subscription__tile-value">{price}</p>
      <p className="account-subscription__tile-hint">{hint}</p>
      {description && <p className="account-subscription__tile-description">{description}</p>}
    </button>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="account-subscription__grid" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="account-subscription__tile account-skeleton">
          <div className="account-skeleton__line" />
          <div className="account-skeleton__line account-skeleton__line--wide" />
          <div className="account-skeleton__line account-skeleton__line--short" />
        </div>
      ))}
    </div>
  );
}

export default function AccountSubscription() {
  const { reload } = useOutletContext<AccountOutletContext>();
  const { accessToken, logout } = useAuth((state) => ({
    accessToken: state.accessToken || undefined,
    logout: state.logout,
  }));
  const hasActiveSub = useSubscriptionStore(selectHasActiveSub);
  const setHasActiveSub = useSubscriptionStore(selectSetHasActiveSub);
  const [statusData, setStatusData] = useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<UiPlan | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) {
      setStatusData(null);
      setLoading(false);
      if (hasActiveSub) {
        setHasActiveSub(false);
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<SubscriptionStatusResponse>(
        "/subscriptions/status",
        accessToken,
      );

      if (response && typeof response === "object" && response.ok === false) {
        setStatusData(null);
        setError(
          typeof response.error === "string" && response.error.trim()
            ? response.error
            : "Не удалось загрузить статус подписки. Попробуйте позже.",
        );
        return;
      }

      const normalizeStatus = (value?: string | null) => {
        if (typeof value !== "string") return "none" as const;
        const trimmed = value.trim().toLowerCase();
        const known = ["active", "expired", "canceled", "none"] as const;
        if (known.includes(trimmed as (typeof known)[number])) {
          return trimmed as (typeof known)[number];
        }
        return trimmed || "none";
      };

      const normalized = {
        ...response,
        status: normalizeStatus(response?.status),
        plan: typeof response?.plan === "string" ? response.plan.trim() : response?.plan ?? null,
        payment_method:
          typeof response?.payment_method === "string" && response.payment_method.trim()
            ? response.payment_method.trim()
            : response?.payment_method ?? null,
      } satisfies SubscriptionStatusResponse;

      setStatusData(normalized);
      setHasActiveSub(normalized.status === "active");
    } catch (err) {
      if (isUnauthorizedError(err)) {
        logout();
        setStatusData(null);
        setError(null);
        setHasActiveSub(false);
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setStatusData({ status: "none", status_label: null, expires_at: null });
        setError(null);
        setHasActiveSub(false);
        return;
      }
      console.error("Failed to load subscription status", err);
      setError("Не удалось загрузить статус подписки. Попробуйте позже.");
      setHasActiveSub(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, hasActiveSub, logout, setHasActiveSub]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (err) {
      console.error("Failed to format subscription expires_at", err);
      return value;
    }
  }, []);

  const status = statusData?.status || "none";
  const isActive = status === "active";
  const isCanceled = status === "canceled";
  const isExpired = status === "expired";
  const expiresLabel = useMemo(() => formatDate(statusData?.expires_at), [statusData?.expires_at, formatDate]);

  const statusMessage = useMemo(() => {
    if (isActive) return `Подписка активна до ${expiresLabel ?? "—"}`;
    if (isCanceled || isExpired) return `Подписка завершилась ${expiresLabel ?? ""}`.trim();
    return null;
  }, [isActive, isCanceled, isExpired, expiresLabel]);

  const statusLabel = useMemo(() => {
    if (typeof statusData?.status_label === "string" && statusData.status_label.trim()) {
      return statusData.status_label;
    }
    if (status === "none") return null;
    return status;
  }, [statusData?.status_label, status]);

  const handleCancel = useCallback(async () => {
    if (!accessToken || cancelLoading) return;
    const confirmCancel = window.confirm("Вы уверены что хотите отменить подписку?");
    if (!confirmCancel) return;

    setCancelError(null);
    setCancelSuccess(null);
    setCancelLoading(true);
    try {
      const res = await apiPost("/subscriptions/cancel", undefined, accessToken);
      if (res?.ok) {
        setCancelSuccess("Подписка успешна отменена");
        await fetchStatus();
        await reload();
      } else {
        setCancelError("Не удалось отменить подписку. Попробуйте позже.");
      }
    } catch (err) {
      if (isUnauthorizedError(err)) {
        logout();
        setCancelError(null);
        setCancelLoading(false);
        return;
      }
      console.error("Failed to cancel subscription", err);
      setCancelError("Не удалось отменить подписку. Попробуйте позже.");
    } finally {
      setCancelLoading(false);
    }
  }, [accessToken, cancelLoading, fetchStatus, reload, logout]);

  const showHistory = (isActive || isCanceled || isExpired) && !loading;

  const createPayment = useCallback(
    async (plan: UiPlan) => {
      if (!accessToken || paymentPlan) return;

      setPaymentError(null);
      setPaymentPlan(plan);
      const apiPlan = mapUiPlanToApi(plan);

      try {
        const res = await apiPost<{ confirmation_url?: string; error?: string }>(
          "/api/payments/create",
          { plan: apiPlan },
          accessToken,
        );

        const confirmationUrl =
          typeof res?.confirmation_url === "string" && res.confirmation_url.trim()
            ? res.confirmation_url.trim()
            : null;

        if (confirmationUrl) {
          window.location.href = confirmationUrl;
          return;
        }

        const message =
          typeof res?.error === "string" && res.error.trim()
            ? res.error.trim()
            : "Не удалось создать платёж. Попробуйте позже.";
        setPaymentError(message);
      } catch (err) {
        if (isUnauthorizedError(err)) {
          logout();
          setPaymentError(null);
          setPaymentPlan(null);
          return;
        }
        console.error("Failed to create payment", err);
        setPaymentError("Не удалось создать платёж. Попробуйте позже.");
      } finally {
        setPaymentPlan(null);
      }
    },
    [accessToken, logout, paymentPlan],
  );

  return (
    <section className="account-panel" aria-labelledby="account-subscription-heading">
      <header className="account-panel__header">
        <div>
          <h2 id="account-subscription-heading" className="account-panel__title">
            Управление подпиской
          </h2>
        </div>
        {isActive && (
          <Button
            className="account-button account-button--danger"
            disabled={cancelLoading}
            onClick={handleCancel}
          >
            {cancelLoading ? "Отменяем…" : "Отменить подписку"}
          </Button>
        )}
      </header>

      {statusMessage && <p className="account-subscription__status" role="status">{statusMessage}</p>}
      {statusLabel && !statusMessage && (
        <p className="account-subscription__status" role="status">{statusLabel}</p>
      )}

      {cancelSuccess && (
        <div className="account-panel__box account-panel__box--success" role="status">
          <p className="account-panel__description">{cancelSuccess}</p>
        </div>
      )}

      {cancelError && (
        <div className="account-panel__box account-panel__box--error" role="alert">
          <p className="account-panel__error-text">{cancelError}</p>
        </div>
      )}

      {error && (
        <div className="account-panel__box account-panel__box--error" role="alert">
          <p className="account-panel__error-text">{error}</p>
        </div>
      )}

      {loading && <SubscriptionSkeleton />}

      {!loading && !isActive && (
        <div className="account-subscription__plans">
          <div className="account-subscription__empty" role="status">
            <h3>Оформите подписку</h3>
            <p>Подписка открывает доступ к полной карточке блюд, включая КБЖУ и составы блюд</p>
          </div>

          <div className="account-subscription__grid" role="list">
            <TariffCard
              title="Месяц"
              price="99 ₽ в месяц*"
              hint="Подходит чтобы оценить удобство сервиса"
              onSelect={() => createPayment("month")}
              disabled={Boolean(paymentPlan)}
            />
            <TariffCard
              title="Год"
              price="999 ₽"
              hint="12 месяцев по цене 10. Лучший выбор для тех, кто регулярно следует цели"
              accent
              onSelect={() => createPayment("year")}
              disabled={Boolean(paymentPlan)}
            />
          </div>

          <p className="account-panel__description">Подписка продлевается автоматически до отмены</p>

          {paymentPlan && (
            <p className="account-subscription__status" role="status">
              Перенаправляем на оплату…
            </p>
          )}
          {paymentError && (
            <div className="account-panel__box account-panel__box--error" role="alert">
              <p className="account-panel__error-text">{paymentError}</p>
            </div>
          )}
        </div>
      )}

      {showHistory && (
        <footer className="account-subscription__footer account-subscription__footer--spaced">
          <Link to="/account/subscription/history" className="account-subscription__history">
            История подписок
          </Link>
        </footer>
      )}
    </section>
  );
}
