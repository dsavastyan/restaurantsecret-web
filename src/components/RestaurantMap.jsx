import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Link } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { API_BASE } from '@/config/api';

// Fix for default marker icons in Leaflet with Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter = [55.751244, 37.618423]; // Moscow

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
                <MarkerClusterGroup chunkedLoading>
                    {restaurants.map((r) => (
                        r.lat && r.lon ? (
                            <Marker key={r.id} position={[r.lat, r.lon]}>
                                <Popup>
                                    <div className="map-popup">
                                        <strong>{r.name}</strong>
                                        <br />
                                        {r.cuisine}
                                        <br />
                                        <Link to={`/r/${r.slug}/menu`}>Перейти к меню</Link>
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    ))}
                </MarkerClusterGroup>
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
        }
        .map-popup a {
          color: var(--brand);
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>
        </div>
    );
}
