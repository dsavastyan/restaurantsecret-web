// REPO: restaurantsecret-web
// file: src/lib/requests.js
import { API_BASE } from '@/config/api';

function buildUrl(path) {
  if (!path) return API_BASE;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function apiGet(path, opts = {}) {
  const url = buildUrl(path);
  console.log('[apiGet]', url); // оставить на время отладки
  const res = await fetch(url, { ...opts });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text.slice(0,200)}`);
  }
  // пытаемся json
  return res.json();
}

export async function apiPost(path, body, opts = {}) {
  const url = buildUrl(path);
  console.log('[apiPost]', url);
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch(url, { method: 'POST', body: JSON.stringify(body ?? {}), headers, ...opts });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${text.slice(0,200)}`);
  }
  return res.json();
}
