// Lightweight, client-only feature flag used to preview redesigned pages
// before they ship to every user. Nothing here talks to the backend — it is
// pure localStorage + a URL trigger, so it is safe to leave in production.
//
// How it works:
//   - Visit any page with ?menu2=1 in the URL once -> flag is stored in this
//     browser's localStorage and the new menu design renders from then on,
//     only in that browser.
//   - Visit with ?menu2=0 to turn it back off (falls back to the current
//     production design).
//   - Everyone else keeps seeing the existing page, unchanged.
//
// This keeps the redesign fully wired into the real codebase (not a
// throwaway branch) while limiting visibility to whoever explicitly opts in.
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'rs_preview_menu_v2'
const QUERY_KEY = 'menu2'

const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

function readFlag() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch (_) {
    return false
  }
}

function writeFlag(value) {
  if (typeof window === 'undefined') return
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch (_) {
    // Ignore storage failures (private mode, quota, etc).
  }
  notify()
}

// Apply ?menu2=1 / ?menu2=0 from the current URL, once, as soon as this
// module loads in the browser.
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has(QUERY_KEY)) {
      const raw = params.get(QUERY_KEY)
      writeFlag(raw === '1' || raw === 'true')
    }
  } catch (_) {
    // Ignore malformed URLs.
  }
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// React hook: true when this browser has opted into the redesigned menu.
export function useMenuPreview() {
  return useSyncExternalStore(subscribe, readFlag, () => false)
}

// Non-hook accessor for use outside React (e.g. the dish-card store).
export function isMenuPreviewEnabled() {
  return readFlag()
}

// Explicit setter, in case we want a toggle switch in the UI later.
export function setMenuPreview(value) {
  writeFlag(Boolean(value))
}
