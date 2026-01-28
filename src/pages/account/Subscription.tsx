import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import Button from "@/components/ui/Button";
import { ApiError, apiGet, apiPost, applyPromo, isUnauthorizedError } from "@/lib/api";
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

const ERROR_LABELS: Record<string, string> = {
  invalid_code: "Промокод не найден",
  expired_code: "Срок действия промокода истёк",
  already_used: "Вы уже использовали этот промокод",
};

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
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [autopayConsent, setAutopayConsent] = useState(true);
  const plansRef = useRef<HTMLDivElement | null>(null);

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
        "/api/subscriptions/status",
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

  const handleRenewClick = useCallback(() => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const promoErrorLabel = useMemo(() => {
    if (!promoError) return null;
    return ERROR_LABELS[promoError] ?? "Не удалось применить промокод";
  }, [promoError]);

  const handleCancel = useCallback(async () => {
    if (!accessToken || cancelLoading) return;
    const confirmCancel = window.confirm("Вы уверены что хотите отменить подписку?");
    if (!confirmCancel) return;

    setCancelError(null);
    setCancelSuccess(null);
    setCancelLoading(true);
    try {
      const res = await apiPost("/api/subscriptions/cancel", undefined, accessToken);
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

  const handleApplyPromo = useCallback(async () => {
    if (!accessToken || !promoCode.trim() || promoLoading) return;

    setPromoLoading(true);
    setPromoError(null);

    try {
      const res = await applyPromo(promoCode.trim(), accessToken);

      if (!res?.ok) {
        setPromoError(res?.error ?? "unknown_error");
        return;
      }

      await fetchStatus();
      setPromoCode("");
    } catch (err) {
      console.error("Failed to apply promo", err);
      setPromoError("network_error");
    } finally {
      setPromoLoading(false);
    }
  }, [accessToken, fetchStatus, promoCode, promoLoading]);

  const showHistory = (isActive || isCanceled || isExpired) && !loading;

  const createPayment = useCallback(
    async (plan: UiPlan) => {
      if (!accessToken || paymentPlan) return;

      if (!autopayConsent) {
        setPaymentError("Необходимо согласие на автоматические списания");
        return;
      }

      setPaymentError(null);
      setPaymentPlan(plan);
      const apiPlan = mapUiPlanToApi(plan);

      try {
        const res = await apiPost<{ confirmation_url?: string; error?: string }>(
          "/api/payments/create",
          { plan: apiPlan, autopay_consent: true },
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

      {statusMessage && !isCanceled && !isExpired && (
        <p className="account-subscription__status" role="status">{statusMessage}</p>
      )}
      {statusLabel && !statusMessage && !isCanceled && !isExpired && (
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
          {(isCanceled || isExpired) ? (
            <div className="account-subscription__ended" role="status">
              <div className="account-subscription__ended-body">
                <div className="account-subscription__ended-alert" aria-hidden="true">!</div>
                <div className="account-subscription__ended-content">
                  <h3>Подписка завершена</h3>
                  <p>
                    Ваша подписка завершилась <strong>{expiresLabel ?? "—"}</strong>
                  </p>
                  <div className="account-subscription__ended-date">
                    <span className="account-subscription__ended-date-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="3.5" y="5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 3.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M16 3.5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M3.5 9.5H20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span>{expiresLabel ?? "—"}</span>
                  </div>
                  <Button
                    className="account-button account-button--primary account-subscription__ended-button"
                    onClick={handleRenewClick}
                  >
                    Продлить подписку
                  </Button>
                </div>
              </div>
              <div className="account-subscription__ended-art" aria-hidden="true">
                <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M52 156c-24-17-29-46-17-70 13-27 43-41 71-35 7-22 29-38 54-37 29 0 53 19 59 45 25 1 47 18 53 42 8 31-10 64-40 73H52Z"
                    fill="#EAF2E6"
                  />
                  <rect x="92" y="54" width="122" height="122" rx="16" fill="#DCE7D3" />
                  <rect x="102" y="64" width="102" height="102" rx="12" fill="#F8FAF5" stroke="#C4D4B9" strokeWidth="4" />
                  <rect x="122" y="88" width="62" height="46" rx="10" fill="#F6E6D8" />
                  <path
                    d="M153 98l-9 15a4 4 0 0 0 3 6h18a4 4 0 0 0 3-6l-9-15a4 4 0 0 0-6 0Z"
                    fill="#F2A46A"
                  />
                  <circle cx="142" cy="118" r="3" fill="#F2A46A" />
                  <rect x="123" y="144" width="60" height="14" rx="7" fill="#C7D6B9" />
                  <rect x="148" y="146" width="22" height="6" rx="3" fill="#95AA84" />
                  <rect x="128" y="36" width="50" height="20" rx="8" fill="#DCE7D3" />
                  <rect x="132" y="32" width="42" height="16" rx="7" fill="#C4D4B9" />
                  <circle cx="78" cy="116" r="4" fill="#F3D6A6" />
                  <circle cx="224" cy="96" r="5" fill="#F3D6A6" />
                  <circle cx="210" cy="130" r="3" fill="#D7E2C9" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="account-subscription__empty" role="status">
              <h3>Оформите подписку</h3>
              <p>Подписка открывает доступ к полной карточке блюд, включая КБЖУ и составы блюд</p>
            </div>
          )}

          <div className="account-subscription__grid" role="list" ref={plansRef}>
            <TariffCard
              title="Месяц"
              price="99 ₽ в месяц*"
              hint="Подходит чтобы оценить удобство сервиса"
              onSelect={() => createPayment("month")}
              disabled={Boolean(paymentPlan)}
            />
            <TariffCard
              title="Год"
              price="999 ₽*"
              hint="12 месяцев по цене 10. Лучший выбор для тех, кто регулярно следует цели"
              accent
              onSelect={() => createPayment("year")}
              disabled={Boolean(paymentPlan)}
            />
          </div>

          <div className="account-subscription__consent" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            <label className="account-subscription__consent-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autopayConsent}
                onChange={(e) => setAutopayConsent(e.target.checked)}
                className="account-subscription__consent-checkbox"
                style={{ marginTop: '0.25rem' }}
              />
              <span className="account-subscription__consent-text" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Согласен на ежемесячные автосписания в соответствии с{" "}
                <a href="https://restaurantsecret.ru/#/legal" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                  пользовательским соглашением
                </a>
              </span>
            </label>
          </div>

          <p className="account-subscription__note">* Подписка продлевается автоматически до отмены</p>

          <div className="account-subscription__promo" role="group" aria-labelledby="promo-heading">
            <div className="account-subscription__promo-header">
              <div>
                <p id="promo-heading" className="account-subscription__promo-label">Есть промокод?</p>
              </div>
            </div>

            <div className="account-subscription__promo-form">
              <input
                id="promo-code"
                className="account-subscription__promo-input"
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value)}
                placeholder="Введите промокод"
                disabled={promoLoading}
                aria-label="Промокод"
              />
              <Button
                className="account-button account-button--primary account-subscription__promo-button"
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoCode.trim() || !accessToken}
              >
                {promoLoading ? "Применяем…" : "Применить"}
              </Button>
            </div>
            {promoErrorLabel && (
              <p className="account-panel__error-text" role="alert">
                {promoErrorLabel}
              </p>
            )}
          </div>

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
