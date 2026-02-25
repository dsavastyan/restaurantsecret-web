import { useSyncExternalStore } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { toast } from "@/lib/toast";

const openFavoritesPage = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("rs:navigate", { detail: { to: "/account/favorites" } }));
};

type FavoriteRestaurant = {
    restaurantSlug: string;
    addedAt: string;
};

type FavoriteRestaurantsState = {
    items: FavoriteRestaurant[];
    isLoading: boolean;
    error: string | null;
    // Map for O(1) lookups: restaurantSlug -> true
    lookup: Set<string>;

    load: (token: string) => Promise<void>;
    toggle: (token: string, restaurantSlug: string) => Promise<void>;
    isFavorite: (restaurantSlug: string) => boolean;
};

// Initial state
const initialSlice = {
    items: [],
    isLoading: false,
    error: null,
    lookup: new Set<string>(),
};

let state: FavoriteRestaurantsState = {
    ...initialSlice,
    load: async () => undefined,
    toggle: async () => undefined,
    isFavorite: () => false,
};

// Listeners for reactivity
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
};

const updateState = (partial: Partial<FavoriteRestaurantsState>) => {
    state = { ...state, ...partial };
    notify();
};

// Actions
const loadFavorites = async (token: string) => {
    if (!token) {
        updateState({ items: [], lookup: new Set() });
        return;
    }

    updateState({ isLoading: true, error: null });
    try {
        const res = await apiGet<{ ok: boolean; favorites: any[] }>("/api/favorites/restaurants", token);
        if (res?.ok && Array.isArray(res.favorites)) {
            const items: FavoriteRestaurant[] = res.favorites.map((f) => ({
                restaurantSlug: f.restaurant_slug,
                addedAt: f.added_at,
            }));

            const lookup = new Set(items.map((i) => i.restaurantSlug));
            updateState({ items, lookup, isLoading: false });
        } else {
            throw new Error("Invalid response");
        }
    } catch (err) {
        console.error("Failed to load favorite restaurants", err);
        updateState({ isLoading: false, error: "Не удалось загрузить избранные рестораны" });
    }
};

const toggleFavorite = async (token: string, restaurantSlug: string) => {
    if (!token) return;

    const isFav = state.lookup.has(restaurantSlug);

    // Optimistic update
    const nextLookup = new Set(state.lookup);
    let nextItems = [...state.items];

    if (isFav) {
        nextLookup.delete(restaurantSlug);
        nextItems = nextItems.filter((i) => i.restaurantSlug !== restaurantSlug);
    } else {
        nextLookup.add(restaurantSlug);
        nextItems.unshift({ restaurantSlug, addedAt: new Date().toISOString() });
    }

    updateState({ lookup: nextLookup, items: nextItems });

    try {
        if (isFav) {
            await apiDelete(`/api/favorites/restaurants/${restaurantSlug}`, token);
        } else {
            await apiPost("/api/favorites/restaurants", { restaurant_slug: restaurantSlug }, token);
            toast.success("Ресторан добавлен в избранное", {
                action: {
                    label: "Перейти в избранное",
                    onClick: openFavoritesPage,
                },
            });
        }
    } catch (err) {
        console.error("Failed to toggle favorite restaurant", err);
        toast.error("Не удалось обновить избранное");
        // Rollback (simplified: just reload from server)
        loadFavorites(token);
    }
};

const isFavorite = (restaurantSlug: string) => state.lookup.has(restaurantSlug);

// Bind actions
state.load = loadFavorites;
state.toggle = toggleFavorite;
state.isFavorite = isFavorite;

export const useFavoriteRestaurantsStore = <T>(selector: (state: FavoriteRestaurantsState) => T): T => {
    const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
    return selector(snapshot);
};
