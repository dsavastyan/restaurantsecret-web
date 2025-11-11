import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import Button from "@/components/ui/Button";
import { apiGet, apiPost } from "@/lib/api";
import type { AccountOutletContext } from "./Layout";

function SubscriptionSkeleton() {
  return (
    <div className="account-subscription__grid" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="account-subscription__tile account-skeleton">
          <div className="account-skeleton__line" />
          <div className="account-skeleton__line account-skeleton__line--wide" />
          <div className="account-skeleton__line account-skeleton__line--short" />
        </div>
      ))}
    </div>
  );
}

type SubscriptionStatus = {
  status?: string | null;
  status_label?: string | null;
  can_cancel?: boolean;
};

export default function AccountSubscription() {
  const { sub, daysLeft, reload, token, isLoading, error } =
    useOutletContext<AccountOutletContext>();
  const accessToken = token || undefined;
  const [data, setData] = useState<SubscriptionStatus | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) {
      setData(null);
      return;
    }
    try {
      const status = await apiGet("/subscriptions/status", accessToken);
      setData(status);
    } catch (err) {
      console.error("Failed to load subscription status", err);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const formattedExpiresAt = useMemo(() => {
    if (!sub?.expires_at) return null;
    try {
      return new Date(sub.expires_at).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (err) {
      console.error("Failed to format subscription expires_at", err);
      return null;
    }
  }, [sub?.expires_at]);

  const statusLabel = useMemo(() => {
    const labelFromData = (() => {
      if (!data) return null;
      if (typeof data.status_label === "string" && data.status_label.trim()) {
        return data.status_label;
      }
      if (typeof data.status === "string" && data.status.trim()) {
        return data.status;
      }
      return null;
    })();

    if (labelFromData) {
      return labelFromData;
    }

    if (!sub) return "—";
    if (!formattedExpiresAt) return sub.expired ? "Истекла" : sub.status || "Активна";
    return sub.expired ? `Истекла ${formattedExpiresAt}` : `Активна до ${formattedExpiresAt}`;
  }, [data, sub, formattedExpiresAt]);

  const accessLabel = useMemo(() => {
    if (!sub) return "—";
    if (sub.expired) return "Доступ закрыт";
    if (daysLeft === null) return "—";
    if (daysLeft === 0) return "Истекает сегодня";
    if (daysLeft === 1) return "Остался 1 день";
    return `Осталось ${daysLeft} дней`;
  }, [sub, daysLeft]);

  const paymentMethod = useMemo(() => {
    if (!sub) return "—";
    const providerCandidate =
      sub.payment_provider || sub.payment_method || sub.provider || sub.gateway;
    if (providerCandidate) return providerCandidate;
    const status = sub.status?.toLowerCase?.() || "";
    const plan = sub.plan?.toLowerCase?.() || "";
    const isMock = status.includes("mock") || plan.includes("mock");
    return isMock ? "—" : "YooKassa";
  }, [sub]);

  const planTitle = sub?.plan || "—";
  const showSkeleton = isLoading && !sub && !error;
  const showEmpty = !isLoading && !sub && !error;
  const showSubscription = Boolean(sub) && !showSkeleton;

  const handleRefresh = useCallback(async () => {
    setCancelError(null);
    await Promise.all([reload(), fetchStatus()]);
  }, [reload, fetchStatus]);

  return (
    <section className="account-panel" aria-labelledby="account-subscription-heading">
      <div className="account-panel__header">
        <div>
          <h2 id="account-subscription-heading" className="account-panel__title">
            Управление подпиской
          </h2>
          <p className="account-panel__lead">
            Проверяйте статус подписки и обновляйте данные после оплаты или отмены.
          </p>
        </div>
        <div className="account-panel__actions">
          <button
            type="button"
            onClick={handleRefresh}
            className="account-button account-button--outline"
            disabled={isLoading}
          >
            {isLoading ? "Обновляем…" : "Обновить данные"}
          </button>
        </div>
      </div>

      {error && (
        <div className="account-panel__box account-panel__box--error" role="alert">
          <p className="account-panel__error-text">{error}</p>
          <button
            type="button"
            className="account-button account-button--outline"
            onClick={handleRefresh}
          >
            Повторить загрузку
          </button>
        </div>
      )}

      {showSkeleton && <SubscriptionSkeleton />}

      {showSubscription && sub && (
        <div className="account-subscription__grid" role="list">
          <article className="account-subscription__tile account-subscription__tile--accent" role="listitem">
            <h3 className="account-subscription__tile-title">Текущий тариф</h3>
            <p className="account-subscription__tile-value">{planTitle}</p>
            <p className="account-subscription__tile-hint">
              Подписка открывает доступ к расширенному меню и фильтрам.
            </p>
            {!sub.expired && (
              <Button
                className="account-button account-button--danger"
                disabled={!data?.can_cancel || cancelLoading}
                onClick={async () => {
                  if (!accessToken || cancelLoading) return;
                  setCancelError(null);
                  setCancelLoading(true);
                  try {
                    const res = await apiPost(
                      "/subscriptions/cancel",
                      undefined,
                      accessToken
                    );
                    if (res?.ok) {
                      const s = await apiGet("/subscriptions/status", accessToken);
                      setData(s);
                      await reload();
                    } else {
                      alert("Не удалось отменить подписку");
                      setCancelError("Не удалось отменить подписку. Попробуйте позже.");
                    }
                  } catch (err) {
                    console.error("Failed to cancel subscription", err);
                    alert("Не удалось отменить подписку");
                    setCancelError("Не удалось отменить подписку. Попробуйте позже.");
                  } finally {
                    setCancelLoading(false);
                  }
                }}
              >
                {cancelLoading ? "Отменяем…" : "Отменить подписку"}
              </Button>
            )}
            {cancelError && (
              <p className="account-subscription__error" role="status">
                {cancelError}
              </p>
            )}
          </article>

          <article className="account-subscription__tile" role="listitem">
            <h3 className="account-subscription__tile-title">Статус и дата</h3>
            <p className="account-subscription__tile-value">{statusLabel}</p>
            <p className="account-subscription__tile-hint">
              {sub.expired
                ? "Продлите подписку, чтобы продолжить пользоваться сервисом."
                : "Мы уведомим вас о продлении заранее."}
            </p>
          </article>

          <article className="account-subscription__tile" role="listitem">
            <h3 className="account-subscription__tile-title">Способ оплаты</h3>
            <p className="account-subscription__tile-value">{paymentMethod}</p>
            <p className="account-subscription__tile-hint">
              Безопасные платежи через YooKassa. Данные карты не хранятся у нас.
            </p>
          </article>

          <article className="account-subscription__tile" role="listitem">
            <h3 className="account-subscription__tile-title">Доступ</h3>
            <p className="account-subscription__tile-value">{accessLabel}</p>
            <p className="account-subscription__tile-hint">
              Контролируйте, сколько времени остаётся до окончания подписки.
            </p>
          </article>
        </div>
      )}

      {showEmpty && (
        <div className="account-subscription__empty" role="status">
          <h3>Нет активной подписки</h3>
          <p>
            Активируйте подписку, чтобы видеть состав блюд, КБЖУ и персональные рекомендации.
          </p>
          <Link to="/catalog" className="account-button">
            Активировать подписку
          </Link>
        </div>
      )}

      <footer className="account-subscription__footer">
        <Link to="/account/subscription/history" className="account-subscription__history">
          История подписки
        </Link>
      </footer>
    </section>
  );
}
