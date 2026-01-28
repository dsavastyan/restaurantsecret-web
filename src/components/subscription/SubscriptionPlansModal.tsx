import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import "./SubscriptionPlansModal.css";

type SubscriptionPlansModalProps = {
  open: boolean;
  onClose?: () => void;
  onChoosePlan?: (plan: "month" | "year") => void;
  onApplyPromo?: (code: string) => void;
  loading?: boolean;
};

export default function SubscriptionPlansModal({
  open,
  onClose,
  onChoosePlan,
  onApplyPromo,
  loading = false,
}: SubscriptionPlansModalProps) {
  const [promo, setPromo] = useState("");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const canApply = useMemo(() => promo.trim().length > 0 && !loading, [promo, loading]);

  if (!open) return null;

  const stop = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <div className="rsModalOverlay" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="rsModal" onMouseDown={stop}>
        <button className="rsModalClose" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>

        <div className="rsModalHeader">
          <div className="rsModalTitle">Оформить подписку</div>
          <div className="rsModalSubtitle">
            Подписка открывает доступ к полной карточке блюд
          </div>
        </div>

        <div className="rsPlanGrid">
          <div className="rsPlanCard rsPlanMonth">
            <div className="rsPlanName">Месяц</div>
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
              <span className="rsPlanPriceSmall">в год</span>
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
        </div>
      </div>
    </div>
  );
}
