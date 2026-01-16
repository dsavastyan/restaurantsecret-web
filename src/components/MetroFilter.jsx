
import { useState, useMemo } from 'react';

export default function MetroFilter({ metroData, onChange }) {
    const [selectedLineId, setSelectedLineId] = useState('');
    const [selectedStationId, setSelectedStationId] = useState('');
    const [stationSearch, setStationSearch] = useState('');

    const lines = metroData.lines || [];
    const stations = metroData.stations || [];

    // Filter stations based on selected line
    const filteredStations = useMemo(() => {
        let list = stations;
        if (selectedLineId) {
            list = list.filter(s => String(s.line_id) === String(selectedLineId));
        }
        if (stationSearch) {
            const lower = stationSearch.toLowerCase();
            list = list.filter(s => s.name_ru.toLowerCase().includes(lower));
        }
        return list;
    }, [stations, selectedLineId, stationSearch]);

    const handleLineChange = (e) => {
        const lineId = e.target.value;
        setSelectedLineId(lineId);
        setSelectedStationId(''); // Reset station when line changes
        setStationSearch('');
        onChange({ lineId, stationId: '' });
    };

    const handleStationChange = (e) => {
        const stationId = e.target.value;
        setSelectedStationId(stationId);
        onChange({ lineId: selectedLineId, stationId });
    };

    const handleClear = () => {
        setSelectedLineId('');
        setSelectedStationId('');
        setStationSearch('');
        onChange({ lineId: '', stationId: '' });
    };

    return (
        <div className="metro-filter">
            <div className="filter-group">
                <select value={selectedLineId} onChange={handleLineChange} className="metro-select">
                    <option value="">Все линии</option>
                    {lines.map(line => (
                        <option key={line.id} value={line.id} style={{ color: line.color_hex ? '#' + line.color_hex : 'inherit' }}>
                            ● {line.name_ru}
                        </option>
                    ))}
                </select>
            </div>

            <div className="filter-group">
                {/* Simple search input for stations if list is long, but let's stick to select for now if line is selected */}
                <select
                    value={selectedStationId}
                    onChange={handleStationChange}
                    className="metro-select"
                    disabled={!selectedLineId && stations.length > 300} // Disable if too many (requires search)
                >
                    <option value="">{selectedLineId ? 'Любая станция' : 'Выберите линию'}</option>
                    {filteredStations.slice(0, 100).map(s => (
                        <option key={s.id} value={s.id}>
                            {s.name_ru}
                        </option>
                    ))}
                </select>
            </div>

            {(selectedLineId || selectedStationId) && (
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
