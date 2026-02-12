import { useState, useEffect } from "react";
import "./SubscriptionPlans.css";
import { PromoQuote } from "@/lib/api";

type SubscriptionPlansProps = {
    selectedPlan: "month" | "year" | null;
    onSelectPlan: (plan: "month" | "year") => void;
    onProceed: () => void; // Main CTA action
    onQuotePromo?: (code: string) => void;
    onRedeemPromo?: (code: string) => void;
    onResetPromo?: () => void;
    loading?: boolean;
    promoError?: string | null;
    promoQuote?: PromoQuote | null;
};

export default function SubscriptionPlans({
    selectedPlan,
    onSelectPlan,
    onProceed,
    onQuotePromo,
    onRedeemPromo,
    onResetPromo,
    loading = false,
    promoError,
    promoQuote,
}: SubscriptionPlansProps) {
    const [promo, setPromo] = useState("");
    const [isPromoOpen, setIsPromoOpen] = useState(false);

    useEffect(() => {
        if (promoQuote) {
            setIsPromoOpen(true);
        }
    }, [promoQuote]);

    // Determine if we are in a "Free Access (No Payment)" state (no card required)
    const isFreeAccessNoCard = promoQuote?.type === 'free_days' && !promoQuote.requires_subscribing;

    // Determine if we are in "Free Days + Subscription" state
    const isFreeDaysTrial = promoQuote?.type === 'free_days' && promoQuote.requires_subscribing;

    // Prices
    const baseMonthPrice = 99;
    const baseYearPrice = 999;

    // Plan availability/auto-selection logic
    useEffect(() => {
        if (promoQuote) {
            if (promoQuote.plan === 'annual') {
                onSelectPlan('year');
            } else if (promoQuote.plan === 'monthly') {
                onSelectPlan('month');
            } else if (promoQuote.type === 'free_days' && promoQuote.requires_subscribing) {
                // RS7FREE -> Auto year
                onSelectPlan('year');
            }
        }
    }, [promoQuote]);

    const isMonthDisabled = promoQuote?.plan === 'annual';
    const isYearDisabled = promoQuote?.plan === 'monthly' || (promoQuote?.type === 'discount_rub' && promoQuote?.amount > 0 && promoQuote?.plan === 'monthly');
    // Actually the requirement says for RS10PERCFREE (annual only) month is disabled. 
    // And for RS50PERCFREE/RS20RUB (monthly only) year is disabled.

    const getPrice = (type: 'month' | 'year', base: number) => {
        if (!promoQuote) return { old: null, new: base };
        // If free days trial, the price AFTER trial is the base price.
        if (isFreeDaysTrial) return { old: null, new: base, isTrial: true };

        if (promoQuote.type === 'discount_rub' && (promoQuote.plan === 'any' ||
            (promoQuote.plan === 'monthly' && type === 'month') ||
            (promoQuote.plan === 'annual' && type === 'year'))) {
            const val = Math.max(1, base - promoQuote.amount);
            return { old: base, new: val };
        }
        if (promoQuote.type === 'discount_pct' && (promoQuote.plan === 'any' ||
            (promoQuote.plan === 'monthly' && type === 'month') ||
            (promoQuote.plan === 'annual' && type === 'year'))) {
            const discount = (base * promoQuote.amount) / 100;
            const val = Math.max(1, base - discount);
            return { old: base, new: Math.round(val) };
        }
        return { old: null, new: base };
    };

    const monthPrice = getPrice('month', baseMonthPrice);
    const yearPrice = getPrice('year', baseYearPrice);

    const handleApply = () => {
        if (!promo.trim()) return;
        onQuotePromo?.(promo.trim());
    };

    // Derived CTA text
    const getCtaText = () => {
        if (isFreeAccessNoCard) return "Активировать доступ";
        if (loading) return "Загрузка...";
        if (!selectedPlan) return "Выберите тариф";

        if (isFreeDaysTrial && selectedPlan) {
            const priceObj = selectedPlan === 'month' ? monthPrice : yearPrice;
            const period = selectedPlan === 'month' ? 'в месяц' : 'в год';
            return `0\u00A0₽ сейчас, затем ${priceObj.new}\u00A0₽ ${period}`;
        }

        const priceObj = selectedPlan === 'month' ? monthPrice : yearPrice;
        const planName = selectedPlan === 'month' ? "месяц" : "год";

        return `Оформить ${planName} за ${priceObj.new}\u00A0₽`;
    };

    const renderPrice = (priceObj: any, period: string) => {
        if (isFreeDaysTrial && promoQuote?.amount) {
            return (
                <div className="rsPlanPriceTrial">
                    <span className="rsTrialBig">{promoQuote.amount} дней бесплатно</span>
                    <div className="rsTrialSmall">потом {priceObj.new} ₽ {period}</div>
                </div>
            );
        }

        return (
            <div className="rsPlanPrice">
                {priceObj.old && (
                    <span className="rsPlanPriceOld">{priceObj.old} ₽</span>
                )}
                <span className={`rsPlanPriceBig ${priceObj.old ? 'rsPlanPriceNew' : ''}`}>
                    {priceObj.new} ₽
                </span>
                <span className="rsPlanPriceSmall">{period}</span>
            </div>
        );
    };

    return (
        <div className="rsPlansContainer">
            {/* Plans Grid */}
            {!isFreeAccessNoCard && (
                <>
                    <div className="rsPlanGrid">
                        {/* Month Card */}
                        <div
                            className={`rsPlanCard rsPlanMonth ${selectedPlan === 'month' ? 'is-selected' : ''} ${isMonthDisabled ? 'is-disabled' : ''}`}
                            onClick={() => !isMonthDisabled && onSelectPlan('month')}
                        >
                            {isMonthDisabled && <div className="rsPlanUnavailableBadge">Недоступно с выбранным промокодом</div>}
                            <div style={{ flex: 1 }}>
                                <div className="rsPlanTopRow">
                                    <div className="rsPlanName">Месяц</div>
                                    <div className="rsPlanRadio" />
                                </div>
                                {renderPrice(monthPrice, "/мес*")}
                                <div className="rsPlanDesc">
                                    Подходит чтобы оценить удобство сервиса
                                </div>
                            </div>
                        </div>

                        {/* Year Card */}
                        <div
                            className={`rsPlanCard rsPlanYear ${selectedPlan === 'year' ? 'is-selected' : ''} ${isYearDisabled ? 'is-disabled' : ''}`}
                            onClick={() => !isYearDisabled && onSelectPlan('year')}
                        >
                            {isYearDisabled && <div className="rsPlanUnavailableBadge">Недоступно с выбранным промокодом</div>}
                            <div style={{ flex: 1 }}>
                                <div className="rsPlanTopRow">
                                    <div className="rsPlanName">Год</div>
                                    <div className="rsBadge">ВЫГОДНО</div>
                                    <div className="rsPlanRadio" />
                                </div>
                                {renderPrice(yearPrice, "/год*")}
                                <div className="rsPlanDesc">
                                    12 месяцев по цене 10. Лучший выбор
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rsFootnote">* Подписка продлевается автоматически</div>
                </>
            )}

            {/* Promo Section at Bottom (Collapsible) */}
            <div className={`rsPromoBox ${isPromoOpen ? "rsPromoBox--open" : ""}`} style={{ marginBottom: 20, marginTop: 10 }}>
                <div
                    className="rsPromoHeader"
                    onClick={() => setIsPromoOpen(!isPromoOpen)}
                >
                    <div className="rsPromoTitle">Есть промокод?</div>
                    <div className={`rsPromoChevron ${isPromoOpen ? "rsPromoChevron--open" : ""}`}>
                        ▼
                    </div>
                </div>

                {isPromoOpen && (
                    <div className="rsPromoBody">
                        {!promoQuote ? (
                            <div className="rsPromoRow">
                                <input
                                    className="rsPromoInput"
                                    placeholder="Введите промокод"
                                    value={promo}
                                    onChange={(e) => setPromo(e.target.value)}
                                    disabled={loading}
                                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                                />
                                <button
                                    className="rsPromoBtn"
                                    onClick={handleApply}
                                    disabled={!promo.trim() || loading}
                                >
                                    Применить
                                </button>
                            </div>
                        ) : (
                            <div className="rsPromoResult">
                                <div className="rsPromoBadge rsPromoBadge--green">
                                    {promoQuote.code || promo.toUpperCase()}
                                </div>
                                <div className="rsPromoDesc">
                                    {isFreeAccessNoCard && <div className="rsPromoSub">Без привязки карты</div>}
                                </div>

                                <div className="rsPromoActions">
                                    <button
                                        className="rsPromoCancel"
                                        onClick={() => {
                                            setPromo("");
                                            onResetPromo?.();
                                        }}
                                        disabled={loading}
                                    >
                                        Сбросить
                                    </button>
                                </div>
                            </div>
                        )}

                        {promoError && (
                            <div className="rsPromoError">
                                {promoError}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Main CTA */}
            <button
                className={`rsMainCta ${isFreeAccessNoCard ? 'rsMainCta--free' : ''}`}
                onClick={onProceed}
                disabled={loading || (!isFreeAccessNoCard && !selectedPlan)}
            >
                {getCtaText()}
            </button>
        </div>
    );
}
