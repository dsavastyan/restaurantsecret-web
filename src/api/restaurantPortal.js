// src/api/restaurantPortal.js
// Dedicated client for the restaurant self-serve portal. Unlike src/api/client.js
// (which talks to pd.restaurantsecret.ru/cf without cookies), this hits the
// Cloudflare Worker directly, because the portal's session lives in an
// httpOnly cookie (SameSite=None) set by the Worker itself — see
// RestaurantSecret/functions/lib/restaurant-auth.js.
const env = typeof import.meta !== 'undefined' ? (import.meta.env ?? {}) : {}
const RESTAURANT_API_BASE = (env.VITE_RESTAURANT_API_BASE || 'https://tg.restaurantsecret.ru').replace(/\/+$/, '')

const createPortalError = (status, message, code, extra = null) => ({ status, message, code: code ?? null, ...(extra || {}) })

async function portalRequest(path, { method = 'GET', body, headers = {}, isFormData = false } = {}) {
  const url = `${RESTAURANT_API_BASE}${path}`

  let res
  try {
    res = await fetch(url, {
      method,
      credentials: 'include', // send/receive the rs_session cookie cross-origin
      headers: {
        Accept: 'application/json',
        ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    throw createPortalError(null, 'Не получилось связаться с сервером. Проверьте интернет-соединение.', 'network')
  }

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  let data = null
  if (contentType.includes('application/json')) {
    try {
      data = await res.json()
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    throw createPortalError(
      res.status,
      data?.error?.message || data?.error?.code || res.statusText,
      data?.error?.code,
      data?.errors ? { rowErrors: data.errors } : null
    )
  }

  return data
}

export const restaurantPortalApi = {
  requestLoginLink: (email) => portalRequest('/api/restaurant/auth/request-link', { method: 'POST', body: { email } }),

  logout: () => portalRequest('/api/restaurant/auth/logout', { method: 'POST' }),

  me: () => portalRequest('/api/restaurant/me'),

  uploadMenu: (file) => {
    const form = new FormData()
    form.append('file', file)
    return portalRequest('/api/restaurant/menu/upload', { method: 'POST', body: form, isFormData: true })
  },

  uploadPhotos: (files) => {
    const form = new FormData()
    for (const file of files) form.append('photos', file)
    return portalRequest('/api/restaurant/menu/photos', { method: 'POST', body: form, isFormData: true })
  },

  assignPhoto: (r2Key, dishId) =>
    portalRequest('/api/restaurant/menu/photos/assign', {
      method: 'POST',
      body: { r2_key: r2Key, dish_id: dishId },
    }),

  templateDownloadUrl: () => `${RESTAURANT_API_BASE}/api/restaurant/menu/template`,
}

export { createPortalError }
