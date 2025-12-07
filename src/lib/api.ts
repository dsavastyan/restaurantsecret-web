// src/lib/api.ts
import { API_BASE as CONFIG_API_BASE } from "@/config/api";

export const API_BASE =
  (import.meta.env.VITE_PD_API_BASE as string | undefined) || CONFIG_API_BASE;

export const PUBLIC_API_BASE =
  (import.meta.env.VITE_PUBLIC_API_BASE as string | undefined) || CONFIG_API_BASE;

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
  restaurant: string;
  dish?: string | null;
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
  const res = await fetch(`${PUBLIC_API_BASE}${path}`, {
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
        localStorage.setItem("rs_access", data.access_token);
      } catch {}
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
