import { useState } from "react";
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
    const [isPromoOpen, setIsPromoOpen] = useState(true); // Default open to make it visible? Or closed? User said "Field always available".

    // Determine if we are in a "Free Access (No Payment)" state
    const isFreeAccess = promoQuote?.type === 'free_days' && !promoQuote.requires_subscribing;

    // Prices
    const baseMonthPrice = 99;
    const baseYearPrice = 999;

    const getPrice = (type: 'month' | 'year', base: number) => {
        if (!promoQuote) return { old: null, new: base };
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
        if (isFreeAccess) return "Активировать доступ";
        if (loading) return "Загрузка...";
        if (!selectedPlan) return "Выберите тариф";

        const price = selectedPlan === 'month' ? monthPrice.new : yearPrice.new;
        const planName = selectedPlan === 'month' ? "месяц" : "год";

        // Use non-breaking space
        return `Оформить ${planName} за ${price}\u00A0₽`;
    };

    return (
        <div className="rsPlansContainer">
            {/* Promo Section at Top */}
            <div className={`rsPromoBox rsPromoBox--open`} style={{ marginBottom: 24 }}>
                <div className="rsPromoBody" style={{ paddingTop: 16 }}>
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
                                {isFreeAccess && <div className="rsPromoSub">Без привязки карты</div>}
                            </div>

                            <div className="rsPromoActions">
                                {/* If free access, we might show Activate button here OR at bottom. 
                                   User guidelines say: CTA "Activate access" 
                                   Let's put secondary action here to reset. */}
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
            </div>

            {/* Plans Grid - Hide if Free Access (no payment needed) ?? 
                User said: "Green badge... CTA Activate". 
                If it is really free without subscription, plans are confusing. 
                Let's hide them or show specific message.
            */}
            {!isFreeAccess && (
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
                                <div className="rsPlanPrice">
                                    {monthPrice.old && (
                                        <span className="rsPlanPriceOld">{monthPrice.old} ₽</span>
                                    )}
                                    <span className={`rsPlanPriceBig ${monthPrice.old ? 'rsPlanPriceNew' : ''}`}>
                                        {monthPrice.new} ₽
                                    </span>
                                    <span className="rsPlanPriceSmall">/мес</span>
                                </div>
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
                                <div className="rsPlanPrice">
                                    {yearPrice.old && (
                                        <span className="rsPlanPriceOld">{yearPrice.old} ₽</span>
                                    )}
                                    <span className={`rsPlanPriceBig ${yearPrice.old ? 'rsPlanPriceNew' : ''}`}>
                                        {yearPrice.new} ₽
                                    </span>
                                    <span className="rsPlanPriceSmall">/год</span>
                                </div>
                                <div className="rsPlanDesc">
                                    12 месяцев по цене 10. Лучший выбор
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rsFootnote">* Подписка продлевается автоматически</div>
                </>
            )}

            {/* Main CTA */}
            <button
                className={`rsMainCta ${isFreeAccess ? 'rsMainCta--free' : ''}`}
                onClick={onProceed}
                disabled={loading || (!isFreeAccess && !selectedPlan)}
            >
                {getCtaText()}
            </button>
        </div>
    );
}
