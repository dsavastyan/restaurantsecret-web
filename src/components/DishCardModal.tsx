import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";

import { useDishCardStore } from "@/store/dishCard";
import { useAuth } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { postSuggest } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useFavoritesStore } from "@/store/favorites";
import { useDiaryStore } from "@/store/diary";
import { formatNumeric } from "@/lib/nutrition";

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
  const { isFavorite, toggleFavorite } = useFavoritesStore((state) => ({
    isFavorite: state.isFavorite(Number(data?.id)),
    toggleFavorite: state.toggle,
  }));
  const addDiaryEntry = useDiaryStore((s) => s.addEntry);

  const [isOutdatedOpen, setIsOutdatedOpen] = useState(false);
  const [reason, setReason] = useState<
    "wrong_kbju" | "missing_from_menu" | "other"
  >("wrong_kbju");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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

  const resetOutdatedForm = () => {
    setReason("wrong_kbju");
    setComment("");
    setFormError("");
  };

  const handleOutdatedSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data) return;

    if (reason === "other" && !comment.trim()) {
      setFormError("Добавьте комментарий");
      return;
    }

    setFormError("");
    setIsSubmitting(true);
    try {
      await postSuggest({
        kind: "dish_outdated",
        reason,
        name: data.restaurantName || "Ресторан",
        dish_name: data.name,
        comment: comment.trim() || undefined,
      });
      toast.success("Спасибо, мы проверим");
      setIsOutdatedOpen(false);
      resetOutdatedForm();
    } catch (err) {
      console.error("Failed to submit outdated dish", err);
      toast.error("Не удалось отправить сообщение. Попробуйте позже.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data) return;
    if (!accessToken) {
      navigate("/login");
      return;
    }
    await toggleFavorite(accessToken, Number(data.id), data.restaurantSlug);
  };

  const handleDiaryAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!data) return;
    if (!accessToken) {
      navigate("/login");
      return;
    }

    const safeNum = (val: any) => {
      const n = Number(val);
      return Number.isFinite(n) ? n : 0;
    };

    const dishId = Number(data.id);

    await addDiaryEntry(accessToken, {
      dish_id: Number.isFinite(dishId) ? dishId : undefined,
      restaurant_slug: data.restaurantSlug,
      name: data.name || "Блюдо",
      calories: safeNum(data.kcal),
      protein: safeNum(data.proteins_g),
      fat: safeNum(data.fats_g),
      carbs: safeNum(data.carbs_g),
      weight: safeNum(data.weight) || null
    });
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
              </div>
              <div className="dish-card__actions">
                <button
                  type="button"
                  className="dish-card__add-btn"
                  onClick={handleDiaryAdd}
                  title="Добавить в съеденное сегодня"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </button>
                <button
                  type="button"
                  className={`dish-card__fav-btn ${isFavorite ? "is-active" : ""}`}
                  onClick={handleFavoriteClick}
                  aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                      fill={isFavorite ? "#E11D48" : "none"}
                      stroke={isFavorite ? "#E11D48" : "currentColor"}
                      strokeWidth="2"
                    />
                  </svg>
                </button>
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

            {data.menuCapturedAtLabel && (
              <div className="dish-card__meta dish-card__meta--footer">
                <span>Меню добавлено: {data.menuCapturedAtLabel}</span>

                <button
                  type="button"
                  className="btn btn--ghost dish-card__outdated-btn"
                  onClick={() => setIsOutdatedOpen(true)}
                >
                  <span className="dish-card__outdated-icon" aria-hidden>⟳</span>
                  Меню устарело?
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isOutdatedOpen && (
        <div
          className="feedback-modal__backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Сообщить об устаревшем меню"
          onClick={(event) => {
            event.stopPropagation();
            setIsOutdatedOpen(false);
            resetOutdatedForm();
          }}
        >
          <div
            className="feedback-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="feedback-modal__header">
              <h4 className="feedback-modal__title">Меню устарело</h4>
              <button
                type="button"
                className="feedback-modal__close"
                aria-label="Закрыть"
                onClick={() => {
                  setIsOutdatedOpen(false);
                  resetOutdatedForm();
                }}
              >
                ×
              </button>
            </div>

            <form className="feedback-modal__form" onSubmit={handleOutdatedSubmit}>
              <fieldset className="feedback-modal__fieldset">
                <legend className="feedback-modal__legend">Причина</legend>
                <label className="feedback-modal__option">
                  <input
                    type="radio"
                    name="outdated-reason"
                    value="wrong_kbju"
                    checked={reason === "wrong_kbju"}
                    onChange={() => setReason("wrong_kbju")}
                  />
                  <span>Неверное КБЖУ</span>
                </label>
                <label className="feedback-modal__option">
                  <input
                    type="radio"
                    name="outdated-reason"
                    value="missing_from_menu"
                    checked={reason === "missing_from_menu"}
                    onChange={() => setReason("missing_from_menu")}
                  />
                  <span>Блюда нет в меню</span>
                </label>
                <label className="feedback-modal__option">
                  <input
                    type="radio"
                    name="outdated-reason"
                    value="other"
                    checked={reason === "other"}
                    onChange={() => setReason("other")}
                  />
                  <span>Другое</span>
                </label>
              </fieldset>

              {reason === "other" && (
                <label className="feedback-modal__field">
                  <span>Комментарий</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Опишите проблему"
                    rows={3}
                  />
                </label>
              )}

              {formError && (
                <p className="feedback-modal__error" role="status">
                  {formError}
                </p>
              )}

              <div className="feedback-modal__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setIsOutdatedOpen(false);
                    resetOutdatedForm();
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Отправляем…" : "Отправить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, root);
}
