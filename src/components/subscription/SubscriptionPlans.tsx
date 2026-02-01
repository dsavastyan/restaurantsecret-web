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

    const getPrice = (type: 'month' | 'year', base: number) => {
        if (!promoQuote) return { old: null, new: base };
        // If free days trial, the price AFTER trial is the base price.
        // We handle the display text specifically for this case.
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

        const priceObj = selectedPlan === 'month' ? monthPrice : yearPrice;
        const planName = selectedPlan === 'month' ? "месяц" : "год";

        return `Оформить ${planName} за ${priceObj.new}\u00A0₽`;
    };

    const renderPrice = (priceObj: any, period: string) => {
        if (isFreeDaysTrial && promoQuote?.amount) {
            // "7 дней бесплатно, потом 99 ₽ в месяц"
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
                            className={`rsPlanCard rsPlanMonth ${selectedPlan === 'month' ? 'is-selected' : ''}`}
                            onClick={() => onSelectPlan('month')}
                        >
                            <div style={{ flex: 1 }}>
                                <div className="rsPlanTopRow">
                                    <div className="rsPlanName">Месяц</div>
                                    <div className="rsPlanRadio" />
                                </div>
                                {renderPrice(monthPrice, "/мес")}
                                <div className="rsPlanDesc">
                                    Подходит чтобы оценить удобство сервиса
                                </div>
                            </div>
                        </div>

                        {/* Year Card */}
                        <div
                            className={`rsPlanCard rsPlanYear ${selectedPlan === 'year' ? 'is-selected' : ''}`}
                            onClick={() => onSelectPlan('year')}
                        >
                            <div style={{ flex: 1 }}>
                                <div className="rsPlanTopRow">
                                    <div className="rsPlanName">Год</div>
                                    <div className="rsBadge">ВЫГОДНО</div>
                                    <div className="rsPlanRadio" />
                                </div>
                                {renderPrice(yearPrice, "/год")}
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
                                    Промокод применён
                                </div>
                                <div className="rsPromoDesc">
                                    {promoQuote.description}
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
