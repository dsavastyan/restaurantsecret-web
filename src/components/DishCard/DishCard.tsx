import { useMemo } from 'react';
import { formatNumeric } from '@/lib/nutrition';
import { formatDescription } from '@/lib/text';
import { useAuth } from '@/store/auth';
import { useSubscriptionStore } from '@/store/subscription';
import { useFavoritesStore } from '@/store/favorites';
import { useDiaryStore } from '@/store/diary';
import { useNavigate, useLocation } from 'react-router-dom';
import { analytics } from '@/services/analytics';

type DishCardProps = {
    dish: any;
    restaurantSlug: string;
    restaurantName?: string;
    // If true, clicking on the card opens the modal (default behavior)
    interactive?: boolean;
    // Custom click handler if needed
    onClick?: () => void;
};

export default function DishCard({ dish, restaurantSlug, restaurantName, interactive = true, onClick }: DishCardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const accessToken = useAuth((state) => state.accessToken);
    const { hasActiveSub } = useSubscriptionStore((state) => ({
        hasActiveSub: state.hasActiveSub,
    }));
    const { isFavorite, toggle } = useFavoritesStore((state) => ({
        isFavorite: state.isFavorite(Number(dish.id)),
        toggle: state.toggle,
    }));

    const favorited = isFavorite;

    const handleFavoriteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!accessToken) {
            navigate('/login', { state: { from: location.pathname + location.search } });
            return;
        }
        if (!favorited) {
            analytics.track("favorite_add", { type: "dish", dish_id: dish.id, name: dish.name });
        } else {
            analytics.track("favorite_remove", { type: "dish", dish_id: dish.id, name: dish.name });
        }
        await toggle(accessToken, Number(dish.id), restaurantSlug);
    };

    const addDiaryEntry = useDiaryStore(s => s.addEntry);

    const handleDiaryAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!accessToken) {
            navigate('/login', { state: { from: location.pathname + location.search } });
            return;
        }

        if (!hasActiveSub) {
            navigate('/account/subscription', { state: { from: location.pathname + location.search } });
            return;
        }

        const safeNum = (val: any) => {
            const n = Number(val);
            return Number.isFinite(n) ? n : 0;
        };

        const dishId = Number(dish.id);

        await addDiaryEntry(accessToken, {
            dish_id: Number.isFinite(dishId) ? dishId : undefined,
            restaurant_slug: restaurantSlug,
            name: dish.name || 'Блюдо',
            calories: safeNum(dish.kcal),
            protein: safeNum(dish.protein),
            fat: safeNum(dish.fat),
            carbs: safeNum(dish.carbs),
            weight: safeNum(dish.weight) || undefined
        });
    };

    const handleSubscribe = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (accessToken) {
            navigate('/account/subscription', { state: { from: location.pathname + location.search } });
            return;
        }
        navigate('/login', { state: { from: '/account/subscription' } });
    };

    return (
        <div className="menu-card" onClick={onClick}>
            <div className="menu-card__top">
                <div className="menu-card__title-row">
                    <h3 className="menu-card__title">{dish.name}</h3>
                    <div className="menu-card__actions">
                        {Number.isFinite(dish.price) && <div className="menu-card__price">{Math.round(dish.price)} ₽</div>}
                        <button
                            type="button"
                            className="menu-card__add-btn"
                            onClick={handleDiaryAdd}
                            title="Добавить в съеденное сегодня"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                        </button>
                        <button
                            type="button"
                            className={`menu-card__fav-btn ${favorited ? 'is-active' : ''}`}
                            onClick={handleFavoriteClick}
                            aria-label={favorited ? "Удалить из избранного" : "Добавить в избранное"}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                                    fill={favorited ? "#E11D48" : "none"}
                                    stroke={favorited ? "#E11D48" : "currentColor"}
                                    strokeWidth="2"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
                {restaurantName && <div className="menu-card__restaurant">{restaurantName}</div>}

                {hasActiveSub ? (
                    <>
                        <div className="menu-card__tags">
                            <span className="menu-tag">{formatNumeric(dish.kcal)} ккал</span>
                            <span className="menu-tag">Б {formatNumeric(dish.protein)}</span>
                            <span className="menu-tag">Ж {formatNumeric(dish.fat)}</span>
                            <span className="menu-tag">У {formatNumeric(dish.carbs)}</span>
                            {Number.isFinite(dish.weight) && <span className="menu-tag">{formatNumeric(dish.weight)} г</span>}
                        </div>
                        <p className="menu-card__description">
                            {formatDescription(dish.ingredients ?? dish.description) || ''}
                        </p>
                    </>
                ) : (
                    <div className="menu-paywall">
                        <p className="menu-paywall__text">Эта информация доступна только по подписке.</p>
                        <button type="button" className="subscribe-btn" onClick={handleSubscribe}>
                            Оформить подписку
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
