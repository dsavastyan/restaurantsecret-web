import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import Button from "@/components/ui/Button";
import { ApiError, apiGet, apiPost, isUnauthorizedError } from "@/lib/api";
import { useAuth } from "@/store/auth";
import type { AccountOutletContext } from "./Layout";

type SubscriptionStatusResponse = {
  status?: string | null;
  status_label?: string | null;
  expires_at?: string | null;
};

function TariffCard({
  title,
  price,
  hint,
  description,
  accent,
}: {
  title: string;
  price: string;
  hint: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <article
      className={`account-subscription__tile${accent ? " account-subscription__tile--accent" : ""}`}
      role="listitem"
    >
      <div className="account-subscription__tile-header">
        <p className="account-subscription__tariff-name">{title}</p>
        <span className={`account-subscription__badge${accent ? " account-subscription__badge--success" : ""}`}>
          {accent ? "выгодно" : "попробовать"}
        </span>
      </div>
      <p className="account-subscription__tile-value">{price}</p>
      <p className="account-subscription__tile-hint">{hint}</p>
      <p className="account-subscription__tile-description">{description}</p>
    </article>
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
  const { token, reload } = useOutletContext<AccountOutletContext>();
  const accessToken = token || undefined;
  const logout = useAuth((state) => state.logout);
  const [statusData, setStatusData] = useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) {
      setStatusData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const status = await apiGet<SubscriptionStatusResponse>("/subscriptions/status", accessToken);
      setStatusData(status);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        logout();
        setStatusData(null);
        setError(null);
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setStatusData({ status: "none", status_label: null, expires_at: null });
        setError(null);
        return;
      }
      console.error("Failed to load subscription status", err);
      setError("Не удалось загрузить статус подписки. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, logout]);

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

  return (
    <section className="account-panel" aria-labelledby="account-subscription-heading">
      <header className="account-panel__header">
        <div>
          <h2 id="account-subscription-heading" className="account-panel__title">
            Управление подпиской
          </h2>
          <p className="account-panel__description">Отслеживайте статус и выбирайте подходящий тариф.</p>
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

      {!loading && (
        <div className="account-subscription__plans">
          {!isActive && (
            <div className="account-subscription__empty" role="status">
              <h3>Оформите подписку</h3>
              <p>Подписка открывает доступ к КБЖУ, составу блюд и персональным рекомендациям.</p>
            </div>
          )}

          <div className="account-subscription__grid" role="list">
            <TariffCard
              title="Месяц"
              price="99 ₽ в месяц*"
              hint="Подходит, чтобы оценить удобство сервиса и подобрать ресторан под ваши цели"
              description="Подписка продлевается автоматически до отмены"
            />
            <TariffCard
              title="Год"
              price="999 ₽"
              hint="12 месяцев за цену 10* — 2 месяца бесплатно"
              description="Лучший выбор для тех, кто регулярно следит за КБЖУ ресторанных блюд"
              accent
            />
          </div>
        </div>
      )}

      {showHistory && (
        <footer className="account-subscription__footer account-subscription__footer--spaced">
          <div>
            {isCanceled || isExpired ? (
              <p className="account-subscription__status">История доступна в отдельном разделе.</p>
            ) : null}
          </div>
          <Link to="/account/subscription/history" className="account-subscription__history">
            История подписок
          </Link>
        </footer>
      )}
    </section>
  );
}
