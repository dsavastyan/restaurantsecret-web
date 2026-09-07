import { useState, useRef, useEffect } from 'react';

// Single-choice city filter for the map: several metro station names repeat across
// cities (Автозаводская: Moscow/Minsk/Nizhny Novgorod), so the metro picker needs to
// know which one city it's listing stations for. Defaults to Москва and always has
// exactly one selection - there's no "clear" state, unlike the multi-select cuisine
// and metro filters next to it.
export default function MapCityFilter({ cities = [], selectedCity, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

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
        <div className="city-filter-container" ref={containerRef} style={{ zIndex: isOpen ? 90 : 1 }}>
            <div
                className={`filter-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="trigger-text-wrapper">
                    <span className="city-icon">📍</span>
                    <span className="placeholder-text">{selectedCity}</span>
                </div>
                <div className={`chevron ${isOpen ? 'up' : 'down'}`}></div>
            </div>

            {isOpen && (
                <div className="filter-dropdown">
                    <div className="options-list">
                        {cities.map((city) => (
                            <div
                                key={city}
                                className={`option-item ${city === selectedCity ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(city);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="city-name">{city}</span>
                                {city === selectedCity && <span className="check">✓</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .city-filter-container {
                    position: relative;
                    margin: 0 16px 16px;
                    width: 180px;
                    z-index: 1001;
                    font-family: inherit;
                }
                .city-filter-container .filter-trigger {
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
                .city-filter-container .filter-trigger:hover {
                    border-color: #cbd5e1;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                }
                .city-filter-container .filter-trigger.active {
                    border-color: var(--rs-accent, #2f8f5b);
                    box-shadow: 0 0 0 3px rgba(47, 143, 91, 0.1);
                }
                .city-filter-container .trigger-text-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    overflow: hidden;
                    flex: 1;
                }
                .city-filter-container .city-icon {
                    font-size: 16px;
                    flex-shrink: 0;
                }
                .city-filter-container .placeholder-text {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--app-text, #1e293b);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .city-filter-container .chevron {
                    width: 10px;
                    height: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .city-filter-container .chevron::before {
                    content: '';
                    width: 6px;
                    height: 6px;
                    border-right: 2px solid #94a3b8;
                    border-bottom: 2px solid #94a3b8;
                    transform: rotate(45deg);
                    transition: all 0.3s ease;
                    margin-top: -2px;
                }
                .city-filter-container .filter-trigger.active .chevron::before {
                    transform: rotate(-135deg);
                    margin-top: 4px;
                    border-color: var(--rs-accent, #2f8f5b);
                }
                .city-filter-container .filter-dropdown {
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
                .city-filter-container .options-list {
                    max-height: 320px;
                    overflow-y: auto;
                    padding: 6px;
                }
                .city-filter-container .option-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    cursor: pointer;
                    border-radius: 10px;
                    transition: all 0.15s ease;
                    margin-bottom: 2px;
                }
                .city-filter-container .option-item:hover {
                    background: var(--app-surface-2, #f1f5f9);
                }
                .city-filter-container .option-item.selected {
                    background: rgba(47, 143, 91, 0.08);
                }
                .city-filter-container .city-name {
                    font-size: 14px;
                    color: var(--app-muted, #475569);
                    font-weight: 500;
                }
                .city-filter-container .option-item.selected .city-name {
                    color: var(--app-text, #0f172a);
                    font-weight: 700;
                }
                .city-filter-container .check {
                    color: var(--rs-accent, #2f8f5b);
                    font-size: 13px;
                    font-weight: bold;
                }
            `}</style>
        </div>
    );
}
