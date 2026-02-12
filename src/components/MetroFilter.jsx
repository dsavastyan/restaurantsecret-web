import { useState, useMemo, useRef, useEffect } from 'react';

export default function MetroFilter({ metroData, selectedStationIds = [], onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);

    const stations = metroData.stations || [];

    // Group stations by name to avoid duplicates (different lines)
    const groupedStations = useMemo(() => {
        const groups = {};
        stations.forEach(s => {
            if (!groups[s.name_ru]) {
                groups[s.name_ru] = {
                    name_ru: s.name_ru,
                    ids: []
                };
            }
            groups[s.name_ru].ids.push(s.id);
        });
        return Object.values(groups).sort((a, b) => a.name_ru.localeCompare(b.name_ru));
    }, [stations]);

    // Filter stations based on search
    const filteredStations = useMemo(() => {
        if (!searchQuery) return groupedStations;
        const lower = searchQuery.toLowerCase();
        return groupedStations.filter(s => s.name_ru.toLowerCase().includes(lower));
    }, [groupedStations, searchQuery]);

    // Handle selection toggle
    const toggleStation = (ids) => {
        const allSelected = ids.every(id => selectedStationIds.includes(id));

        let nextIds;
        if (allSelected) {
            // Deselect all ids for this station name
            nextIds = selectedStationIds.filter(id => !ids.includes(id));
        } else {
            // Select all ids for this station name
            const newIds = ids.filter(id => !selectedStationIds.includes(id));
            nextIds = [...selectedStationIds, ...newIds];
        }

        onChange({ stationIds: nextIds });
    };

    const clearAll = (e) => {
        e.stopPropagation();
        onChange({ stationIds: [] });
    };

    const selectAll = (e) => {
        e.stopPropagation();
        const allIds = groupedStations.flatMap((group) => group.ids);
        const uniqueIds = Array.from(new Set(allIds));
        onChange({ stationIds: uniqueIds });
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate selected count based on unique station names
    const selectedCount = groupedStations.filter(g =>
        g.ids.length > 0 && g.ids.every(id => selectedStationIds.includes(id))
    ).length;
    const allSelected = groupedStations.length > 0 && selectedCount === groupedStations.length;

    const toggleAll = (e) => {
        if (allSelected) {
            clearAll(e);
            return;
        }
        selectAll(e);
    };

    const triggerText = selectedCount > 0
        ? `Выбрано: ${selectedCount}`
        : "Выберите станции метро";

    return (
        <div className="metro-filter-container" ref={containerRef} style={{ zIndex: isOpen ? 1100 : 1001 }}>
            <div
                className={`filter-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="trigger-text-wrapper">
                    <span className="metro-icon">🚇</span>
                    <span className="placeholder-text">{triggerText}</span>
                </div>
                <div className="trigger-actions">
                    {selectedCount > 0 && (
                        <button className="mini-clear" onClick={clearAll} title="Очистить всё">✕</button>
                    )}
                    <div className={`chevron ${isOpen ? 'up' : 'down'}`}></div>
                </div>
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
                        <button className="toggle-all-btn" onClick={toggleAll}>
                            {allSelected ? 'Снять все' : 'Выбрать все'}
                        </button>
                    </div>

                    <div className="options-list">
                        {filteredStations.length === 0 ? (
                            <div className="no-results">Ничего не найдено</div>
                        ) : (
                            filteredStations.map(group => {
                                const isSelected = group.ids.length > 0 && group.ids.every(id => selectedStationIds.includes(id));
                                return (
                                    <div
                                        key={group.name_ru}
                                        className={`option-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleStation(group.ids)}
                                    >
                                        <div className="checkbox">
                                            {isSelected && <span className="check">✓</span>}
                                        </div>
                                        <span className="station-name">{group.name_ru}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {selectedCount > 0 && (
                        <div className="filter-footer">
                            <button className="clear-link" onClick={clearAll}>Сбросить выбор</button>
                        </div>
                    )}
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
                    background: #fff;
                    border: 1px solid #e2e8f0;
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
                    background: #fff;
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
                    color: #1e293b;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .trigger-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-left: 8px;
                }
                .mini-clear {
                    background: #f1f5f9;
                    border: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .mini-clear:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                    transform: scale(1.1);
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
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(10px);
                    border: 1px solid #e2e8f0;
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
                    border-bottom: 1px solid #f1f5f9;
                }
                .toggle-all-btn {
                    margin-top: 10px;
                    width: 100%;
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    background: #fff;
                    color: #334155;
                    font-size: 13px;
                    font-weight: 600;
                    padding: 9px 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .toggle-all-btn:hover {
                    border-color: var(--rs-accent, #2f8f5b);
                    color: var(--rs-accent, #2f8f5b);
                    background: #f8fafc;
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
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 14px;
                    outline: none;
                    background: #f8fafc;
                    transition: all 0.2s ease;
                }
                .search-box input:focus {
                    border-color: var(--rs-accent, #2f8f5b);
                    background: #fff;
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
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .option-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    cursor: pointer;
                    border-radius: 10px;
                    transition: all 0.15s ease;
                    margin-bottom: 2px;
                }
                .option-item:hover {
                    background: #f1f5f9;
                }
                .option-item.selected {
                    background: rgba(47, 143, 91, 0.08);
                }
                .checkbox {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #cbd5e1;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #fff;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0;
                }
                .option-item.selected .checkbox {
                    background: var(--rs-accent, #2f8f5b);
                    border-color: var(--rs-accent, #2f8f5b);
                    transform: scale(1.05);
                }
                .check {
                    color: #fff;
                    font-size: 12px;
                    font-weight: bold;
                }
                .station-name {
                    font-size: 14px;
                    color: #475569;
                    font-weight: 500;
                }
                .option-item.selected .station-name {
                    color: #0f172a;
                    font-weight: 700;
                }
                .no-results {
                    padding: 30px 20px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 14px;
                    font-style: italic;
                }
                .filter-footer {
                    padding: 12px;
                    border-top: 1px solid #f1f5f9;
                    background: #f8fafc;
                    display: flex;
                    justify-content: center;
                }
                .clear-link {
                    background: none;
                    border: none;
                    color: #64748b;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 6px 12px;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    width: 100%;
                }
                .clear-link:hover {
                    background: #f1f5f9;
                    color: #1e293b;
                }
            `}</style>
        </div>
    );
}
