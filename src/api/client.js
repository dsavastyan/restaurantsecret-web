// Tiny wrapper around fetch for GET requests. Handles query parameters and
// surfaces JSON parsing errors.
const BASE = import.meta.env.VITE_API_BASE ?? 'https://api.restaurantsecret.ru';

async function get(path, params = {}) {
  const url = new URL(path, BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return;
    if (Array.isArray(v)) v.forEach(x => url.searchParams.append(k, x));
    else url.searchParams.set(k, v);
  });
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Export a small client surface the rest of the app can use.
export const api = {
  filters: () => get('/filters'),
  restaurants: (opts) => get('/restaurants', opts),
  restaurant: (slug) => get(`/restaurants/${encodeURIComponent(slug)}`),
  menu: (slug) => get(`/restaurants/${encodeURIComponent(slug)}/menu`),
  search: (query, opts) => get('/search', { query, ...opts })
}
