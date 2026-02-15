import { useEffect, useState, useRef, useCallback } from 'react';
import { AttributionControl, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster'; // Attaches L.markerClusterGroup
import { API_BASE } from '@/config/api';
import MetroFilter from './MetroFilter';
import MapCuisineFilter from './MapCuisineFilter';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter = [55.751244, 37.618423]; // Moscow
const defaultZoom = 10;

function normalizeInstagramUrl(rawUrl) {
    if (!rawUrl) return null;
    const text = String(rawUrl).trim();
    if (!text || text === '-' || text === '—') return null;

    const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, '')}`;
    try {
        const url = new URL(withProtocol);
        const host = url.hostname.replace(/^www\./i, '').toLowerCase();
        if (!host.endsWith('instagram.com')) return null;
        return url.toString();
    } catch (_) {
        return null;
    }
}

// Inner component to handle clustering logic via map instance access
function ClusterLayer({ restaurants }) {
    const map = useMap();
    const clusterGroupRef = useRef(null);
    const navigate = useNavigate(); // Hook for navigation

    useEffect(() => {
        // Initialize cluster group if not exists
        if (!clusterGroupRef.current) {
            clusterGroupRef.current = L.markerClusterGroup({ chunkedLoading: true });
            map.addLayer(clusterGroupRef.current);
        }

        const group = clusterGroupRef.current;
        group.clearLayers();

        // Create markers and add to cluster group
        const markers = restaurants
            .filter((r) => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon)))
            .map(r => {
                const marker = L.marker([Number(r.lat), Number(r.lon)]);
                const instagramUrl = normalizeInstagramUrl(r.instagramUrl);
                const instagramLink = instagramUrl
                    ? `<a href="${instagramUrl}" target="_blank" rel="noopener noreferrer" class="popup-instagram" title="Instagram">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11.5 1.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
                        </svg>
                      </a>`
                    : '';

                const popupContent = document.createElement('div');
                popupContent.className = 'map-popup';
                popupContent.innerHTML = `
                <strong>${r.name}</strong><br/>
                ${r.cuisine || ''}<br/>
                <div class="popup-links">
                    <a href="/r/${r.slug}/menu" class="popup-link">Перейти к меню</a>
                    ${instagramLink}
                </div>
            `;

                // Using event delegation or attaching handler to element
                const link = popupContent.querySelector('.popup-link');
                if (link) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        // Use React Router navigation
                        const targetPath = `/r/${r.slug}/menu`;
                        navigate(targetPath);
                    });
                }

                marker.bindPopup(popupContent);
                return marker;
            });

        group.addLayers(markers);

    }, [map, restaurants, navigate]);

    // Cleanup entirely on unmount
    useEffect(() => {
        return () => {
            if (clusterGroupRef.current) {
                map.removeLayer(clusterGroupRef.current);
            }
        };
    }, [map]);

    return null;
}

function MapViewportController({ focusTarget }) {
    const map = useMap();

    useEffect(() => {
        if (!focusTarget) return;
        const nextZoom = Number.isFinite(focusTarget.zoom) ? focusTarget.zoom : 13;
        map.flyTo([focusTarget.lat, focusTarget.lon], nextZoom, { duration: 0.8 });
    }, [map, focusTarget]);

    return null;
}

function ViewportChangeListener({ onViewportChange }) {
    const map = useMapEvents({
        moveend: () => {
            const center = map.getCenter();
            onViewportChange({ lat: center.lat, lon: center.lng, zoom: map.getZoom() });
        },
        zoomend: () => {
            const center = map.getCenter();
            onViewportChange({ lat: center.lat, lon: center.lng, zoom: map.getZoom() });
        }
    });

    useEffect(() => {
        const center = map.getCenter();
        onViewportChange({ lat: center.lat, lon: center.lng, zoom: map.getZoom() });
    }, [map, onViewportChange]);

    return null;
}

export default function RestaurantMap() {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metroData, setMetroData] = useState({ lines: [], stations: [] });
    const [cuisines, setCuisines] = useState([]);
    const [filters, setFilters] = useState({ cuisines: [] });
    const [focusTarget, setFocusTarget] = useState(null);
    const [isDefaultView, setIsDefaultView] = useState(true);
    const uniqueRestaurantCount = new Set(restaurants.map((item) => item.slug)).size;

    const handleViewportChange = useCallback(({ lat, lon, zoom }) => {
        const sameZoom = Math.abs(zoom - defaultZoom) < 0.01;
        const sameLat = Math.abs(lat - defaultCenter[0]) < 0.001;
        const sameLon = Math.abs(lon - defaultCenter[1]) < 0.001;
        setIsDefaultView(sameZoom && sameLat && sameLon);
    }, []);

    useEffect(() => {
        // Fetch metro data once
        async function fetchMetro() {
            try {
                const res = await fetch(`${API_BASE}/metro`);
                if (res.ok) {
                    const data = await res.json();
                    setMetroData(data);
                }
            } catch (err) {
                console.error("Failed to load metro data", err);
            }
        }
        fetchMetro();

        // Fetch cuisines once
        async function fetchCuisines() {
            try {
                const res = await fetch(`${API_BASE}/filters`);
                if (res.ok) {
                    const data = await res.json();
                    setCuisines(data.cuisines || []);
                }
            } catch (err) {
                console.error("Failed to load cuisines data", err);
            }
        }
        fetchCuisines();
    }, []);

    useEffect(() => {
        async function fetchRestaurants() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (filters.cuisines && filters.cuisines.length > 0) {
                    filters.cuisines.forEach(cuisine => params.append('cuisine', cuisine));
                }

                const res = await fetch(`${API_BASE}/restaurants/map?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setRestaurants(data.items || []);
                }
            } catch (err) {
                console.error("Failed to load map data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchRestaurants();
    }, [filters]);

    return (
        <div className="restaurant-map-container">
            <div className="map-header">
                <div className="header-left">
                    <h3>Карта ресторанов</h3>
                    <span className="badge">{uniqueRestaurantCount} ресторанов • {restaurants.length} точек</span>
                </div>
            </div>

            <div className="filters-row">
                <MetroFilter
                    metroData={metroData}
                    onJumpToStation={(station) => setFocusTarget({
                        lat: station.lat,
                        lon: station.lon,
                        key: `${station.name_ru}-${Date.now()}`
                    })}
                />
                <MapCuisineFilter
                    cuisines={cuisines}
                    selectedCuisines={filters.cuisines}
                    onChange={(f) => setFilters({ ...filters, cuisines: f.cuisines })}
                />
            </div>

            <div className="map-wrapper">
                {loading && <div className="map-overlay">Загрузка...</div>}
                {!isDefaultView && (
                    <button
                        type="button"
                        className="show-city-btn"
                        onClick={() => setFocusTarget({
                            lat: defaultCenter[0],
                            lon: defaultCenter[1],
                            zoom: defaultZoom,
                            key: `default-${Date.now()}`
                        })}
                    >
                        Показать весь город
                    </button>
                )}
                <MapContainer
                    center={defaultCenter}
                    zoom={defaultZoom}
                    scrollWheelZoom={false}
                    className="restaurant-map"
                    attributionControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <AttributionControl prefix={false} />
                    <MapViewportController focusTarget={focusTarget} />
                    <ViewportChangeListener onViewportChange={handleViewportChange} />
                    <ClusterLayer restaurants={restaurants} />
                </MapContainer>
            </div>

            <style>{`
        .restaurant-map-container {
          margin-top: 24px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--line);
          background: #fff;
        }
        .map-header {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .map-header h3 { margin: 0; font-size: 18px; }
        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-start;
        }
        @media (max-width: 768px) {
          .filters-row {
            flex-direction: column;
          }
          .metro-filter-container,
          .cuisine-filter-container {
            width: calc(100% - 32px) !important;
          }
        }
        .badge {
          background: var(--brand);
          color: #fff;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }
        .map-wrapper {
            position: relative;
            border-top: 1px solid var(--line);
        }
        .map-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.7);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
        }
        .show-city-btn {
            position: absolute;
            top: 14px;
            right: 14px;
            z-index: 1001;
            border: 1px solid #cbd5e1;
            background: #fff;
            color: #0f172a;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            padding: 9px 12px;
            cursor: pointer;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
            transition: all 0.2s ease;
        }
        .show-city-btn:hover {
            border-color: var(--rs-accent, #2f8f5b);
            color: var(--rs-accent, #2f8f5b);
        }
        .restaurant-map {
          height: 500px;
          width: 100%;
          z-index: 1; 
        }
        .map-popup {
            font-size: 14px;
            text-align: center;
        }
        .popup-link {
          color: var(--brand);
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
      `}</style>
        </div>
    );
}
