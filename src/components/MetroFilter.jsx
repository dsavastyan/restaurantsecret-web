import { useState, useMemo, useRef, useEffect } from 'react';

export default function MetroFilter({ metroData, onJumpToStation }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);

    const stations = metroData.stations || [];

    // Group stations by name to avoid duplicates (different lines)
    const groupedStations = useMemo(() => {
        const groups = {};
        stations.forEach((station) => {
            if (!groups[station.name_ru]) {
                groups[station.name_ru] = {
                    name_ru: station.name_ru,
                    points: []
                };
            }

            if (Number.isFinite(Number(station.lat)) && Number.isFinite(Number(station.lon))) {
                groups[station.name_ru].points.push({ lat: Number(station.lat), lon: Number(station.lon) });
            }
        });

        return Object.values(groups)
            .map((group) => {
                if (group.points.length === 0) {
                    return { ...group, lat: null, lon: null };
                }

                const sum = group.points.reduce(
                    (acc, point) => ({ lat: acc.lat + point.lat, lon: acc.lon + point.lon }),
                    { lat: 0, lon: 0 }
                );

                return {
                    ...group,
                    lat: sum.lat / group.points.length,
                    lon: sum.lon / group.points.length
                };
            })
            .sort((a, b) => a.name_ru.localeCompare(b.name_ru));
    }, [stations]);

    const filteredStations = useMemo(() => {
        if (!searchQuery) return groupedStations;
        const lower = searchQuery.toLowerCase();
        return groupedStations.filter((station) => station.name_ru.toLowerCase().includes(lower));
    }, [groupedStations, searchQuery]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="metro-filter-container" ref={containerRef} style={{ zIndex: isOpen ? 90 : 1 }}>
            <div
                className={`filter-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="trigger-text-wrapper">
                    <span className="metro-icon">🚇</span>
                    <span className="placeholder-text">Станции метро</span>
                </div>
                <div className={`chevron ${isOpen ? 'up' : 'down'}`}></div>
            </div>

            {isOpen && (
                <div className="filter-dropdown">
                    <div className="search-box">
                        <div className="search-input-wrapper">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Поиск станции..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="options-list">
                        {filteredStations.length === 0 ? (
                            <div className="no-results">Ничего не найдено</div>
                        ) : (
                            filteredStations.map((station) => (
                                <div key={station.name_ru} className="option-item">
                                    <span className="station-name">{station.name_ru}</span>
                                    {typeof onJumpToStation === 'function' && Number.isFinite(station.lat) && Number.isFinite(station.lon) && (
                                        <button
                                            className="jump-btn"
                                            type="button"
                                            onClick={() => {
                                                onJumpToStation({
                                                    name_ru: station.name_ru,
                                                    lat: station.lat,
                                                    lon: station.lon
                                                });
                                                setIsOpen(false);
                                            }}
                                        >
                                            Перейти
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .metro-filter-container {
                    position: relative;
                    margin: 0 16px 16px;
                    width: 300px;
                    z-index: 1001;
                    font-family: inherit;
                }
                .filter-trigger {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 14px;
                    background: var(--app-surface, #fff);
                    border: 1px solid var(--app-border, #e2e8f0);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    user-select: none;
                    min-height: 44px;
                }
                .filter-trigger:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                }
                .filter-trigger.active {
                    border-color: var(--rs-accent, #2f8f5b);
                    box-shadow: 0 0 0 3px rgba(47, 143, 91, 0.1);
                    background: var(--app-surface, #fff);
                }
                .trigger-text-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    overflow: hidden;
                    flex: 1;
                }
                .metro-icon {
                    font-size: 16px;
                    flex-shrink: 0;
                }
                .placeholder-text {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--app-text, #1e293b);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .chevron {
                    width: 10px;
                    height: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .chevron::before {
                    content: '';
                    width: 6px;
                    height: 6px;
                    border-right: 2px solid #94a3b8;
                    border-bottom: 2px solid #94a3b8;
                    transform: rotate(45deg);
                    transition: all 0.3s ease;
                    margin-top: -2px;
                }
                .filter-trigger.active .chevron::before {
                    transform: rotate(-135deg);
                    margin-top: 4px;
                    border-color: var(--rs-accent, #2f8f5b);
                }
                .filter-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    background: color-mix(in srgb, var(--app-surface, #fff) 96%, transparent);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--app-border, #e2e8f0);
                    border-radius: 16px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                    overflow: hidden;
                    animation: dropdownIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    transform-origin: top center;
                }
                @keyframes dropdownIn {
                    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .search-box {
                    padding: 12px;
                    border-bottom: 1px solid var(--app-border, #f1f5f9);
                }
                .search-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .search-icon {
                    position: absolute;
                    left: 10px;
                    font-size: 14px;
                    color: #94a3b8;
                }
                .search-box input {
                    width: 100%;
                    padding: 9px 12px 9px 34px;
                    border: 1px solid var(--app-border, #e2e8f0);
                    border-radius: 10px;
                    font-size: 14px;
                    outline: none;
                    background: var(--app-surface-2, #f8fafc);
                    transition: all 0.2s ease;
                }
                .search-box input:focus {
                    border-color: var(--rs-accent, #2f8f5b);
                    background: var(--app-surface, #fff);
                    box-shadow: 0 0 0 3px rgba(47, 143, 91, 0.08);
                }
                .options-list {
                    max-height: 320px;
                    overflow-y: auto;
                    padding: 6px;
                }
                .options-list::-webkit-scrollbar {
                    width: 6px;
                }
                .options-list::-webkit-scrollbar-thumb {
                    background: var(--app-border, #e2e8f0);
                    border-radius: 10px;
                }
                .option-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border-radius: 10px;
                    transition: all 0.15s ease;
                    margin-bottom: 2px;
                }
                .option-item:hover {
                    background: var(--app-surface-2, #f1f5f9);
                }
                .station-name {
                    font-size: 14px;
                    color: var(--app-muted, #475569);
                    font-weight: 500;
                    flex: 1;
                }
                .jump-btn {
                    border: 1px solid var(--app-border, #cbd5e1);
                    background: var(--app-surface, #fff);
                    color: var(--app-text, #334155);
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .jump-btn:hover {
                    border-color: var(--rs-accent, #2f8f5b);
                    color: var(--rs-accent, #2f8f5b);
                    background: rgba(47, 143, 91, 0.06);
                }
                .no-results {
                    padding: 30px 20px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 14px;
                    font-style: italic;
                }
            `}</style>
        </div>
    );
}
