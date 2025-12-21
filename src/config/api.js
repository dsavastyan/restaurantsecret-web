// Base URL for the RestaurantSecret API. Centralized here so the same value is
// reused by fetch helpers and hooks. Prefer the Vite-powered environment
// variables so CI workflows can point the frontend at staging or review
// backends without touching the source.
const FALLBACK_PUBLIC_API_BASE = 'https://restaurantsecret-api.dsavastyan.workers.dev'
const FALLBACK_PD_API_BASE = 'https://pd.restaurantsecret.ru'

const env = typeof import.meta !== 'undefined' ? (import.meta.env ?? {}) : {}
const configuredPublic =
  env.VITE_API_BASE_URL || env.VITE_API_BASE || env.VITE_API_URL || ''
const configuredPd = env.VITE_PD_API_BASE || ''

// Ensure the base URL never ends with a trailing slash so helpers can safely
// append paths.
const normalizedPublic = (configuredPublic || FALLBACK_PUBLIC_API_BASE).replace(/\/+$/, '')
const normalizedPd = (configuredPd || FALLBACK_PD_API_BASE).replace(/\/+$/, '')

export const API_BASE = normalizedPublic
export const PUBLIC_API_BASE = normalizedPublic
export const PD_API_BASE = normalizedPd
