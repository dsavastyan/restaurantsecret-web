import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFavoriteRestaurantsStore } from '@/store/favoriteRestaurants';
import { useAuth } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { useDishCardStore } from '@/store/dishCard';
import DishCard from '@/components/DishCard/DishCard';
import { apiGet } from '@/lib/requests';
import { api } from '@/api/client.js';
import { flattenMenuDishes } from '@/lib/nutrition';
import { useSubscriptionStore } from '@/store/subscription';
import { analytics } from '@/services/analytics';

type HydratedDish = {
    dish: any;
    restaurantSlug: string;
    restaurantName: string;
    addedAt: string;
};

export default function Favorites() {
    const token = useAuth((s) => s.accessToken);
    const { items, isLoading: isIdsLoading, load } = useFavoritesStore((s) => ({
        items: s.items,
        isLoading: s.isLoading,
        load: s.load,
    }));
    const fetchSubscriptionStatus = useSubscriptionStore((s) => s.fetchStatus);
    const openModal = useDishCardStore((s) => s.open);

    const [activeTab, setActiveTab] = useState<'dishes' | 'restaurants'>('dishes');

    const {
        items: favRestaurantItems,
        isLoading: isRestaurantIdsLoading,
        load: loadRestaurantFavs,
        toggle: toggleRestaurantFav,
        isFavorite: isRestaurantFavorite
    } = useFavoriteRestaurantsStore((s) => ({
        items: s.items,
        isLoading: s.isLoading,
        load: s.load,
        toggle: s.toggle,
        isFavorite: s.isFavorite
    }));

    const navigate = useNavigate();
    const location = useLocation();

    const [dishes, setDishes] = useState<HydratedDish[]>([]);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [isContentLoading, setIsContentLoading] = useState(false);
    const [isRestaurantsLoading, setIsRestaurantsLoading] = useState(false);

    // Refresh subscription status on mount (like Menu.jsx does) covers Bug 2
    useEffect(() => {
        if (token) {
            fetchSubscriptionStatus(token);
        }
    }, [token, fetchSubscriptionStatus]);

    // Load favorites list IDs on mount
    useEffect(() => {
        if (token) {
            load(token);
            loadRestaurantFavs(token);
        }
    }, [token, load, loadRestaurantFavs]);

    // Fetch actual restaurant data
    useEffect(() => {
        if (!favRestaurantItems.length) {
            setRestaurants([]);
            return;
        }

        let aborted = false;
        const fetchRestaurants = async () => {
            setIsRestaurantsLoading(true);
            try {
                // We fetch all restaurants and filter them by slug. 
                // Alternatively, we could fetch them one by one, but that's inefficient.
                // Since api.restaurants() should be cached by SWRLite/client, it might be okay.
                const res = await api.restaurants({ limit: 1000 });
                const allList = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);

                const favSlugs = new Set(favRestaurantItems.map(i => i.restaurantSlug));
                const filtered = allList.filter((r: any) => favSlugs.has(r.slug));

                // Reorder according to favRestaurantItems (most recent first)
                const ordered = favRestaurantItems
                    .map(item => filtered.find((r: any) => r.slug === item.restaurantSlug))
                    .filter(Boolean);

                if (!aborted) setRestaurants(ordered);
            } catch (err) {
                console.error("Failed to fetch favorite restaurants", err);
            } finally {
                if (!aborted) setIsRestaurantsLoading(false);
            }
        };

        fetchRestaurants();
        return () => { aborted = true; };
    }, [favRestaurantItems]);

    // Fetch actual dish data from menus
    useEffect(() => {
        if (!items.length) {
            setDishes([]);
            return;
        }

        let aborted = false;

        const fetchDetails = async () => {
            setIsContentLoading(true);
            // Group by restaurant to minimize requests
            const slugs = Array.from(new Set(items.map(i => i.restaurantSlug)));
            const menuCache = new Map();
            const results: HydratedDish[] = [];

            try {
                await Promise.all(slugs.map(async (slug) => {
                    try {
                        // Ideally we should have a caching layer or simple cache here
                        const menu = await apiGet(`/restaurants/${slug}/menu`);
                        menuCache.set(slug, menu);
                    } catch (e) {
                        console.error(`Failed to load menu for ${slug}`, e);
                        menuCache.set(slug, null);
                    }
                }));

                if (aborted) return;

                // Reconstruct the list in order (most recently added first)
                for (const item of items) {
                    const menu = menuCache.get(item.restaurantSlug);
                    if (!menu) continue;

                    // Flatten dishes to find by ID
                    // Note: flattenMenuDishes is a helper that returns array of dishes
                    const allDishes = flattenMenuDishes(menu);
                    const found = allDishes.find((d: any) => Number(d.id) === item.dishId);

                    if (found) {
                        results.push({
                            dish: found,
                            restaurantSlug: item.restaurantSlug,
                            restaurantName: menu.name || item.restaurantSlug,
                            addedAt: item.addedAt
                        });
                    }
                }

                setDishes(results);

            } catch (err) {
                console.error("Failed to hydrate favorites", err);
            } finally {
                if (!aborted) setIsContentLoading(false);
            }
        };

        fetchDetails();
        return () => { aborted = true; };
    }, [items]); // Re-run when favorites list changes

    if (!token) {
        return (
            <div className="account-empty">
                <p>Пожалуйста, войдите в аккаунт.</p>
            </div>
        );
    }

    const loading = isIdsLoading || isContentLoading || isRestaurantIdsLoading || isRestaurantsLoading;

    return (
        <div className="favorites-page">
            <div className="favorites-header">
                <h2 className="account-section-title">Избранное</h2>
                <div className="favorites-tabs-row">
                    <div className="segmented-control">
                        <button
                            className={`segmented-control__option ${activeTab === 'dishes' ? 'is-active' : ''}`}
                            onClick={() => setActiveTab('dishes')}
                        >
                            Блюда
                        </button>
                        <button
                            className={`segmented-control__option ${activeTab === 'restaurants' ? 'is-active' : ''}`}
                            onClick={() => setActiveTab('restaurants')}
                        >
                            Рестораны
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'dishes' && (
                <>
                    {loading && dishes.length === 0 && (
                        <div className="favorites-loading">
                            <p>Загружаем избранное...</p>
                        </div>
                    )}

                    {!loading && dishes.length === 0 && (
                        <div className="favorites-empty">
                            <p>У вас пока нет избранных блюд.</p>
                            <p className="muted">Отмечайте сердечком то, что вам понравилось.</p>
                        </div>
                    )}

                    {dishes.length > 0 && (
                        <div className="favorites-grid">
                            {dishes.map((item) => (
                                <DishCard
                                    key={`${item.restaurantSlug}-${item.dish.id}`}
                                    dish={item.dish}
                                    restaurantSlug={item.restaurantSlug}
                                    restaurantName={item.restaurantName}
                                    onClick={() => openModal({
                                        id: item.dish.id,
                                        dishName: item.dish.name,
                                        restaurantSlug: item.restaurantSlug,
                                        restaurantName: item.restaurantName
                                    })}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'restaurants' && (
                <>
                    {loading && restaurants.length === 0 && (
                        <div className="favorites-loading">
                            <p>Загружаем избранные рестораны...</p>
                        </div>
                    )}

                    {!loading && restaurants.length === 0 && (
                        <div className="favorites-empty">
                            <p>У вас пока нет избранных ресторанов.</p>
                            <p className="muted">Нажимайте сердечко на карточке ресторана, чтобы не потерять его.</p>
                        </div>
                    )}

                    {restaurants.length > 0 && (
                        <ul className="catalog-grid">
                            {restaurants.map((r, i) => (
                                <li key={`${r.slug || r.name}-${i}`} className="catalog-card">
                                    <div className="catalog-card__header">
                                        <div className="catalog-card__badge">{r?.name?.slice(0, 2).toUpperCase() || 'RS'}</div>
                                        <div className="catalog-card__title-block">
                                            <h3 className="catalog-card__title">{r.name}</h3>
                                            {r.cuisine && <div className="catalog-card__cuisine">{r.cuisine}</div>}
                                        </div>
                                        <button
                                            type="button"
                                            className="catalog-card__fav-btn is-active"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                analytics.track("favorite_remove", { type: "restaurant", slug: r.slug, name: r.name });
                                                toggleRestaurantFav(token, r.slug);
                                            }}
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                                                    fill="#E11D48" stroke="#E11D48" strokeWidth="2"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="catalog-card__actions">
                                        <button
                                            type="button"
                                            className="btn btn--primary"
                                            onClick={() => navigate(`/r/${r.slug}/menu`)}
                                        >
                                            Открыть меню
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
