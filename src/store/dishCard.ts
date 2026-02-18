import { useSyncExternalStore } from "react";

import { apiGet } from "@/lib/requests";
import { flattenMenuDishes } from "@/lib/nutrition";
import { formatDescription } from "@/lib/text";
import { formatMenuCapturedAt } from "@/lib/dates";

type DishCardDraft = {
  id?: number;
  dishName: string;
  restaurantSlug: string;
  restaurantName?: string;
  isFreeAccess?: boolean;
};

type DishCardData = {
  id?: number | string;
  name: string;
  restaurantSlug: string;
  restaurantName?: string;
  isFreeAccess?: boolean;
  portionLabel: string;
  kcal?: number | null;
  proteins_g?: number | null;
  fats_g?: number | null;
  carbs_g?: number | null;
  composition_text?: string | null;
  allergensList: string[];
  weight?: number | null;
  menuCapturedAtLabel?: string;
};

type DishCardState = {
  isOpen: boolean;
  isLoading: boolean;
  error: string;
  data: DishCardData | null;
  open: (draft: DishCardDraft) => Promise<void>;
  close: () => void;
};

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const initialSlice = {
  isOpen: false,
  isLoading: false,
  error: "",
  data: null,
};

let state: DishCardState = {
  ...initialSlice,
  open: async () => undefined,
  close: () => undefined,
};

const updateState = (partial: Partial<DishCardState>) => {
  state = { ...state, ...partial };
  notify();
};

const parseNumeric = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value)
    .replace(/,/g, ".")
    .replace(/[^0-9.\-]/g, "")
    .trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const pickNumber = (dish: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = dish?.[key];
    const parsed = parseNumeric(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const normalizeAllergens = (dish: Record<string, unknown> | null) => {
  const candidates = [
    dish?.allergens,
    dish?.allergens_list,
    dish?.allergensList,
    dish?.allergy,
    dish?.allergies,
    dish?.allergy_list,
    dish?.undesired,
    dish?.undesirable,
    dish?.bad_products,
    (dish as any)?.warnings?.allergens,
  ];

  const result = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        if (item == null) return;
        const value = String(item).trim();
        if (value) result.add(value);
      });
      continue;
    }

    if (typeof candidate === "string") {
      candidate
        .split(/[;,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => result.add(item));
      continue;
    }

    if (typeof candidate === "object") {
      Object.values(candidate)
        .map((item) => String(item).trim())
        .filter(Boolean)
        .forEach((item) => result.add(item));
    }
  }

  return Array.from(result);
};

const sanitizePortionLabel = (label: string) => {
  const withoutPerPrefix = label
    .trim()
    .replace(/^per\s+/i, "")
    .replace(/^(portion|serving)\s*/i, "");

  return withoutPerPrefix.trim();
};

const buildPortionLabel = (dish: Record<string, unknown>) => {
  const explicitLabel =
    (dish?.portionLabel as string) ||
    (dish?.portion_label as string) ||
    (dish?.portion as string) ||
    (dish?.per as string);

  if (explicitLabel && explicitLabel.trim().length > 0) {
    const cleaned = sanitizePortionLabel(explicitLabel);
    if (cleaned) return cleaned;
  }

  const weight = pickNumber(dish, [
    "weight",
    "weight_g",
    "weightGrams",
    "portion_weight",
    "serving_weight",
    "grammage",
    "portion_size",
    "portionSize",
  ]);

  if (weight !== null) {
    return `${Math.round(weight)} г`;
  }

  return "1 порция";
};

const findDishInMenu = (
  menuDishes: Record<string, unknown>[],
  draft: DishCardDraft,
) => {
  const targetName = draft.dishName.trim().toLowerCase();

  return menuDishes.find((item) => {
    const idsToCompare = [item.id, (item as any).dish_id, (item as any).dishId];
    if (draft.id != null && idsToCompare.some((id) => id === draft.id)) {
      return true;
    }

    const namesToCompare = [
      item.name,
      (item as any).dishName,
      (item as any).canonical_name,
      (item as any).slug,
    ]
      .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : null))
      .filter(Boolean);

    return namesToCompare.some((name) => name === targetName);
  });
};

const resolveRestaurantName = (menu: Record<string, unknown>, draft: DishCardDraft) => {
  const restaurantFromMenu =
    (menu?.name as string) ||
    (menu as any)?.restaurant?.name ||
    (menu as any)?.info?.name;
  return draft.restaurantName || restaurantFromMenu || undefined;
};

const deriveCardData = (
  dish: Record<string, unknown>,
  draft: DishCardDraft,
  restaurantName?: string,
  capturedAt?: string | null,
): DishCardData => {
  const name =
    (dish?.name as string) ||
    (dish as any)?.dishName ||
    draft.dishName;

  const kcal = pickNumber(dish, ["kcal", "calories", "energy", "energy_kcal"]);
  const proteins = pickNumber(dish, ["protein", "proteins", "proteins_g", "protein_g"]);
  const fats = pickNumber(dish, ["fat", "fats", "fat_g", "fats_g"]);
  const carbs = pickNumber(dish, ["carb", "carbs", "carbohydrates", "carbs_g"]);

  const composition = formatDescription(
    (dish?.composition_text as string) ||
    (dish?.composition as string) ||
    (dish?.ingredients as string) ||
    (dish?.description as string),
    "",
  );

  return {
    id: (dish?.id as number | string) ?? draft.id,
    name,
    restaurantSlug: draft.restaurantSlug,
    restaurantName: restaurantName || draft.restaurantName,
    isFreeAccess: Boolean(draft.isFreeAccess),
    portionLabel: buildPortionLabel(dish),
    kcal,
    proteins_g: proteins,
    fats_g: fats,
    carbs_g: carbs,
    composition_text: composition,
    allergensList: normalizeAllergens(dish),
    weight: pickNumber(dish, ["weight", "weight_g", "weightGrams", "portion_weight", "serving_weight", "grammage", "portion_size", "portionSize"]),
    menuCapturedAtLabel: formatMenuCapturedAt(capturedAt),
  };
};

async function openDishCard(draft: DishCardDraft) {
  updateState({ ...initialSlice, isOpen: true, isLoading: true });
  try {
    const menu = await apiGet(`/restaurants/${draft.restaurantSlug}/menu`);
    const dishes = flattenMenuDishes(menu);
    const match = findDishInMenu(dishes, draft);

    if (!match) {
      throw new Error("Блюдо не найдено в меню ресторана");
    }

    const data = deriveCardData(
      match as Record<string, unknown>,
      draft,
      resolveRestaurantName(menu, draft),
      (menu as any)?.menuCapturedAt as string | null,
    );
    updateState({
      ...state,
      ...initialSlice,
      isOpen: true,
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Не удалось открыть карточку блюда";
    updateState({ ...initialSlice, isOpen: true, isLoading: false, error: message });
  }
}

function closeDishCard() {
  updateState({ ...initialSlice });
}

state = { ...state, open: openDishCard, close: closeDishCard } as DishCardState;

export const useDishCardStore = <T,>(selector: (state: DishCardState) => T): T => {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);
  return selector(snapshot);
};

export type { DishCardData, DishCardDraft };
