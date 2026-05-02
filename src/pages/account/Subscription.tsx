import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ApiError, apiGet, apiPost, quotePromo, redeemPromo, isUnauthorizedError, PromoQuote, attachPaymentMethod } from "@/lib/api";
import { useAuth } from "@/store/auth";
import {
  selectHasActiveSub,
  selectSetHasSubscriptionHistory,
  selectSetHasActiveSub,
  useSubscriptionStore,
} from "@/store/subscription";
import SubscriptionPlansModal from "@/components/subscription/SubscriptionPlansModal";
import SubscriptionPlans from "@/components/subscription/SubscriptionPlans";
import { analytics } from "@/services/analytics";

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
  monthly: "199 РУБ / МЕСЯЦ",
  annual: "1 490 РУБ / ГОД",
  mock: "ПРОБНЫЙ ПЕРИОД",
};

const INTRO_TRIAL_PROMO_CODE = "RS7FREE";

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
  const setHasSubscriptionHistory = useSubscriptionStore(selectSetHasSubscriptionHistory);
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
  const [canceling, setCanceling] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) {
      setStatusData(null);
      setLoading(false);
      if (hasActiveSub) {
        setHasActiveSub(false);
      }
      setHasSubscriptionHistory(false);
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
      setHasSubscriptionHistory(Boolean(normalized.status && normalized.status !== "none"));
    } catch (err) {
      if (isUnauthorizedError(err)) {
        logout();
        setStatusData(null);
        setError(null);
        setHasActiveSub(false);
        setHasSubscriptionHistory(false);
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setStatusData({ status: "none", status_label: null, expires_at: null });
        setError(null);
        setHasActiveSub(false);
        setHasSubscriptionHistory(false);
        return;
      }
      console.error("Failed to load subscription status", err);
      setError("Не удалось загрузить статус подписки. Попробуйте позже.");
      setHasActiveSub(false);
      setHasSubscriptionHistory(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, hasActiveSub, logout, setHasActiveSub, setHasSubscriptionHistory]);

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
  const isCancellationScheduled = Boolean(statusData?.canceled_at);
  const expiresLabel = useMemo(() => formatDate(statusData?.expires_at), [statusData?.expires_at, formatDate]);
  const currentPlanKey = typeof statusData?.plan === "string" ? statusData.plan.trim().toLowerCase() : "";
  const currentUiPlan: UiPlan | null = currentPlanKey === "monthly" ? "month" : currentPlanKey === "annual" ? "year" : null;
  const planTitle = PLAN_LABELS[currentPlanKey] || "Тариф";
  const planPriceBadge = PLAN_PRICE_BADGES[currentPlanKey] || "ТЕКУЩИЙ ТАРИФ";
  const expiredTitle = "Подписка истекла";
  const expiredDescription = `Ваша подписка на ${planTitle} закончилась ${expiresLabel ?? ""}`.trim();
  const isAnnualPlan = currentPlanKey === "annual";
  const activePlanTitle = currentPlanKey === "annual" ? "Год" : currentPlanKey === "monthly" ? "Месяц" : planTitle;
  const activePlanPrice = currentPlanKey === "annual" ? "1 490 ₽" : currentPlanKey === "monthly" ? "199 ₽" : planPriceBadge;
  const activePlanPeriod = currentPlanKey === "annual" ? "/год" : currentPlanKey === "monthly" ? "/мес" : "";
  const activeRenewalLabel = isCancellationScheduled ? "Автопродление отключено" : "Автопродление включено";
  const activeBillingLabel = isCancellationScheduled
    ? `Подписка действует до: ${expiresLabel ?? "—"}`
    : statusData?.next_charge_at
      ? `Следующее списание: ${formatDate(statusData.next_charge_at) ?? "—"}`
      : statusData?.is_trial
        ? `Окончание пробного периода: ${expiresLabel ?? "—"}`
        : `Следующее списание: ${expiresLabel ?? "—"}`;

  const showHistory = (isActive || isCanceled || isExpired) && !loading;
  const isNeverSubscribed = status === "none" && !showHistory;

  const pageTitle = isNeverSubscribed ? "Оформить подписку" : isActive ? "Моя подписка" : "Управление подпиской";

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
      try { ym(108992733, 'reachGoal', 'checkout_started'); } catch { /* ym not loaded */ }

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
          // Persist plan so PaySuccess / PaymentResult can read it after redirect.
          try { sessionStorage.setItem("rs_checkout_plan", plan); } catch { /* ignore */ }
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
    analytics.track("plan_selected", { plan });
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
        createPayment(selectedPlan, promoQuote?.code || (isNeverSubscribed ? INTRO_TRIAL_PROMO_CODE : undefined));
      }
    }
  }, [selectedPlan, createPayment, promoQuote, handleRedeemPromo, isNeverSubscribed]);

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

  const handleCancel = useCallback(async () => {
    if (!accessToken || canceling) return;
    if (!window.confirm("Вы уверены что хотите отменить подписку?")) {
      return;
    }

    setCanceling(true);
    try {
      const res = await apiPost<{ ok: boolean; error?: string }>("/api/subscriptions/cancel", {}, accessToken);
      if (res?.ok) {
        analytics.track("subscription_canceled", { plan: statusData?.plan || "unknown" }, { ignoreConsent: true });
        await fetchStatus();
      } else {
        alert(res?.error || "Не удалось отменить подписку");
      }
    } catch (err) {
      console.error("Cancel sub error", err);
      alert("Ошибка при отмене подписки");
    } finally {
      setCanceling(false);
    }
  }, [accessToken, canceling, fetchStatus, statusData?.plan]);

  return (
    <section className={`account-panel-v2 account-subscription-panel${isActive ? " is-active-subscription" : ""}`} aria-labelledby="account-subscription-heading">
      <header className="account-panel-v2__header">
        <h2 id="account-subscription-heading" className="account-panel-v2__title">
          {pageTitle}
        </h2>
        {isNeverSubscribed && (
          <p className="account-panel-v2__subtitle">Выберите подходящий тариф</p>
        )}
        {isActive && (
          <p className="account-panel-v2__subtitle">Управляйте тарифом и следите за продлением</p>
        )}
      </header>

      {loading && <SubscriptionSkeleton />}

      {!loading && (
        <div className="account-subscription-v2">
          {(isActive || isExpired || isCanceled) && (
            <div className={`account-subscription-v2__card ${isActive ? 'is-active' : 'is-expired'}`}>
              <div className="account-subscription-v2__mobile-surface">
                {isActive ? (
                  <>
                    <div className="account-subscription-v2__active-card">
                      <div className="account-subscription-v2__active-content">
                        <div className="account-subscription-v2__active-badges">
                          <span className="account-subscription-v2__status-pill">
                            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.7a1 1 0 0 0-1.4-1.4L9 10.2 7.7 8.9a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z" clipRule="evenodd" />
                            </svg>
                            Активна
                          </span>
                          <span className="account-subscription-v2__current-pill">Текущий план</span>
                        </div>

                        <h3 className="account-subscription-v2__active-title">{activePlanTitle}</h3>
                        <p className="account-subscription-v2__active-price">
                          <span>{activePlanPrice}</span>
                          {activePlanPeriod && <small>{activePlanPeriod}</small>}
                        </p>

                        <div className="account-subscription-v2__active-meta">
                          <p>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                              <path d="M17 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M3 11V9a3 3 0 0 1 3-3h15" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M7 22l-4-4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M21 13v2a3 3 0 0 1-3 3H3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {activeRenewalLabel}
                          </p>
                          <p>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                              <path d="M7 3v4M17 3v4M4 9h16" strokeLinecap="round" strokeLinejoin="round" />
                              <rect x="4" y="5" width="16" height="16" rx="3" />
                            </svg>
                            {activeBillingLabel}
                          </p>
                        </div>

                        <p className="account-subscription-v2__active-note">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 10v6M12 7.5h.01" strokeLinecap="round" />
                          </svg>
                          Тариф можно изменить или отменить в любой момент.
                        </p>

                        <div className="account-subscription-v2__active-actions">
                          <button
                            className="account-subscription-v2__btn-renew"
                            onClick={() => setPlansOpen(true)}
                            disabled={Boolean(paymentPlan)}
                          >
                            Изменить тариф
                          </button>

                          {statusData?.can_cancel && (
                            <button
                              className="account-subscription-v2__btn-cancel-inline"
                              type="button"
                              onClick={handleCancel}
                              disabled={canceling}
                            >
                              {canceling ? "Отмена..." : "Отменить подписку"}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="account-subscription-v2__active-visual" aria-hidden="true">
                        <svg className="account-subscription-v2__active-ornament" viewBox="0 0 180 180" fill="none">
                          <circle cx="91" cy="91" r="70" fill="#F3F0E5" />
                          <circle cx="91" cy="91" r="48" fill="#E7EEDB" />
                          <path d="M54 93c13-24 50-38 79-19-4 34-34 56-70 46-11-3-15-15-9-27Z" fill="#7A9349" />
                          <path d="M68 96c15 6 35 6 58-13" stroke="#F9F7EF" strokeWidth="7" strokeLinecap="round" />
                          <circle cx="96" cy="93" r="28" fill="#FBFCF5" stroke="#C9D4B4" strokeWidth="5" />
                          <path d="m84 93 9 9 18-21" stroke="#6F873D" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M65 45v16M57 53h16M135 116v14M128 123h14" stroke="#D7A23B" strokeWidth="5" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>

                    <div className="account-subscription-v2__subscriber-notes" aria-label="Информация для подписчика">
                      <div className="account-subscription-v2__subscriber-note account-subscription-v2__subscriber-note--olive">
                        <span className="account-subscription-v2__subscriber-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                            <path d="M20.8 4.6c-1.6-1.5-4.1-1.4-5.6.2L12 8.1 8.8 4.8C7.3 3.2 4.8 3.1 3.2 4.6 1.5 6.2 1.4 8.9 3 10.6L12 20l9-9.4c1.6-1.7 1.5-4.4-.2-6Z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <p>
                          Рады, что ты теперь с нами! Подписывайся на наш{" "}
                          <a href="https://t.me/restaurantsecret" target="_blank" rel="noreferrer">
                            телеграм канал
                          </a>{" "}
                          для всех новостей, акций и предложений
                        </p>
                      </div>

                      <div className="account-subscription-v2__subscriber-note account-subscription-v2__subscriber-note--gold">
                        <span className="account-subscription-v2__subscriber-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                            <path d="M12 3.5a6 6 0 0 0-3.4 11c.6.4.9 1 .9 1.7V17h5v-.8c0-.7.4-1.3.9-1.7A6 6 0 0 0 12 3.5Z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9.5 20h5M10 17h4" strokeLinecap="round" />
                          </svg>
                        </span>
                        <p>
                          Будем благодарны за{" "}
                          <a href="https://restaurantsecret.ru/feedback" target="_blank" rel="noreferrer">
                            отзыв, идеи и рекомендации
                          </a>.
                        </p>
                      </div>
                    </div>

                    {!isAnnualPlan && (
                      <button
                        className="account-subscription-v2__saving-card"
                        type="button"
                        onClick={() => setPlansOpen(true)}
                        disabled={Boolean(paymentPlan)}
                      >
                        <span className="account-subscription-v2__saving-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                            <path d="M20 12v8H4v-8M22 7H2v5h20V7ZM12 22V7" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 7H7.5A2.5 2.5 0 1 1 12 4.5V7Zm0 0h4.5A2.5 2.5 0 1 0 12 4.5V7Z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span className="account-subscription-v2__saving-copy">
                          <strong>Хочешь сэкономить?</strong>
                          <span>Перейди на годовой тариф — <b>1 490 ₽/год</b></span>
                        </span>
                        <span className="account-subscription-v2__saving-link">
                          Посмотреть варианты
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                            <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </button>
                    )}
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
                        Возобновить подписку
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

                {showHistory && !isActive && (
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
                showTrialPricing
                trialDays={7}
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
