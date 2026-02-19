import { useSyncExternalStore } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { toast } from "@/lib/toast";

type FavoriteItem = {
    dishId: number;
    restaurantSlug: string;
    addedAt: string;
};

type FavoritesState = {
    items: FavoriteItem[];
    isLoading: boolean;
    error: string | null;
    // Map for O(1) lookups: dishId -> true
    lookup: Set<number>;

    load: (token: string) => Promise<void>;
    toggle: (token: string, dishId: number, restaurantSlug: string) => Promise<void>;
    isFavorite: (dishId: number) => boolean;
};

// Initial state
const initialSlice = {
    items: [],
    isLoading: false,
    error: null,
    lookup: new Set<number>(),
};

let state: FavoritesState = {
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

const updateState = (partial: Partial<FavoritesState>) => {
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
        const res = await apiGet<{ ok: boolean; favorites: any[] }>("/api/favorites", token);
        if (res?.ok && Array.isArray(res.favorites)) {
            const items: FavoriteItem[] = res.favorites.map((f) => ({
                dishId: Number(f.dish_id),
                restaurantSlug: f.restaurant_slug,
                addedAt: f.added_at,
            }));

            const lookup = new Set(items.map((i) => i.dishId));
            updateState({ items, lookup, isLoading: false });
        } else {
            throw new Error("Invalid response");
        }
    } catch (err) {
        console.error("Failed to load favorites", err);
        updateState({ isLoading: false, error: "Не удалось загрузить избранное" });
    }
};

const toggleFavorite = async (token: string, dishId: number, restaurantSlug: string) => {
    if (!token) return;

    const isFav = state.lookup.has(dishId);

    // Optimistic update
    const nextLookup = new Set(state.lookup);
    let nextItems = [...state.items];

    if (isFav) {
        nextLookup.delete(dishId);
        nextItems = nextItems.filter((i) => i.dishId !== dishId);
    } else {
        nextLookup.add(dishId);
        nextItems.unshift({ dishId, restaurantSlug, addedAt: new Date().toISOString() });
    }

    updateState({ lookup: nextLookup, items: nextItems });

    try {
        if (isFav) {
            await apiDelete(`/api/favorites/${dishId}`, token);
        } else {
            await apiPost("/api/favorites", { dish_id: dishId, restaurant_slug: restaurantSlug }, token);
            toast.success("Блюдо добавлено в избранное");
        }
    } catch (err) {
        console.error("Failed to toggle favorite", err);
        toast.error("Не удалось обновить избранное");
        // Rollback (simplified: just reload from server)
        loadFavorites(token);
    }
};

const isFavorite = (dishId: number) => state.lookup.has(dishId);

// Bind actions
state.load = loadFavorites;
state.toggle = toggleFavorite;
state.isFavorite = isFavorite;

export const useFavoritesStore = <T>(selector: (state: FavoritesState) => T): T => {
    const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
    return selector(snapshot);
};
