// src/lib/api.ts
export const API_BASE = import.meta.env.VITE_PD_API_BASE || "https://pd.restaurantsecret.ru";

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

export async function apiGet(path: string, token?: string) {
  // 1-й заход
  let res = await doFetch(path, { method: "GET" }, token);
  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      res = await doFetch(path, { method: "GET" }, newToken); // ретрай 1 раз
    }
  }
  return res.json();
}

export async function apiPost(path: string, body?: unknown, token?: string) {
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
  return res.json();
}
