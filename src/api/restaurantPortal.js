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
      data?.errors
        ? { rowErrors: data.errors, validationKey: data.validation_key || null }
        : null
    )
  }

  return data
}

export const restaurantPortalApi = {
  requestLoginLink: (email) => portalRequest('/api/restaurant/auth/request-link', { method: 'POST', body: { email } }),

  logout: () => portalRequest('/api/restaurant/auth/logout', { method: 'POST' }),

  me: () => portalRequest('/api/restaurant/me'),

  confirmMenuFreshness: () =>
    portalRequest('/api/restaurant/menu/confirm-freshness', { method: 'POST' }),

  switchRestaurant: (restaurantId) =>
    portalRequest('/api/restaurant/switch', {
      method: 'POST',
      body: { restaurant_id: restaurantId },
    }),

  previewMenu: (file) => {
    const form = new FormData()
    form.append('file', file)
    return portalRequest('/api/restaurant/menu/preview', { method: 'POST', body: form, isFormData: true })
  },

  uploadMenu: (file) => {
    const form = new FormData()
    form.append('file', file)
    return portalRequest('/api/restaurant/menu/upload', { method: 'POST', body: form, isFormData: true })
  },

  menuHistory: () => portalRequest('/api/restaurant/menu/history'),

  menuVersion: (snapshotId) =>
    portalRequest(`/api/restaurant/menu/history/${encodeURIComponent(snapshotId)}`),

  restoreMenuVersion: (snapshotId) =>
    portalRequest(`/api/restaurant/menu/history/${encodeURIComponent(snapshotId)}/restore`, {
      method: 'POST',
    }),

  activeDraft: () => portalRequest('/api/restaurant/menu/drafts/active'),

  createDraft: ({ replaceActive = false } = {}) =>
    portalRequest('/api/restaurant/menu/drafts', {
      method: 'POST',
      body: { replace_active: replaceActive },
    }),

  draft: (draftId) =>
    portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}`),

  updateDraft: (draftId, body) =>
    portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}`, {
      method: 'PATCH',
      body,
    }),

  resetDraft: (draftId, method) =>
    portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/reset`, {
      method: 'POST',
      body: { method },
    }),

  uploadDraftSource: (draftId, file) => {
    const form = new FormData()
    form.append('file', file)
    return portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/source`, {
      method: 'POST',
      body: form,
      isFormData: true,
    })
  },

  uploadDraftSources: (draftId, files) => {
    const form = new FormData()
    for (const file of files) form.append('files', file)
    return portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/source`, {
      method: 'POST',
      body: form,
      isFormData: true,
    })
  },

  replyToRevision: (draftId, message, files = []) => {
    const form = new FormData()
    form.append('message', message || '')
    for (const file of files) form.append('files', file)
    return portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/revision/reply`, {
      method: 'POST',
      body: form,
      isFormData: true,
    })
  },

  revisionSourceDownloadUrl: (draftId, fileId) =>
    `${RESTAURANT_API_BASE}/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/revision/files/${encodeURIComponent(fileId)}`,

  sendRevisionMessage: (draftId, message, type = 'comment') =>
    portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/revision/messages`, {
      method: 'POST',
      body: { message, type },
    }),

  addDraftItem: (draftId, item) =>
    portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/items`, {
      method: 'POST',
      body: item,
    }),

  updateDraftItem: (draftId, itemId, item) =>
    portalRequest(
      `/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/items/${encodeURIComponent(itemId)}`,
      { method: 'PATCH', body: item },
    ),

  deleteDraftItem: (draftId, itemId) =>
    portalRequest(
      `/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' },
    ),

  restoreDraftItem: (draftId, itemId) =>
    portalRequest(
      `/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/items/${encodeURIComponent(itemId)}/restore`,
      { method: 'POST' },
    ),

  uploadDraftPhotos: (draftId, files, itemId = null) => {
    const form = new FormData()
    for (const file of files) form.append('photos', file)
    if (itemId != null) form.append('item_id', String(itemId))
    return portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/photos`, {
      method: 'POST',
      body: form,
      isFormData: true,
    })
  },

  assignDraftPhoto: (draftId, photoId, itemId) =>
    portalRequest(
      `/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/photos/${encodeURIComponent(photoId)}/assign`,
      { method: 'POST', body: { item_id: itemId } },
    ),

  deleteDraftItemPhoto: (draftId, itemId) =>
    portalRequest(
      `/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/items/${encodeURIComponent(itemId)}/photo`,
      { method: 'DELETE' },
    ),

  draftItemPhotoUrl: (draftId, itemId) =>
    `${RESTAURANT_API_BASE}/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/items/${encodeURIComponent(itemId)}/photo`,

  submitDraft: (draftId) =>
    portalRequest(`/api/restaurant/menu/drafts/${encodeURIComponent(draftId)}/submit`, {
      method: 'POST',
    }),

  uploadPhotos: (files) => {
    const form = new FormData()
    for (const file of files) form.append('photos', file)
    return portalRequest('/api/restaurant/menu/photos', { method: 'POST', body: form, isFormData: true })
  },

  menuPhotos: () => portalRequest('/api/restaurant/menu/photos'),

  replaceMenuPhoto: (dishId, file) => {
    const form = new FormData()
    form.append('photo', file)
    return portalRequest(`/api/restaurant/menu/photos/${encodeURIComponent(dishId)}`, {
      method: 'PUT',
      body: form,
      isFormData: true,
    })
  },

  deleteMenuPhoto: (dishId) =>
    portalRequest(`/api/restaurant/menu/photos/${encodeURIComponent(dishId)}`, {
      method: 'DELETE',
    }),

  assignPhoto: (r2Key, dishId) =>
    portalRequest('/api/restaurant/menu/photos/assign', {
      method: 'POST',
      body: { r2_key: r2Key, dish_id: dishId },
    }),

  templateDownloadUrl: () => `${RESTAURANT_API_BASE}/api/restaurant/menu/template`,

  validationDownloadUrl: (key) =>
    `${RESTAURANT_API_BASE}/api/restaurant/menu/validation-result?key=${encodeURIComponent(key)}`,
}

export { createPortalError }
