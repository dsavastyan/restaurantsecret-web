import { useEffect } from "react";
import type { MouseEvent } from "react";
import SubscriptionPlans from "./SubscriptionPlans";
import "./SubscriptionPlansModal.css";

type SubscriptionPlansModalProps = {
  open: boolean;
  onClose?: () => void;
  onChoosePlan?: (plan: "month" | "year") => void;
  onApplyPromo?: (code: string) => void;
  loading?: boolean;
  promoError?: string | null;
};

export default function SubscriptionPlansModal({
  open,
  onClose,
  onChoosePlan,
  onApplyPromo,
  loading = false,
  promoError,
}: SubscriptionPlansModalProps) {
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

        <SubscriptionPlans
          onChoosePlan={onChoosePlan}
          onApplyPromo={onApplyPromo}
          loading={loading}
          promoError={promoError}
        />
      </div>
    </div>
  );
}
