import { PD_API_BASE } from '@/config/api'

const VISITOR_ID_KEY = 'rs_city_visitor_id'

function createVisitorId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16)
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}

function getVisitorId() {
  const stored = localStorage.getItem(VISITOR_ID_KEY)
  if (stored) return stored
  const visitorId = createVisitorId()
  localStorage.setItem(VISITOR_ID_KEY, visitorId)
  return visitorId
}

export async function persistCityPreference(city, source, accessToken) {
  if (!city) return
  const response = await fetch(`${PD_API_BASE}/api/city-preference`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ visitor_id: getVisitorId(), city, source }),
  })
  if (!response.ok) throw new Error(`Failed to persist city preference: ${response.status}`)
}

export function saveCatalogCity(city, source = 'manual', accessToken) {
  localStorage.setItem('catalog_city', city)
  persistCityPreference(city, source, accessToken).catch((error) => {
    console.error('Failed to persist city preference', error)
  })
}
