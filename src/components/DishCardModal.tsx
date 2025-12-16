import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";

import { useDishCardStore } from "@/store/dishCard";
import { useAuth } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";

const root = typeof document !== "undefined" ? document.body : null;

const macroLabel = {
  kcal: "ккал",
  proteins_g: "Белки",
  fats_g: "Жиры",
  carbs_g: "Углеводы",
};

type MacroKey = keyof typeof macroLabel;

function MacroCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: number | null;
  highlight?: boolean;
}) {
  const display = Number.isFinite(value) ? Math.round(value!) : "—";
  return (
    <div className={`dish-card__macro${highlight ? " is-accent" : ""}`}>
      <div className="dish-card__macro-value">{display}</div>
      <div className="dish-card__macro-label">{label}</div>
    </div>
  );
}

export default function DishCardModal() {
  const navigate = useNavigate();
  const { isOpen, isLoading, data, error, close } = useDishCardStore((s) => ({
    isOpen: s.isOpen,
    isLoading: s.isLoading,
    data: s.data,
    error: s.error,
    close: s.close,
  }));
  const accessToken = useAuth((state) => state.accessToken);
  const { hasActiveSub, fetchStatus } = useSubscriptionStore((state) => ({
    hasActiveSub: state.hasActiveSub,
    fetchStatus: state.fetchStatus,
  }));

  useEffect(() => {
    if (!isOpen || !root) return undefined;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus(accessToken);
  }, [accessToken, fetchStatus, isOpen]);

  const handleSubscribeClick = () => {
    if (accessToken) {
      navigate("/account/subscription");
      return;
    }
    navigate("/login", { state: { from: "/account/subscription" } });
  };

  const anchorId = useMemo(() => {
    if (!data) return "";
    if (data.id) return `dish-${data.id}`;
    return `dish-${data.name.replace(/\s+/g, "-").toLowerCase()}`;
  }, [data]);

  if (!isOpen || !root) return null;

  const content = (
    <div
      className="dish-card-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dish-card-title"
      onClick={close}
    >
      <div className="dish-card" onClick={(event) => event.stopPropagation()}>
        <button className="dish-card__close" type="button" aria-label="Закрыть" onClick={close}>
          ×
        </button>

        {isLoading && (
          <div className="dish-card__loading">
            <div className="dish-card__spinner" aria-hidden />
            <p>Загружаем карточку блюда…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="dish-card__error">
            <p>{error}</p>
            <button type="button" className="btn btn--primary" onClick={close}>
              Закрыть
            </button>
          </div>
        )}

        {!isLoading && data && (
          <div className="dish-card__body">
            <div className="dish-card__header">
              <div>
                <div className="dish-card__eyebrow">Карточка блюда</div>
                <h3 id="dish-card-title" className="dish-card__title">
                  {data.name}
                </h3>
                <Link
                  to={`/restaurants/${data.restaurantSlug}/menu#${anchorId}`}
                  className="dish-card__restaurant"
                >
                  {data.restaurantName || "Ресторан"}
                </Link>
                {data.menuCapturedAtLabel && (
                  <div className="dish-card__meta">Меню добавлено: {data.menuCapturedAtLabel}</div>
                )}
              </div>
            </div>

            {hasActiveSub ? (
              <>
                <section className="dish-card__section">
                  <div className="dish-card__section-title">КБЖУ на порцию</div>
                  <div className="dish-card__macro-grid">
                    {(Object.keys(macroLabel) as MacroKey[]).map((key) => (
                      <MacroCell
                        key={key}
                        label={macroLabel[key]}
                        value={(data as any)[key] as number | null}
                        highlight={key === "kcal"}
                      />
                    ))}
                  </div>
                </section>

                {data.composition_text && (
                  <section className="dish-card__section">
                    <div className="dish-card__section-title">Состав</div>
                    <p className="dish-card__text">{data.composition_text}</p>
                  </section>
                )}

                <section className="dish-card__section">
                  <div className="dish-card__section-title">Аллергены и нежелательные продукты</div>
                  {data.allergensList.length ? (
                    <div className="dish-card__allergens">
                      <div className="dish-card__warning">⚠️ Проверьте состав: в блюде отмечены потенциальные аллергены.</div>
                      <div className="dish-card__chips">
                        {data.allergensList.map((item) => (
                          <span key={item} className="dish-card__chip">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="dish-card__text dish-card__text--muted">
                      Аллергенов в карточке блюда не указано.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <section className="dish-card__section">
                <div className="dish-card__section-title">Информация о блюде</div>
                <p className="dish-card__text">
                  Эта информация доступна только по подписке.
                </p>
                <button type="button" className="btn btn--primary" onClick={handleSubscribeClick}>
                  Оформить подписку
                </button>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, root);
}
