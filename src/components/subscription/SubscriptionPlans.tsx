import { useMemo, useState } from "react";
import "./SubscriptionPlans.css";

type SubscriptionPlansProps = {
    onChoosePlan?: (plan: "month" | "year") => void;
    onApplyPromo?: (code: string) => void;
    loading?: boolean;
    promoError?: string | null;
};

export default function SubscriptionPlans({
    onChoosePlan,
    onApplyPromo,
    loading = false,
    promoError,
}: SubscriptionPlansProps) {
    const [promo, setPromo] = useState("");

    const canApply = useMemo(() => promo.trim().length > 0 && !loading, [promo, loading]);

    return (
        <div className="rsPlansContainer">
            <div className="rsPlanGrid">
                <div className="rsPlanCard rsPlanMonth">
                    <div className="rsPlanTopRow">
                        <div className="rsPlanName">Месяц</div>
                    </div>
                    <div className="rsPlanPrice">
                        <span className="rsPlanPriceBig">99 ₽</span>
                        <span className="rsPlanPriceSmall">в месяц*</span>
                    </div>
                    <div className="rsPlanDesc">
                        Подходит чтобы оценить <br /> удобство сервиса
                    </div>

                    <button
                        className="rsPlanGhostBtn"
                        onClick={() => onChoosePlan?.("month")}
                        disabled={loading}
                    >
                        <span className="rsIconSquare">▢</span>
                        Попробовать
                    </button>
                </div>

                <div className="rsPlanCard rsPlanYear">
                    <div className="rsPlanTopRow">
                        <div className="rsPlanName">Год</div>
                        <div className="rsBadge">ВЫГОДНО</div>
                    </div>

                    <div className="rsPlanPrice">
                        <span className="rsPlanPriceBig">999 ₽</span>
                        <span className="rsPlanPriceSmall">в год*</span>
                    </div>

                    <div className="rsPlanDesc">
                        12 месяцев по цене 10. Лучший <br />
                        выбор для тех, кто регулярно <br />
                        следует цели
                    </div>

                    <button
                        className="rsPlanPrimaryBtn"
                        onClick={() => onChoosePlan?.("year")}
                        disabled={loading}
                    >
                        Оформить
                    </button>
                </div>
            </div>

            <div className="rsFootnote">* Подписка продлевается автоматически</div>

            <div className="rsPromoBox">
                <div className="rsPromoTitle">Есть промокод?</div>

                <div className="rsPromoRow">
                    <input
                        className="rsPromoInput"
                        placeholder="Введите промокод"
                        value={promo}
                        onChange={(event) => setPromo(event.target.value)}
                        disabled={loading}
                    />
                    <button
                        className="rsPromoBtn"
                        onClick={() => onApplyPromo?.(promo.trim())}
                        disabled={!canApply}
                    >
                        Применить
                    </button>
                </div>

                {promoError && (
                    <div className="rsPromoError">
                        {promoError}
                    </div>
                )}
            </div>
        </div>
    );
}
