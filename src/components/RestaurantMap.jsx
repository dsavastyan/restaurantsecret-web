import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster'; // Attaches L.markerClusterGroup
import { API_BASE } from '@/config/api';

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

                // Build popup content string or DOM element
                // Note: Since we are using pure Leaflet for markers, we can't easily use React Link components inside popup string.
                // We use simple HTML. For navigation we might need a global handler or regular boolean href.
                // But standard <a href> causes full reload for single page apps usually.
                // To support SPA navigation, we can add a click handler to the button/link in the popup.

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
                        // We need access to router navigation or just rely on standard navigation if acceptable.
                        // For now, let's use window.location if we don't pass 'navigate' function.
                        // BETTER: dispatch a custom event or use window.location.hash logic if hash router.
                        // But we are in a component. We can just use standard href if we don't mind refresh,
                        // OR we can try to use React Portal for Popup but that requires <Marker> components.
                        // Since user asked for "pure leaflet.markercluster without React wrapper", 
                        // this implies imperative marker creation.
                        window.location.href = link.getAttribute('href');
                    });
                }

                marker.bindPopup(popupContent);
                return marker;
            });

        group.addLayers(markers);

        // Cleanup on unmount (optional, but good practice if component unmounts)
        return () => {
            // We generally keep the group if we just update data, but if component dies, remove it.
            // Actually, for this useEffect dependent on 'restaurants', we act like it's a fresh render of markers.
        };

    }, [map, restaurants]);

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

export default function RestaurantMap() {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRestaurants() {
            try {
                const res = await fetch(`${API_BASE}/restaurants/map`);
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
    }, []);

    if (loading) return <div className="map-placeholder is-loading">Загрузка карты...</div>;

    return (
        <div className="restaurant-map-container">
            <div className="map-header">
                <h3>Карта ресторанов</h3>
                <span className="badge">{restaurants.length} ресторанов</span>
            </div>
            <MapContainer
                center={defaultCenter}
                zoom={10}
                scrollWheelZoom={false}
                className="restaurant-map"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClusterLayer restaurants={restaurants} />
            </MapContainer>

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
          border-bottom: 1px solid var(--line);
        }
        .map-header h3 { margin: 0; font-size: 18px; }
        .badge {
          background: var(--brand);
          color: #fff;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
        }
        .restaurant-map {
          height: 500px;
          width: 100%;
          z-index: 1; 
        }
        .map-placeholder {
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7faf7;
          border-radius: 16px;
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
