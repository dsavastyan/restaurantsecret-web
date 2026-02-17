import { useEffect, useState, useRef, useCallback } from 'react'
import { AttributionControl, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L from 'leaflet'
import 'leaflet.markercluster'
import { API_BASE } from '@/config/api'
import MetroFilter from './MetroFilter'
import MapCuisineFilter from './MapCuisineFilter'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const defaultCenter = [55.751244, 37.618423]
const defaultZoom = 10

function normalizeInstagramUrl(rawUrl) {
  if (!rawUrl) return null
  const text = String(rawUrl).trim()
  if (!text || text === '-' || text === '—') return null

  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, '')}`
  try {
    const url = new URL(withProtocol)
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()
    if (!host.endsWith('instagram.com')) return null
    return url.toString()
  } catch (_) {
    return null
  }
}

function ClusterLayer({ restaurants }) {
  const map = useMap()
  const clusterGroupRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({ chunkedLoading: true })
      map.addLayer(clusterGroupRef.current)
    }

    const group = clusterGroupRef.current
    group.clearLayers()

    const markers = restaurants
      .filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon)))
      .map((r) => {
        const marker = L.marker([Number(r.lat), Number(r.lon)])
        const instagramUrl = normalizeInstagramUrl(r.instagramUrl)
        const instagramLink = instagramUrl
          ? `<a href="${instagramUrl}" target="_blank" rel="noopener noreferrer" class="popup-instagram" title="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11.5 1.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
              </svg>
            </a>`
          : ''

        const popupContent = document.createElement('div')
        popupContent.className = 'map-popup'
        popupContent.innerHTML = `
          <strong>${r.name}</strong><br/>
          ${r.cuisine || ''}<br/>
          <div class="popup-links">
            <a href="/r/${r.slug}/menu" class="popup-link">Перейти к меню</a>
            ${instagramLink}
          </div>
        `

        const link = popupContent.querySelector('.popup-link')
        if (link) {
          link.addEventListener('click', (e) => {
            e.preventDefault()
            navigate(`/r/${r.slug}/menu`)
          })
        }

        marker.bindPopup(popupContent)
        return marker
      })

    group.addLayers(markers)
  }, [map, restaurants, navigate])

  useEffect(() => {
    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current)
      }
    }
  }, [map])

  return null
}

function MapViewportController({ focusTarget }) {
  const map = useMap()

  useEffect(() => {
    if (!focusTarget) return
    const nextZoom = Number.isFinite(focusTarget.zoom) ? focusTarget.zoom : 13
    map.flyTo([focusTarget.lat, focusTarget.lon], nextZoom, { duration: 0.8 })
  }, [map, focusTarget])

  return null
}

function ViewportChangeListener({ onViewportChange }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      onViewportChange({ lat: center.lat, lon: center.lng, zoom: map.getZoom() })
    },
    zoomend: () => {
      const center = map.getCenter()
      onViewportChange({ lat: center.lat, lon: center.lng, zoom: map.getZoom() })
    },
  })

  useEffect(() => {
    const center = map.getCenter()
    onViewportChange({ lat: center.lat, lon: center.lng, zoom: map.getZoom() })
  }, [map, onViewportChange])

  return null
}

function MapResizeController({ watch }) {
  const map = useMap()

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 120)
    return () => window.clearTimeout(id)
  }, [map, watch])

  return null
}

function calculateWeeklyAdded(restaurants) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = new Set()

  for (const item of restaurants) {
    const createdRaw = item?.created_at ?? item?.createdAt
    if (!createdRaw) continue
    const createdMs = Date.parse(createdRaw)
    if (!Number.isFinite(createdMs) || createdMs < weekAgo) continue
    const key = item?.restaurantId ?? item?.slug ?? item?.id
    if (key) recent.add(String(key))
  }

  return recent.size
}

export default function RestaurantMap({ themeMode = 'day', onStatsChange, showSummaryHeader = true }) {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [metroData, setMetroData] = useState({ lines: [], stations: [] })
  const [cuisines, setCuisines] = useState([])
  const [filters, setFilters] = useState({ cuisines: [] })
  const [focusTarget, setFocusTarget] = useState(null)
  const [isDefaultView, setIsDefaultView] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const uniqueRestaurantCount = new Set(restaurants.map((item) => item.slug)).size
  const isNight = themeMode === 'night'

  const handleViewportChange = useCallback(({ lat, lon, zoom }) => {
    const sameZoom = Math.abs(zoom - defaultZoom) < 0.01
    const sameLat = Math.abs(lat - defaultCenter[0]) < 0.001
    const sameLon = Math.abs(lon - defaultCenter[1]) < 0.001
    setIsDefaultView(sameZoom && sameLat && sameLon)
  }, [])

  useEffect(() => {
    async function fetchMetro() {
      try {
        const res = await fetch(`${API_BASE}/metro`)
        if (res.ok) {
          const data = await res.json()
          setMetroData(data)
        }
      } catch (err) {
        console.error('Failed to load metro data', err)
      }
    }

    async function fetchCuisines() {
      try {
        const res = await fetch(`${API_BASE}/filters`)
        if (res.ok) {
          const data = await res.json()
          setCuisines(data.cuisines || [])
        }
      } catch (err) {
        console.error('Failed to load cuisines data', err)
      }
    }

    fetchMetro()
    fetchCuisines()
  }, [])

  useEffect(() => {
    async function fetchRestaurants() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filters.cuisines && filters.cuisines.length > 0) {
          filters.cuisines.forEach((cuisine) => params.append('cuisine', cuisine))
        }

        const res = await fetch(`${API_BASE}/restaurants/map?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setRestaurants(data.items || [])
        }
      } catch (err) {
        console.error('Failed to load map data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurants()
  }, [filters])

  useEffect(() => {
    if (typeof onStatsChange !== 'function') return
    onStatsChange({
      restaurants: uniqueRestaurantCount,
      points: restaurants.length,
      weeklyAdded: calculateWeeklyAdded(restaurants),
    })
  }, [onStatsChange, restaurants, uniqueRestaurantCount])

  useEffect(() => {
    if (!isFullscreen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isFullscreen])

  const tileUrl = isNight
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  return (
    <div className={`restaurant-map-container ${isNight ? 'is-night' : 'is-day'} ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {showSummaryHeader && (
        <div className="map-header">
          <div className="header-left">
            <h3>Карта ресторанов</h3>
            <span className="badge">{uniqueRestaurantCount} ресторанов • {restaurants.length} точек</span>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="map-expand-btn"
              onClick={() => setIsFullscreen((prev) => !prev)}
            >
              {isFullscreen ? 'Свернуть карту' : 'Развернуть карту'}
            </button>
          </div>
        </div>
      )}

      {isFullscreen && (
        <div className="filters-row">
          <MetroFilter
            metroData={metroData}
            onJumpToStation={(station) =>
              setFocusTarget({
                lat: station.lat,
                lon: station.lon,
                key: `${station.name_ru}-${Date.now()}`,
              })
            }
          />
          <MapCuisineFilter
            cuisines={cuisines}
            selectedCuisines={filters.cuisines}
            onChange={(f) => setFilters({ ...filters, cuisines: f.cuisines })}
          />
        </div>
      )}

      <div className="map-wrapper">
        {!isFullscreen && !showSummaryHeader && (
          <button
            type="button"
            className="map-expand-btn map-expand-btn--overlay"
            onClick={() => setIsFullscreen(true)}
          >
            Развернуть карту
          </button>
        )}
        {isFullscreen && !showSummaryHeader && (
          <button
            type="button"
            className="map-expand-btn map-expand-btn--overlay"
            onClick={() => setIsFullscreen(false)}
          >
            Свернуть карту
          </button>
        )}
        {loading && <div className="map-overlay">Загрузка...</div>}
        {!isDefaultView && (
          <button
            type="button"
            className="show-city-btn"
            onClick={() =>
              setFocusTarget({
                lat: defaultCenter[0],
                lon: defaultCenter[1],
                zoom: defaultZoom,
                key: `default-${Date.now()}`,
              })
            }
          >
            Показать весь город
          </button>
        )}

        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          scrollWheelZoom={isFullscreen}
          className="restaurant-map"
          attributionControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={tileUrl}
          />
          <AttributionControl prefix={false} />
          <MapViewportController focusTarget={focusTarget} />
          <ViewportChangeListener onViewportChange={handleViewportChange} />
          <MapResizeController watch={`${isFullscreen}-${themeMode}`} />
          <ClusterLayer restaurants={restaurants} />
        </MapContainer>
      </div>

      <style>{`
        .restaurant-map-container {
          margin-top: 12px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--line, #e2e8f0);
          background: var(--card, #fff);
          position: relative;
        }

        .restaurant-map-container.is-night {
          background: #10141b;
          border-color: rgba(148, 163, 184, 0.24);
        }

        .map-header {
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .map-header h3 {
          margin: 0;
          font-size: 15px;
          white-space: nowrap;
        }

        .restaurant-map-container.is-night .map-header h3 {
          color: #e2e8f0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .map-expand-btn {
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #0f172a;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 12px;
          cursor: pointer;
        }

        .map-expand-btn--overlay {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 1002;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.18);
        }

        .restaurant-map-container.is-night .map-expand-btn {
          background: #0f172a;
          border-color: #334155;
          color: #e2e8f0;
        }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 0 10px 10px;
          align-items: flex-start;
        }

        .filters-row .metro-filter-container,
        .filters-row .cuisine-filter-container {
          margin: 0 !important;
          width: 260px;
        }

        .badge {
          background: var(--brand, #2f8f5b);
          color: #fff;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .map-wrapper {
          position: relative;
          border-top: 1px solid var(--line, #e2e8f0);
        }

        .restaurant-map-container > .map-wrapper:first-child {
          border-top: 0;
        }

        .restaurant-map-container.is-night .map-wrapper {
          border-top-color: rgba(148, 163, 184, 0.24);
        }

        .map-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.65);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .show-city-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 1001;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #0f172a;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 10px;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
        }

        .restaurant-map-container.is-night .map-overlay {
          background: rgba(8, 16, 30, 0.58);
          color: #dbe7f8;
        }

        .restaurant-map-container.is-night .show-city-btn {
          background: #0f172a;
          border-color: #334155;
          color: #e2e8f0;
        }

        .restaurant-map {
          height: min(24dvh, 220px);
          width: 100%;
          z-index: 1;
        }

        .map-popup {
          font-size: 14px;
          text-align: center;
        }

        .popup-link {
          color: var(--brand, #2f8f5b);
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          margin-top: 4px;
        }

        .popup-links {
          margin-top: 4px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .popup-instagram {
          display: inline-flex;
          width: 18px;
          height: 18px;
          color: #e1306c;
        }

        .popup-instagram svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }

        .restaurant-map-container.is-fullscreen {
          position: fixed;
          inset: 0;
          z-index: 1400;
          border-radius: 0;
          border: none;
          margin: 0;
        }

        .restaurant-map-container.is-fullscreen .restaurant-map {
          height: calc(100dvh - 110px);
        }

        @media (max-width: 768px) {
          .map-header {
            padding: 8px 10px;
          }

          .map-header h3 {
            font-size: 14px;
          }

          .badge {
            font-size: 11px;
          }

          .map-expand-btn {
            font-size: 12px;
            padding: 7px 10px;
          }

          .filters-row {
            flex-direction: column;
          }

          .filters-row .metro-filter-container,
          .filters-row .cuisine-filter-container {
            width: 100%;
          }

          .restaurant-map {
            height: min(20dvh, 170px);
          }

          .restaurant-map-container.is-fullscreen .restaurant-map {
            height: calc(100dvh - 170px);
          }
        }
      `}</style>
    </div>
  )
}
