import { useEffect, useState, useRef } from 'react';
import { AttributionControl, MapContainer, TileLayer, useMap } from 'react-leaflet';
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
            .filter(r => r.lat && r.lon)
            .map(r => {
                const marker = L.marker([r.lat, r.lon]);

                const popupContent = document.createElement('div');
                popupContent.className = 'map-popup';
                popupContent.innerHTML = `
                <strong>${r.name}</strong><br/>
                ${r.cuisine || ''}<br/>
                <a href="/r/${r.slug}/menu" class="popup-link">Перейти к меню</a>
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
        map.flyTo([focusTarget.lat, focusTarget.lon], 13, { duration: 0.8 });
    }, [map, focusTarget]);

    return null;
}

export default function RestaurantMap() {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metroData, setMetroData] = useState({ lines: [], stations: [] });
    const [cuisines, setCuisines] = useState([]);
    const [filters, setFilters] = useState({ stationIds: [], cuisines: [] });
    const [focusTarget, setFocusTarget] = useState(null);

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
                if (filters.stationIds && filters.stationIds.length > 0) {
                    filters.stationIds.forEach(id => params.append('station_id', id));
                }
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
                    <span className="badge">{restaurants.length} ресторанов</span>
                </div>
            </div>

            <div className="filters-row">
                <MetroFilter
                    metroData={metroData}
                    selectedStationIds={filters.stationIds}
                    onChange={(f) => setFilters({ ...filters, stationIds: f.stationIds })}
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
                <MapContainer
                    center={defaultCenter}
                    zoom={10}
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
          display: inline-block;
          margin-top: 4px;
        }
      `}</style>
        </div>
    );
}
