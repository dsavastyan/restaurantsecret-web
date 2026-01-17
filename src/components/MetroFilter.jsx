import { useState, useMemo } from 'react';

export default function MetroFilter({ metroData, onChange }) {
    const [selectedStationId, setSelectedStationId] = useState('');
    const [stationSearch, setStationSearch] = useState('');

    const stations = metroData.stations || [];

    // Filter stations based on search
    const filteredStations = useMemo(() => {
        if (!stationSearch) return stations;

        const lower = stationSearch.toLowerCase();
        return stations.filter(s => s.name_ru.toLowerCase().includes(lower));
    }, [stations, stationSearch]);

    const handleStationChange = (e) => {
        const stationId = e.target.value;
        setSelectedStationId(stationId);
        onChange({ stationId });
    };

    const handleSearchChange = (e) => {
        setStationSearch(e.target.value);
    };

    const handleClear = () => {
        setSelectedStationId('');
        setStationSearch('');
        onChange({ stationId: '' });
    };

    return (
        <div className="metro-filter">
            <div className="filter-group">
                <input
                    type="text"
                    placeholder="Поиск станции метро..."
                    value={stationSearch}
                    onChange={handleSearchChange}
                    className="station-search"
                />
            </div>

            <div className="filter-group">
                <select
                    value={selectedStationId}
                    onChange={handleStationChange}
                    className="metro-select"
                >
                    <option value="">Все станции</option>
                    {filteredStations.slice(0, 100).map(s => (
                        <option key={s.id} value={s.id}>
                            {s.name_ru}
                        </option>
                    ))}
                </select>
            </div>

            {selectedStationId && (
                <button className="clear-btn" onClick={handleClear}>✕</button>
            )}

            <style>{`
                .metro-filter {
                    display: flex;
                    gap: 8px;
                    padding: 0 16px 16px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .filter-group {
                    position: relative;
                }
                .station-search {
                    padding: 8px 12px;
                    border: 1px solid #e1e4e8;
                    border-radius: 8px;
                    font-size: 14px;
                    background: #fff;
                    min-width: 200px;
                }
                .metro-select {
                    padding: 8px 12px;
                    border: 1px solid #e1e4e8;
                    border-radius: 8px;
                    font-size: 14px;
                    background: #fff;
                    min-width: 150px;
                    max-width: 200px;
                }
                .clear-btn {
                    background: none;
                    border: none;
                    color: #999;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 4px;
                }
                .clear-btn:hover {
                    color: #666;
                }
            `}</style>
        </div>
    );
}
