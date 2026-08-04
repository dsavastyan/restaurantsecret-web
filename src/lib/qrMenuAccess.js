// Temporary, per-browser-tab access granted by scanning a restaurant's menu QR
// code. Lives in sessionStorage only (never localStorage, never the account)
// and expires after IDLE_LIMIT_MS of inactivity.
const STORAGE_KEY = 'rs_qr_menu_session'
export const QR_IDLE_LIMIT_MS = 15 * 60 * 1000

function readSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.slug || !parsed?.lastActivityAt) return null
    return parsed
  } catch {
    return null
  }
}

export function startQrMenuSession(slug) {
  if (typeof window === 'undefined' || !slug) return
  const now = Date.now()
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ slug, lastActivityAt: now }))
}

export function touchQrMenuActivity() {
  const session = readSession()
  if (!session) return
  if (Date.now() - session.lastActivityAt > QR_IDLE_LIMIT_MS) return
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...session, lastActivityAt: Date.now() }),
  )
}

export function clearQrMenuSession() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(STORAGE_KEY)
}

// True when there is a live (non-idle) QR session for this exact restaurant slug.
export function hasQrMenuAccess(slug) {
  const session = readSession()
  if (!session || !slug) return false
  if (session.slug !== slug) return false
  if (Date.now() - session.lastActivityAt > QR_IDLE_LIMIT_MS) {
    clearQrMenuSession()
    return false
  }
  return true
}

// Returns the slug of the current idle-expired session, if any, so the caller
// can clear it and redirect the user away from the menu they were viewing.
export function expiredQrMenuSlug() {
  const session = readSession()
  if (!session) return null
  if (Date.now() - session.lastActivityAt <= QR_IDLE_LIMIT_MS) return null
  return session.slug
}
