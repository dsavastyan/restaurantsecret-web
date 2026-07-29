const env = typeof import.meta !== 'undefined' ? (import.meta.env ?? {}) : {}
const API_BASE = (env.VITE_RESTAURANT_API_BASE || 'https://tg.restaurantsecret.ru').replace(/\/+$/, '')

async function request(path, {
  method = 'GET',
  body,
  form = false,
  responseType = 'json',
} = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      Accept: responseType === 'json' ? 'application/json' : '*/*',
      ...(body && !form ? { 'Content-Type': 'application/json' } : {}),
    },
    body: form ? body : body ? JSON.stringify(body) : undefined,
  })
  if (responseType === 'blob' && response.ok) return response.blob()
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.error?.code || response.statusText)
    error.status = response.status
    error.code = data?.error?.code
    error.details = data
    throw error
  }
  return data
}

export const adminMenuRevisionsApi = {
  login: (key) => request('/api/admin/auth/login', { method: 'POST', body: { key } }),
  me: () => request('/api/admin/auth/me'),
  logout: () => request('/api/admin/auth/logout', { method: 'POST' }),
  list: ({ status = '', query = '' } = {}) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (query) params.set('query', query)
    return request(`/api/admin/menu-revisions${params.size ? `?${params}` : ''}`)
  },
  get: (revisionId) => request(`/api/admin/menu-revisions/${encodeURIComponent(revisionId)}`),
  updateComment: (revisionId, internalComment, lockVersion) =>
    request(`/api/admin/menu-revisions/${encodeURIComponent(revisionId)}`, {
      method: 'PATCH',
      body: { internal_comment: internalComment, lock_version: lockVersion },
    }),
  requestClarification: (revisionId, message) =>
    request(`/api/admin/menu-revisions/${encodeURIComponent(revisionId)}/clarification`, {
      method: 'POST',
      body: { message },
    }),
  uploadNormalized: (revisionId, file) => {
    const form = new FormData()
    form.append('file', file)
    return request(`/api/admin/menu-revisions/${encodeURIComponent(revisionId)}/normalized`, {
      method: 'POST',
      body: form,
      form: true,
    })
  },
  fileBlob: (fileId, download = false) =>
    request(
      `/api/admin/menu-revision-files/${encodeURIComponent(fileId)}${download ? '?download=1' : ''}`,
      { responseType: 'blob' },
    ),
  excelPreview: (fileId) =>
    request(`/api/admin/menu-revision-files/${encodeURIComponent(fileId)}/preview`),
}
