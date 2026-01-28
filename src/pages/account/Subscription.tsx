import { useCallback, useEffect, useMemo, useState } from "react";
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
  badge,
  onSelect,
  disabled,
  accent,
}: {
  title: string;
  price: string;
  hint: string;
  description?: string;
  badge?: string;
  onSelect?: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      className={`account-subscription__tile-v2${accent ? " account-subscription__tile-v2--accent" : ""}`}
      onClick={onSelect}
      disabled={disabled}
    >
      <div className="account-subscription__tile-v2-header">
        <p className="account-subscription__tile-v2-name">{title}</p>
        {badge && (
          <span className="account-subscription__tile-v2-badge">{badge}</span>
        )}
      </div>
      <p className="account-subscription__tile-v2-price">{price}</p>
      <p className="account-subscription__tile-v2-hint">{hint}</p>
      {description && <p className="account-subscription__tile-v2-desc">{description}</p>}
      <div className="account-subscription__tile-v2-footer">
        <span className="account-subscription__tile-v2-button">
          {accent ? "Оформить" : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
              Попробовать
            </>
          )}
        </span>
      </div>
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

  const showHistory = (isActive || isCanceled || isExpired) && !loading;
  const isNeverSubscribed = status === "none" && !showHistory;

  const pageTitle = isNeverSubscribed ? "Оформить подписку" : "Управление подпиской";

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
      const res = await apiPost<{ ok?: boolean }>("/api/subscriptions/cancel", undefined, accessToken);
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
      const res = await applyPromo(promoCode.trim(), accessToken) as { ok?: boolean; error?: string };

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
    <section className="account-panel-v2" aria-labelledby="account-subscription-heading">
      <header className="account-panel-v2__header">
        <h2 id="account-subscription-heading" className="account-panel-v2__title">
          {pageTitle}
        </h2>
      </header>

      {loading && <SubscriptionSkeleton />}

      {!loading && (
        <div className="account-subscription-v2">
          {(isActive || isExpired || isCanceled) && (
            <div className={`account-subscription-v2__card ${isActive ? 'is-active' : 'is-expired'}`}>
              <div className="account-subscription-v2__card-content">
                <div className="account-subscription-v2__card-header">
                  <div className="account-subscription-v2__card-icon">
                    {isActive ? (
                      <span role="img" aria-label="party">🎉</span>
                    ) : (
                      <span className="account-subscription-v2__card-warning">!</span>
                    )}
                  </div>
                  <h3 className="account-subscription-v2__card-title">
                    {isActive ? "Подписка активна" : "Подписка завершена"}
                  </h3>
                </div>

                <p className="account-subscription-v2__card-text">
                  {statusMessage}
                </p>

                <div className="account-subscription-v2__card-date-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
                  <span>{expiresLabel}</span>
                </div>

                <div className="account-subscription-v2__card-actions">
                  {isActive ? (
                    <button
                      className="account-subscription-v2__btn-cancel"
                      disabled={cancelLoading}
                      onClick={handleCancel}
                    >
                      <span className="close-icon">×</span>
                      {cancelLoading ? "Отменяем…" : "Отменить подписку"}
                    </button>
                  ) : (
                    <>
                      <button
                        className="account-subscription-v2__btn-renew"
                        onClick={() => createPayment("month")}
                        disabled={Boolean(paymentPlan)}
                      >
                        Продлить подписку <span className="arrow-next">→</span>
                      </button>
                      <button
                        className="account-subscription-v2__link-cancel"
                        onClick={handleCancel}
                        disabled={cancelLoading}
                      >
                        Отменить подписку
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="account-subscription-v2__card-illus">
                <img
                  src={isActive ? "/assets/subscription/subscription-active.webp" : "/assets/subscription/subscription-expired.webp"}
                  alt=""
                />
              </div>
            </div>
          )}

          {isNeverSubscribed && (
            <div className="account-subscription-v2__intro">
              <p>Подписка открывает доступ к полной карточке блюд</p>
            </div>
          )}

          {!isActive && (
            <div className="account-subscription-v2__plans">
              <div className="account-subscription-v2__plans-grid">
                <TariffCard
                  title="Год"
                  price="999 ₽ в год"
                  hint="12 месяцев по цене 10. Выгодный выбор для тех, кто регулярно следует цели"
                  badge="ВЫГОДНО"
                  accent
                  onSelect={() => createPayment("year")}
                  disabled={Boolean(paymentPlan)}
                />
                <TariffCard
                  title="Месяц"
                  price="99 ₽ в месяц*"
                  hint="Отличный вариант для оценки удобства сервиса"
                  onSelect={() => createPayment("month")}
                  disabled={Boolean(paymentPlan)}
                />
              </div>

              <p className="account-subscription-v2__plans-note">* Подписка продлевается автоматически до отмены</p>

              <div className="account-subscription-v2__promo-box">
                <div className="account-subscription-v2__promo-inner">
                  <p className="account-subscription-v2__promo-title">Есть промокод?</p>
                  <div className="account-subscription-v2__promo-form">
                    <input
                      id="promo-code"
                      className="account-subscription-v2__promo-input"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      placeholder="Введите промокод"
                      disabled={promoLoading}
                    />
                    <button
                      className="account-subscription-v2__promo-btn"
                      onClick={handleApplyPromo}
                      disabled={promoLoading || !promoCode.trim() || !accessToken}
                    >
                      {promoLoading ? "..." : "Применить"}
                    </button>
                  </div>
                </div>
                {promoErrorLabel && (
                  <p className="account-subscription-v2__error" role="alert">
                    {promoErrorLabel}
                  </p>
                )}
              </div>

              <div className="account-subscription-v2__consent">
                <label className="account-subscription-v2__consent-label">
                  <input
                    type="checkbox"
                    checked={autopayConsent}
                    onChange={(e) => setAutopayConsent(e.target.checked)}
                  />
                  <span>
                    Согласен на ежемесячные автосписания в соответствии с{" "}
                    <a href="https://restaurantsecret.ru/#/legal" target="_blank" rel="noopener noreferrer">
                      пользовательским соглашением
                    </a>
                  </span>
                </label>
              </div>

              {paymentError && (
                <div className="account-subscription-v2__error-box" role="alert">
                  <p>{paymentError}</p>
                </div>
              )}
            </div>
          )}

          {cancelSuccess && (
            <div className="account-subscription-v2__success-box" role="status">
              <p>{cancelSuccess}</p>
            </div>
          )}

          {cancelError && (
            <div className="account-subscription-v2__error-box" role="alert">
              <p>{cancelError}</p>
            </div>
          )}

          {error && (
            <div className="account-subscription-v2__error-box" role="alert">
              <p>{error}</p>
            </div>
          )}
        </div>
      )}

      {showHistory && (
        <footer className="account-subscription-v2__footer">
          <Link to="/account/subscription/history" className="account-subscription-v2__history-link">
            История подписок
          </Link>
        </footer>
      )}
    </section>
  );
}
