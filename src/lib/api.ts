// src/lib/api.ts
import { API_BASE } from "@/config/api";
import { setToken } from "@/store/auth";

const PUBLIC_API_BASE =
  import.meta.env.VITE_PUBLIC_API_BASE || "https://api.restaurantsecret.ru/cf";
const normalizedPublicApiBase = PUBLIC_API_BASE.replace(/\/+$/, "");
const publicApiBase = normalizedPublicApiBase.endsWith("/cf")
  ? normalizedPublicApiBase
  : `${normalizedPublicApiBase}/cf`;

export type SearchSuggestionRestaurant = {
  id: number;
  slug: string;
  name: string;
  city?: string | null;
};

export type SearchSuggestionDish = {
  id: number;
  dishName: string;
  restaurantName: string;
  restaurantSlug: string;
};

export type SearchSuggestions = {
  restaurants: SearchSuggestionRestaurant[];
  dishes: SearchSuggestionDish[];
};

export type Restaurant = {
  id: number;
  slug: string;
  name: string;
  cuisine: string;
  dishesCount: number;
};

export type SearchRestaurant = {
  id: number;
  slug: string;
  name: string;
  city?: string | null;
};

export type SearchDish = {
  id: number;
  dishName: string;
  restaurantName: string;
  restaurantSlug: string;
};

export type SearchResult = {
  restaurants: SearchRestaurant[];
  dishes: SearchDish[];
};

export type SuggestRequest = {
  name: string;
  dish_name?: string | null;
  city?: string | null;
  email?: string | null;
};

export class ApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

const parseBody = async (response: Response) => {
  try {
    return await response.clone().json();
  } catch {
    try {
      const text = await response.text();
      return text.length ? text : null;
    } catch {
      return null;
    }
  }
};

const toApiError = async (response: Response) => {
  const payload = await parseBody(response);
  const message =
    typeof payload === "string" && payload
      ? payload
      : `Request failed with status ${response.status}`;
  throw new ApiError(message, response.status, payload);
};

async function doFetch(path: string, init: RequestInit = {}, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include", // важно для refresh
  });
  return res;
}

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${publicApiBase}${path}`, {
    method: "GET",
    credentials: "omit",
  });
  if (!res.ok) {
    throw new Error(`Public API error ${res.status}`);
  }
  return res.json();
}

export const isUnauthorizedError = (error: unknown): error is ApiError => {
  return error instanceof ApiError && error.status === 401;
};

export function apiPostAuth(path: string, body?: unknown, token?: string) {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function tryRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (data?.ok && data.access_token) {
      // сохранить новый токен
      try {
        setToken(data.access_token);
      } catch { }
      return data.access_token as string;
    }
    return null;
  } catch {
    return null;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    await toApiError(response);
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null as T;
  }
}

export async function apiGet<T = unknown>(path: string, token?: string): Promise<T> {
  // 1-й заход
  let res = await doFetch(path, { method: "GET" }, token);
  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(path, { method: "GET" }, newToken); // ретрай 1 раз
    }
  }

  return handleResponse<T>(res);
}

export async function apiPost<T = unknown>(path: string, body?: unknown, token?: string): Promise<T> {
  // 1-й заход
  let res = await doFetch(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    },
    token
  );
  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(
        path,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
        newToken
      ); // ретрай 1 раз
    }
  }

  return handleResponse<T>(res);
}

export async function apiDelete<T = unknown>(path: string, token?: string): Promise<T> {
  // 1-й заход
  let res = await doFetch(path, { method: "DELETE" }, token);
  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(path, { method: "DELETE" }, newToken); // ретрай 1 раз
    }
  }

  return handleResponse<T>(res);
}

export async function applyPromo(code: string, token: string) {
  return apiPost<{ ok: boolean; expires_at?: string; free_days?: number; error?: string }>(
    "/api/subscriptions/apply-promo",
    { code },
    token,
  );
}

export function postSuggest(body: SuggestRequest, token?: string) {
  return apiPost("/suggest", body, token);
}

export async function searchSuggest(query: string): Promise<SearchSuggestions> {
  return publicGet<SearchSuggestions>(
    `/search/suggest?query=${encodeURIComponent(query)}`
  );
}

export async function searchFull(query: string): Promise<SearchResult> {
  return publicGet<SearchResult>(
    `/search?query=${encodeURIComponent(query)}`
  );
}
// Goals
export type UserGoalData = {
  user_id?: string;
  gender: 'male' | 'female' | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  activity_level: 'min' | 'light' | 'avg' | 'high' | null;
  goal_type: 'lose' | 'maintain' | 'gain' | null;
  target_calories: number | null;
  target_protein: number | null;
  target_fat: number | null;
  target_carbs: number | null;
  is_auto_calculated: boolean;
  updated_at?: string;
};

export async function fetchUserGoals(token: string) {
  return apiGet<{ ok: boolean; goals: UserGoalData | null }>("/api/goals", token);
}

export async function updateUserGoals(data: Partial<UserGoalData>, token: string) {
  return apiPut("/api/goals", data, token);
}

export async function apiPut<T = unknown>(path: string, body?: unknown, token?: string): Promise<T> {
  let res = await doFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  }, token);

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      }, newToken);
    }
  }
  return handleResponse<T>(res);
}
