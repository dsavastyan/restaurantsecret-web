// Base URL for the RestaurantSecret API. Centralized here so the same value is
// reused by fetch helpers and hooks. Prefer the Vite-powered environment
// variables so CI workflows can point the frontend at staging or review
// backends without touching the source.
const FALLBACK_API_BASE = 'https://api.restaurantsecret.ru/cf'

const env = typeof import.meta !== 'undefined' ? (import.meta.env ?? {}) : {}
const configured = env.VITE_API_BASE_URL || env.VITE_API_BASE || env.VITE_API_URL || ''

// Ensure the base URL never ends with a trailing slash so helpers can safely
// append paths, then enforce the /cf prefix for the new API gateway.
const normalized = (configured || FALLBACK_API_BASE).replace(/\/+$/, '')
const withCf = normalized.endsWith('/cf') ? normalized : `${normalized}/cf`

export const API_BASE = withCf
