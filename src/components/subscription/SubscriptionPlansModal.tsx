import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import SubscriptionPlans from "./SubscriptionPlans";
import "./SubscriptionPlansModal.css";
import { PromoQuote } from "@/lib/api";
import { analytics } from "@/services/analytics";

type SubscriptionPlansModalProps = {
  open: boolean;
  onClose?: () => void;
  onChoosePlan?: (plan: "month" | "year") => void;
  onQuotePromo?: (code: string) => void;
  onRedeemPromo?: (code: string) => void;
  onResetPromo?: () => void;
  loading?: boolean;
  promoError?: string | null;
  promoQuote?: PromoQuote | null;
};

export default function SubscriptionPlansModal({
  open,
  onClose,
  onChoosePlan,
  onQuotePromo,
  onRedeemPromo,
  onResetPromo,
  loading = false,
  promoError,
  promoQuote,
}: SubscriptionPlansModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"month" | "year" | null>(null);

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

  // Reset selection when closed/opened?
  useEffect(() => {
    if (open) {
      analytics.track("subscription_page_view", { source_context: "modal" });
      setSelectedPlan(null);
    }
  }, [open]);

  if (!open) return null;

  const stop = (event: MouseEvent<HTMLDivElement>) => event.stopPropagation();

  return (
    <div className="rsModalOverlay" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="rsModal" onMouseDown={stop}>
        <div className="rsModalHeader">
          <div className="rsModalTitle">Оформить подписку</div>
          <div className="rsModalSubtitle">
            Подписка открывает доступ к полной карточке блюд
          </div>
          <button className="rsModalClose" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className="rsModalContent">
          <SubscriptionPlans
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onProceed={() => {
              if (selectedPlan) onChoosePlan?.(selectedPlan);
            }}
            onQuotePromo={onQuotePromo}
            onRedeemPromo={onRedeemPromo}
            onResetPromo={onResetPromo}
            loading={loading}
            promoError={promoError}
            promoQuote={promoQuote}
          />
        </div>
      </div>
    </div>
  );
}
