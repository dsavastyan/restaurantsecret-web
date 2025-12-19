import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/store/auth';
import { useFavoritesStore } from '@/store/favorites';
import { useDishCardStore } from '@/store/dishCard';
import DishCard from '@/components/DishCard/DishCard';
import { apiGet } from '@/lib/requests';
import { flattenMenuDishes } from '@/lib/nutrition';

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
    const openModal = useDishCardStore((s) => s.open);

    const [dishes, setDishes] = useState<HydratedDish[]>([]);
    const [isContentLoading, setIsContentLoading] = useState(false);

    // Load favorites list IDs on mount
    useEffect(() => {
        if (token) load(token);
    }, [token, load]);

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

    const loading = isIdsLoading || isContentLoading;

    return (
        <div className="favorites-page">
            <div className="favorites-header">
                <h2 className="account-section-title">Избранное</h2>
                <p className="account-section-subtitle">Ваши любимые блюда</p>
            </div>

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
        </div>
    );
}
