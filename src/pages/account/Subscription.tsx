import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, apiGet, apiPost, quotePromo, redeemPromo, isUnauthorizedError, PromoQuote, attachPaymentMethod } from "@/lib/api";
import { useAuth } from "@/store/auth";
import {
  selectHasActiveSub,
  selectSetHasActiveSub,
  useSubscriptionStore,
} from "@/store/subscription";
import SubscriptionPlansModal from "@/components/subscription/SubscriptionPlansModal";
import SubscriptionPlans from "@/components/subscription/SubscriptionPlans";
import { analytics } from "@/services/analytics";

// Import assets from src/assets to ensure they are bundled correctly
import subscriptionActive from "@/assets/subscription/subscription-active.webp";
import subscriptionActivePng from "@/assets/subscription/subscription-active.png";
import subscriptionExpiredPng from "@/assets/subscription/subscription-expired.png";

type SubscriptionStatusResponse = {
  ok?: boolean;
  plan?: string | null;
  status?: string | null;
  status_label?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  payment_method?: string | null;
  can_cancel?: boolean;
  canceled_at?: string | null;
  next_charge_at?: string | null;
  source?: string | null;
  is_trial?: boolean;
  error?: string | null;
};

type UiPlan = "month" | "year";

type ApiPlan = "monthly" | "annual";
type SubscriptionLocationState = { from?: string } | null;

const PLAN_LABELS: Record<string, string> = {
  monthly: "Месячная",
  annual: "Годовая",
  mock: "Бесплатный период",
};

const PLAN_PRICE_BADGES: Record<string, string> = {
  monthly: "99 РУБ / МЕСЯЦ",
  annual: "999 РУБ / ГОД",
  mock: "ПРОБНЫЙ ПЕРИОД",
};

const ERROR_LABELS: Record<string, string> = {
  invalid_code: "Промокод не найден",
  not_found: "Промокод не найден",
  expired_code: "Срок действия промокода истёк",
  expired: "Срок действия промокода истёк",
  already_used: "Вы уже использовали этот промокод",
  not_started: "Акция еще не началась",
  global_limit_reached: "Лимит использований исчерпан",
  user_limit_reached: "Вы уже использовали этот промокод",
  network_error: "Ошибка сети. Попробуйте позже.",
};

function mapUiPlanToApi(plan: UiPlan): ApiPlan {
  if (plan === "month") return "monthly";
  return "annual";
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
  const location = useLocation() as { state: SubscriptionLocationState };
  const { accessToken, logout } = useAuth((state) => ({
    accessToken: state.accessToken || undefined,
    logout: state.logout,
  }));
  const hasActiveSub = useSubscriptionStore(selectHasActiveSub);
  const setHasActiveSub = useSubscriptionStore(selectSetHasActiveSub);
  const [statusData, setStatusData] = useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<UiPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<UiPlan | null>('year');
  const [promoError, setPromoError] = useState<string | null>(null);


  const [promoLoading, setPromoLoading] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [promoQuote, setPromoQuote] = useState<PromoQuote | null>(null);

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

      const normalizeStatus = (value?: string | null, expiresAt?: string | null) => {
        if (typeof value !== "string") return "none" as const;
        const trimmed = value.trim().toLowerCase();

        if ((trimmed === "active" || trimmed === "canceled") && expiresAt) {
          const expiresDate = new Date(expiresAt);
          if (!isNaN(expiresDate.getTime()) && expiresDate < new Date()) {
            return "expired";
          }
          return "active";
        }

        const known = ["active", "expired", "canceled", "none"] as const;
        if (known.includes(trimmed as (typeof known)[number])) {
          return trimmed as (typeof known)[number];
        }
        return (trimmed || "none") as (typeof known)[number] | string;
      };

      const normalized = {
        ...response,
        status: normalizeStatus(response?.status, response?.expires_at),
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
    const stateFrom = location.state && typeof location.state.from === "string" ? location.state.from : null;
    const prevPath = typeof window !== "undefined" ? window.sessionStorage.getItem("rs_prev_path") : null;
    const sourcePage = stateFrom || prevPath || document.referrer || "direct";
    analytics.track("subscription_page_view", {
      source_context: sourcePage,
      source_page: sourcePage,
      current_status: statusData?.status || "none"
    });
  }, []); // Only once on mount

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
  const illustrationSrc = subscriptionActive;
  const currentPlanKey = typeof statusData?.plan === "string" ? statusData.plan.trim().toLowerCase() : "";
  const currentUiPlan: UiPlan | null = currentPlanKey === "monthly" ? "month" : currentPlanKey === "annual" ? "year" : null;
  const planTitle = PLAN_LABELS[currentPlanKey] || "Тариф";
  const planPriceBadge = PLAN_PRICE_BADGES[currentPlanKey] || "ТЕКУЩИЙ ТАРИФ";
  const paymentPeriodLabel = statusData?.is_trial && !statusData?.next_charge_at
    ? "Пробный период"
    : currentPlanKey === "annual"
      ? "Оплата каждый год"
      : currentPlanKey === "monthly"
        ? "Оплата каждый месяц"
        : "Периодичность оплаты";
  const nextBillingLabel = statusData?.next_charge_at
    ? `Следующее списание: ${formatDate(statusData?.next_charge_at) ?? "—"}`
    : statusData?.is_trial
      ? `Окончание пробного периода: ${expiresLabel ?? "—"}`
      : `Следующее списание: ${expiresLabel ?? "—"}`;
  const expiredTitle = "Подписка истекла";
  const expiredDescription = `Ваша подписка на ${planTitle} закончилась ${expiresLabel ?? ""}`.trim();

  const showHistory = (isActive || isCanceled || isExpired) && !loading;
  const isNeverSubscribed = status === "none" && !showHistory;

  const pageTitle = isNeverSubscribed ? "Оформить подписку" : "Управление подпиской";

  const promoErrorLabel = useMemo(() => {
    if (!promoError) return null;
    return ERROR_LABELS[promoError] ?? promoError ?? "Не удалось применить промокод";
  }, [promoError]);

  const createPayment = useCallback(
    async (plan: UiPlan, code?: string, deferUntilPeriodEnd?: boolean) => {
      if (!accessToken || paymentPlan) return;

      setPaymentError(null);
      setPaymentPlan(plan);
      const apiPlan = mapUiPlanToApi(plan);

      analytics.track("checkout_started", { plan, source_page: "subscription_management" });

      try {
        const body: any = { plan: apiPlan, autopay_consent: true };
        if (code) body.promo_code = code;
        if (deferUntilPeriodEnd) body.defer_until_period_end = true;

        const res = await apiPost<{ confirmation_url?: string; error?: string }>(
          "/api/payments/create",
          body,
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

  const handleSelectPlan = useCallback((plan: UiPlan) => {
    setSelectedPlan(plan);
  }, []);

  const handleQuotePromo = useCallback(async (code: string) => {
    const trimmedCode = code.trim();
    if (!accessToken || !trimmedCode || promoLoading) return;

    setPromoLoading(true);
    setPromoError(null);
    setPromoQuote(null);

    try {
      const res = await quotePromo(trimmedCode, accessToken);
      if (res?.valid) {
        setPromoQuote(res);
      } else {
        setPromoError(res?.error || "invalid_code");
      }
    } catch (err) {
      console.error("promo quote error", err);
      if (err instanceof ApiError && err.payload && typeof err.payload === 'object') {
        const payload = err.payload as any;
        setPromoError(payload.error || "network_error");
      } else {
        setPromoError("network_error");
      }
    } finally {
      setPromoLoading(false);
    }
  }, [accessToken, promoLoading]);

  const handleRedeemPromo = useCallback(async (code: string) => {
    const trimmedCode = code.trim();
    if (!accessToken || !trimmedCode || promoLoading) return;

    setPromoLoading(true);
    setPromoError(null);

    try {
      const res = await redeemPromo(trimmedCode, accessToken, selectedPlan ? mapUiPlanToApi(selectedPlan) : undefined);
      if (res?.success) {
        analytics.track("promo_redeemed", { code: trimmedCode });
        if (res.next_step === 'link_card') {
          // Zero-Auth attach
          let planToUse: UiPlan | null = selectedPlan;
          if (promoQuote?.plan === 'annual') planToUse = 'year';
          if (promoQuote?.plan === 'monthly') planToUse = 'month';
          if (!planToUse) planToUse = 'month';

          const attachRes = await attachPaymentMethod(accessToken, {
            promo_code: trimmedCode,
            plan: mapUiPlanToApi(planToUse),
            return_url: window.location.origin + '/account/subscription'
          });

          analytics.track("checkout_started", { plan: planToUse, source_page: "subscription_management", method: "promo_attach" });

          if (attachRes?.confirmation_url) {
            window.location.href = attachRes.confirmation_url;
            return;
          }
        } else if (res.next_step === 'payment') {
          // Use selected plan or default
          let planToUse: UiPlan | null = selectedPlan;

          // If promo forces a plan, use it
          if (promoQuote?.plan === 'annual') planToUse = 'year';
          if (promoQuote?.plan === 'monthly') planToUse = 'month';

          // Default fallback
          if (!planToUse) planToUse = 'month';

          createPayment(planToUse, trimmedCode);
        } else {
          setPromoQuote(null);
          setPlansOpen(false); // Close modal on success
          await fetchStatus();
        }
      } else {
        setPromoError(res?.error || "unknown_error");
      }
    } catch (err) {
      console.error("promo redeem error", err);
      if (err instanceof ApiError && err.payload && typeof err.payload === 'object') {
        const payload = err.payload as any;
        setPromoError(payload.error || "network_error");
      } else {
        setPromoError("network_error");
      }
    } finally {
      setPromoLoading(false);
    }
  }, [accessToken, promoLoading, promoQuote, createPayment, fetchStatus, selectedPlan]);

  const handleProceed = useCallback(() => {
    const isFreeAccessNoCard = promoQuote?.type === 'free_days' && !promoQuote.requires_subscribing;

    if (selectedPlan || isFreeAccessNoCard) {
      if (promoQuote?.type === 'free_days') {
        // Use either the code from quote (preferred) or what we might have elsewhere
        handleRedeemPromo(promoQuote.code || '');
      } else if (selectedPlan) {
        createPayment(selectedPlan, promoQuote?.code);
      }
    }
  }, [selectedPlan, createPayment, promoQuote, handleRedeemPromo]);

  const handleResetPromo = useCallback(() => {
    setPromoQuote(null);
    setPromoError(null);
  }, []);

  const handleChoosePlan = useCallback((plan: UiPlan) => {
    setSelectedPlan(plan);
    const deferUntilPeriodEnd = Boolean(isActive && currentUiPlan && currentUiPlan !== plan);
    if (promoQuote?.type === 'free_days') {
      handleRedeemPromo(promoQuote.code || '');
    } else {
      createPayment(plan, promoQuote?.code, deferUntilPeriodEnd);
    }
  }, [createPayment, promoQuote, handleRedeemPromo, isActive, currentUiPlan]);

  return (
    <section className="account-panel-v2 account-subscription-panel" aria-labelledby="account-subscription-heading">
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
              <div className="account-subscription-v2__mobile-surface">
                {isActive ? (
                  <>
                    <div className="account-subscription-v2__floating-frame">
                      <h3 className="account-subscription-v2__floating-title">Текущая подписка</h3>

                      <div className="account-subscription-v2__inner-frame">
                        <div className="account-subscription-v2__inner-top">
                          <div className="account-subscription-v2__dish-icon" aria-hidden="true">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                              <path d="M4 16C4 12.2 7.1 9 11 9h2c3.9 0 7 3.2 7 7H4Z" fill="currentColor" opacity=".2" />
                              <path d="M12 4v2M7.5 7.5l1.4 1.4M16.5 7.5l-1.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <path d="M3.5 16h17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                          </div>
                          <div className="account-subscription-v2__inner-plan">{planTitle}</div>
                          <div className="account-subscription-v2__inner-badge">{planPriceBadge}</div>
                        </div>

                        <p className="account-subscription-v2__inner-meta">{paymentPeriodLabel}</p>
                        <p className="account-subscription-v2__inner-next">{nextBillingLabel}</p>
                      </div>

                      <button
                        className="account-subscription-v2__btn-renew"
                        onClick={() => setPlansOpen(true)}
                        disabled={Boolean(paymentPlan)}
                      >
                        Изменить план
                      </button>

                      <img
                        className="account-subscription-v2__desktop-sticker"
                        src={subscriptionActivePng}
                        alt=""
                      />

                      <p className="account-subscription-v2__notice account-subscription-v2__notice--desktop">
                        Мы пришлем уведомление за <strong>2 дня до следующего списания</strong>!
                      </p>
                    </div>

                    <div className="account-subscription-v2__mobile-illus">
                      <img
                        src={illustrationSrc}
                        alt=""
                      />
                    </div>
                    <p className="account-subscription-v2__notice account-subscription-v2__notice--mobile">
                      Мы пришлем уведомление за <strong>2 дня до следующего списания</strong>!
                    </p>
                  </>
                ) : (
                  <>
                    <div className="account-subscription-v2__floating-frame account-subscription-v2__floating-frame--expired">
                      <h3 className="account-subscription-v2__floating-title account-subscription-v2__floating-title--center">{expiredTitle}</h3>
                      <p className="account-subscription-v2__expired-description">{expiredDescription}</p>
                      <button
                        className="account-subscription-v2__btn-renew"
                        onClick={() => setPlansOpen(true)}
                        disabled={Boolean(paymentPlan)}
                      >
                        Продлить подписку
                      </button>
                    </div>
                    <div className="account-subscription-v2__mobile-illus account-subscription-v2__mobile-illus--expired">
                      <img
                        src={subscriptionExpiredPng}
                        alt=""
                      />
                    </div>
                    <p className="account-subscription-v2__notice account-subscription-v2__notice--expired">
                      Чтобы и дальше продолжать пользоваться Премиум функциями, обновите подписку
                    </p>
                  </>
                )}

                {showHistory && (
                  <div className="account-subscription-v2__card-history">
                    <Link to="/account/subscription/history" className="account-subscription-v2__btn-history">
                      История подписок
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {isNeverSubscribed && (
            <div className="account-subscription-v2__intro">
              <SubscriptionPlans
                selectedPlan={selectedPlan}
                onSelectPlan={handleSelectPlan}
                onProceed={handleProceed}
                onQuotePromo={handleQuotePromo}
                onRedeemPromo={handleRedeemPromo}
                onResetPromo={handleResetPromo}
                loading={promoLoading || Boolean(paymentPlan)}
                promoError={promoErrorLabel}
                promoQuote={promoQuote}
              />
            </div>
          )}

          <SubscriptionPlansModal
            open={plansOpen}
            onClose={() => setPlansOpen(false)}
            onChoosePlan={handleChoosePlan}
            onQuotePromo={handleQuotePromo}
            onRedeemPromo={handleRedeemPromo}
            onResetPromo={handleResetPromo}
            loading={promoLoading || Boolean(paymentPlan)}
            promoError={promoErrorLabel}
            promoQuote={promoQuote}
            disabledPlan={isActive ? currentUiPlan : null}
            disabledPlanHint={isActive ? "Текущий тариф недоступен в выборе. Новый тариф начнет действовать после окончания текущего периода." : null}
          />

          {error && (
            <div className="account-subscription-v2__error-box" role="alert">
              <p>{error}</p>
            </div>
          )}

          {/* Note: promoErrorLabel is now passed into components, but if we need a global error box we can keep it here or remove if redundant */}
          {paymentError && (
            <div className="account-subscription-v2__error-box" role="alert">
              <p>{paymentError}</p>
            </div>
          )}
        </div>
      )}

    </section>
  );
}
