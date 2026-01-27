import { useState, useMemo, useRef, useEffect } from 'react';

export default function CuisineFilter({ cuisines = [], selectedCuisines = [], onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);

    // Filter cuisines based on search
    const filteredCuisines = useMemo(() => {
        if (!searchQuery) return cuisines;
        const lower = searchQuery.toLowerCase();
        return cuisines.filter(c => c.toLowerCase().includes(lower));
    }, [cuisines, searchQuery]);

    // Handle selection toggle
    const toggleCuisine = (c) => {
        const nextSelected = selectedCuisines.includes(c)
            ? selectedCuisines.filter(i => i !== c)
            : [...selectedCuisines, c];
        onChange(nextSelected);
    };

    const clearAll = (e) => {
        e.stopPropagation();
        onChange([]);
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

    const selectedCount = selectedCuisines.length;
    let triggerText = "Любая кухня";
    if (selectedCount === 1) {
        triggerText = selectedCuisines[0];
    } else if (selectedCount > 1) {
        triggerText = `Выбрано: ${selectedCount}`;
    }

    return (
        <div className="cuisine-filter-container" ref={containerRef}>
            <div
                className={`cuisine-filter-trigger ${isOpen ? 'is-active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="cuisine-filter-trigger__content">
                    {/* Optionally add an icon here if needed */}
                    <span className="cuisine-filter-trigger__text">{triggerText}</span>
                </div>
                <div className="cuisine-filter-trigger__actions">
                    {selectedCount > 0 && (
                        <button
                            className="cuisine-filter-trigger__clear"
                            onClick={clearAll}
                            aria-label="Очистить выбор"
                        >
                            ×
                        </button>
                    )}
                    <div className={`cuisine-filter-trigger__chevron ${isOpen ? 'is-up' : ''}`}></div>
                </div>
            </div>

            {isOpen && (
                <div className="cuisine-filter-dropdown">
                    <div className="cuisine-filter-dropdown__search">
                        <input
                            type="text"
                            placeholder="Поиск кухни..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="cuisine-filter-dropdown__options">
                        {filteredCuisines.length === 0 ? (
                            <div className="cuisine-filter-dropdown__no-results">Ничего не нашли</div>
                        ) : (
                            filteredCuisines.map(c => {
                                const isSelected = selectedCuisines.includes(c);
                                return (
                                    <div
                                        key={c}
                                        className={`cuisine-filter-dropdown__option ${isSelected ? 'is-selected' : ''}`}
                                        onClick={() => toggleCuisine(c)}
                                    >
                                        <div className="cuisine-filter-dropdown__checkbox">
                                            {isSelected && <span>✓</span>}
                                        </div>
                                        <span className="cuisine-filter-dropdown__label">{c}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
