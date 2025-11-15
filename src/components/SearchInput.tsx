import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  searchSuggest,
  type SearchSuggestionDish,
  type SearchSuggestionRestaurant,
  type SearchSuggestions,
} from "@/lib/api";

export type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, onChange }: SearchInputProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions(null);
      setIsOpen(false);
      setHighlightedIndex(null);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const resp = await searchSuggest(q);
        if (cancelled) return;
        setSuggestions(resp);
        setIsOpen(true);
        setHighlightedIndex(null);
      } catch (error) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error("Не удалось получить подсказки", error);
        }
        if (!cancelled) {
          setSuggestions(null);
          setIsOpen(false);
          setHighlightedIndex(null);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
      setHighlightedIndex(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  type FlatItem =
    | (SearchSuggestionRestaurant & { kind: "restaurant" })
    | (SearchSuggestionDish & { kind: "dish" });

  const flatItems = useMemo<FlatItem[]>(() => {
    if (!suggestions) return [];
    return [
      ...suggestions.restaurants.map((item) => ({
        ...item,
        kind: "restaurant" as const,
      })),
      ...suggestions.dishes.map((item) => ({
        ...item,
        kind: "dish" as const,
      })),
    ];
  }, [suggestions]);

  const restaurantCount = suggestions?.restaurants.length ?? 0;

  const handleSelect = (item: FlatItem) => {
    setIsOpen(false);
    setSuggestions(null);
    setHighlightedIndex(null);

    if (item.kind === "restaurant") {
      navigate(`/r/${item.slug}`);
      return;
    }

    navigate(`/r/${item.restaurantSlug}/menu`);
  };

  const hasHighlightedSuggestion = isOpen && highlightedIndex !== null;
  const activeItem = hasHighlightedSuggestion
    ? flatItems[highlightedIndex!]
    : null;
  const activeDescendant = activeItem
    ? `search-suggestion-${activeItem.kind}-${activeItem.id}`
    : undefined;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!flatItems.length) {
      if (e.key === "Enter") {
        navigate(`/catalog?query=${encodeURIComponent(value.trim())}`);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((current) =>
        current === null ? 0 : Math.min(current + 1, flatItems.length - 1)
      );
      setIsOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((current) =>
        current === null ? flatItems.length - 1 : Math.max(current - 1, 0)
      );
      setIsOpen(true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex === null) {
        navigate(`/catalog?query=${encodeURIComponent(value.trim())}`);
      } else {
        const selected = flatItems[highlightedIndex];
        if (selected) {
          handleSelect(selected);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(null);
    }
  };

  return (
    <div className="search-input" ref={containerRef}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions && (suggestions.restaurants.length || suggestions.dishes.length)) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className="search-input__control"
        placeholder="Найти ресторан или блюдо"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-activedescendant={activeDescendant}
      />

      {isOpen && suggestions && (
        <div className="search-input__dropdown" role="listbox">
          {suggestions.restaurants.length > 0 && (
            <div className="search-input__group">
              <div className="search-input__heading">Рестораны</div>
              <ul className="search-input__list">
                {suggestions.restaurants.map((restaurant, idx) => {
                  const flatIndex = idx;
                  const isActive = highlightedIndex === flatIndex;
                  return (
                    <li key={`restaurant-${restaurant.id}`}>
                      <button
                        id={`search-suggestion-restaurant-${restaurant.id}`}
                        type="button"
                        className={`search-input__item${isActive ? " is-active" : ""}`}
                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                        onMouseLeave={() => setHighlightedIndex(null)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                          handleSelect({
                            ...restaurant,
                            kind: "restaurant",
                          })
                        }
                      >
                        <span className="search-input__item-title">{restaurant.name}</span>
                        {restaurant.city && (
                          <span className="search-input__item-subtitle">{restaurant.city}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {suggestions.dishes.length > 0 && (
            <div className="search-input__group">
              <div className="search-input__heading">Блюда</div>
              <ul className="search-input__list">
                {suggestions.dishes.map((dish, idx) => {
                  const flatIndex = restaurantCount + idx;
                  const isActive = highlightedIndex === flatIndex;
                  return (
                    <li key={`dish-${dish.id}`}>
                      <button
                        id={`search-suggestion-dish-${dish.id}`}
                        type="button"
                        className={`search-input__item${isActive ? " is-active" : ""}`}
                        onMouseEnter={() => setHighlightedIndex(flatIndex)}
                        onMouseLeave={() => setHighlightedIndex(null)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() =>
                          handleSelect({
                            ...dish,
                            kind: "dish",
                          })
                        }
                      >
                        <span className="search-input__item-title">{dish.dishName}</span>
                        <span className="search-input__item-subtitle">
                          {dish.restaurantName}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {suggestions.restaurants.length === 0 && suggestions.dishes.length === 0 && (
            <div className="search-input__empty">Ничего не нашли, попробуйте другой запрос</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchInput;
