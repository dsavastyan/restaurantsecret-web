// Catalog page showing the full list of restaurants with lightweight filters.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { api } from '../api/client.js'
import CuisineFilter from '../components/CuisineFilter.jsx'
import { useSWRLite } from '../hooks/useSWRLite.js'

// Fetch a large number to emulate "all" items since backend pagination seems flaky
const FETCH_LIMIT = 1000;
const VISIBLE_CHUNK_SIZE = 20;

export default function Catalog() {
  const { data: filters } = useSWRLite('filters', () => api.filters())
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Client-side pagination state
  const [visibleCount, setVisibleCount] = useState(VISIBLE_CHUNK_SIZE)

  const navigate = useNavigate()
  const { access, requireAccess, requestPaywall } = useOutletContext() || {}

  // Infinite scroll observer target
  const loaderRef = useRef(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 280)

    return () => clearTimeout(handle)
  }, [query])

  // Ask the parent layout for access; show the paywall if the user is not
  // subscribed yet.
  const ensureAccess = useCallback(() => {
    if (requireAccess) {
      return requireAccess()
    }
    if (access?.isActive) return true
    if (requestPaywall) requestPaywall()
    return false
  }, [access?.isActive, requireAccess, requestPaywall])

  // Same for direct menu navigation.
  const openMenu = useCallback((slug) => {
    if (!slug) return
    if (ensureAccess()) {
      navigate(`/r/${slug}/menu`)
    }
  }, [ensureAccess, navigate])

  // Fetch ALL restaurants once (or as many as limit allows)
  // We remove 'query' from here because we want to filter locally to ensure search works reliably
  // We remove 'page' because we want to fetch everything upfront
  const { data: rawData, loading, error } = useSWRLite(
    'restaurants-all',
    () => api.restaurants({
      limit: FETCH_LIMIT,
    })
  )

  // Normalize data
  const allItems = useMemo(() => {
    if (!rawData) return []
    // Handle { items: [...] } or [...]
    const list = Array.isArray(rawData?.items) ? rawData.items : (Array.isArray(rawData) ? rawData : [])
    const seen = new Set()
    return list.map(item => {
      // Normalize cuisine field for display consistency
      let cuisine = item.cuisine;
      if (cuisine) {
        const parts = String(cuisine).split(',').map(s => s.trim()).filter(Boolean);
        const normalized = Array.from(new Set(parts.map(p => {
          if (p.toLowerCase() === 'nan') return 'Другое';
          return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
        })));
        cuisine = normalized.join(', ');
      }

      const key = item.slug || item.id || item.name
      if (seen.has(key)) return null
      seen.add(key)
      return { ...item, cuisine }
    }).filter(Boolean)
  }, [rawData])

  // Filter items based on SEARCH and CUISINE
  const filteredItems = useMemo(() => {
    if (!allItems.length) return []

    const normalizedQuery = debouncedQuery.toLowerCase()
    const cuisines = selectedCuisines.map((c) => c?.toLowerCase())

    return allItems.filter((item) => {
      const name = item?.name?.toLowerCase() || ''
      const cuisine = item?.cuisine?.toLowerCase() || ''
      const matchesQuery = !normalizedQuery || name.includes(normalizedQuery)
      const matchesCuisine = !cuisines.length || cuisines.includes(cuisine)

      return matchesQuery && matchesCuisine
    })
  }, [debouncedQuery, allItems, selectedCuisines])

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(VISIBLE_CHUNK_SIZE)
  }, [debouncedQuery, selectedCuisines])

  // Slice for display
  const visibleItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount)
  }, [filteredItems, visibleCount])

  const hasMore = visibleCount < filteredItems.length
  const isInitialLoading = loading && !allItems.length

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first.isIntersecting && hasMore) {
        setVisibleCount(prev => prev + VISIBLE_CHUNK_SIZE)
      }
    }, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    })

    const el = loaderRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
    }
  }, [hasMore])


  // Options are memoized so the filter chips do not re-render unnecessarily.
  const cuisineOptions = useMemo(() => {
    const raw = filters?.cuisines ?? []
    return Array.from(new Set(raw.map(c => {
      let val = String(c).trim()
      if (val.toLowerCase() === 'nan') return 'Другое'
      return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
    }))).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [filters?.cuisines])

  const extractDishes = useCallback((restaurant) => {
    const candidates = [
      restaurant?.dishes,
      restaurant?.menu_preview,
      restaurant?.popular_dishes,
      restaurant?.topDishes,
      restaurant?.top_dishes
    ]

    for (const list of candidates) {
      if (Array.isArray(list) && list.length) {
        return list
          .map((item) => typeof item === 'string' ? item : item?.name)
          .filter(Boolean)
      }
    }

    return []
  }, [])

  const getInitials = useCallback((name = '') => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'RS'
  }, [])

  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    // Trigger reset via debounce (already handled) or immediate if needed, 
    // but here we just ensure keyboard dismiss or similar
  }, [])

  return (
    <div className="catalog-page">
      <section className="catalog-hero">
        <div className="catalog-hero__inner">
          <div className="catalog-hero__copy">
            <p className="catalog-hero__eyebrow">Рестораны</p>
            <h1 className="catalog-hero__title">Поиск по названию ресторана</h1>
          </div>

          <form className="catalog-search" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="restaurant-search">Поиск по ресторанам</label>
            <div className="catalog-search__field">
              <input
                id="restaurant-search"
                className="catalog-search__input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Например, Chaikhona, BB&Burgers, Додо"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="catalog-search__clear"
                  onClick={() => setQuery('')}
                  aria-label="Очистить поиск"
                >
                  ×
                </button>
              )}
            </div>
            {/* Submit button is visually there but search is instant */}
            <button type="submit" className="btn btn--primary catalog-search__submit">Искать</button>
          </form>

          <div className="catalog-filters">
            <div className="catalog-filter">
              <div className="catalog-filter__label">Кухня</div>
              <CuisineFilter
                cuisines={cuisineOptions}
                selectedCuisines={selectedCuisines}
                onChange={setSelectedCuisines}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="catalog-results">
        {isInitialLoading && <div className="catalog-state">Загружаем рестораны…</div>}
        {error && <p className="err">Ошибка: {String(error.message || error)}</p>}
        {!loading && !visibleItems.length && !error && (
          <div className="catalog-state catalog-state--empty">
            <div className="catalog-state__badge">Ничего не нашли</div>
            <p className="catalog-state__text">Попробуйте изменить запрос или выбрать другую кухню.</p>
          </div>
        )}

        <ul className="catalog-grid">
          {visibleItems.map((r, i) => {
            const allDishes = extractDishes(r)
            const dishes = allDishes.slice(0, 8)
            const dishesCount = typeof r?.dishesCount === 'number'
              ? r.dishesCount
              : allDishes.length
            return (
              <li key={`${r.slug || r.name}-${i}`} className="catalog-card" role="group" aria-label={r?.name ?? 'Ресторан'}>
                <div className="catalog-card__header">
                  <div className="catalog-card__badge" aria-hidden="true">{getInitials(r?.name)}</div>
                  <div className="catalog-card__title-block">
                    <h3 className="catalog-card__title">{r.name}</h3>
                    {r.cuisine && <div className="catalog-card__cuisine">{r.cuisine}</div>}
                  </div>
                </div>

                <div className="catalog-card__body">
                  <div className="catalog-card__label">Блюда в меню: {dishesCount}</div>
                  {dishesCount === 0 && (
                    <div className="catalog-card__empty">Скоро добавим</div>
                  )}
                  {dishesCount > 0 && dishes.length > 0 && (
                    <ul className="catalog-card__dishes">
                      {dishes.map((dish, idx) => (
                        <li key={`${r.slug || r.name}-dish-${idx}`} className="catalog-card__dish">{dish}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="catalog-card__actions">
                  <button type="button" className="btn btn--primary" onClick={() => openMenu(r.slug)}>Открыть меню</button>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Sentinel for Infinite Scroll */}
        <div ref={loaderRef} className="catalog-loader" style={{ height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 1, visibility: hasMore ? 'visible' : 'hidden' }}>
          {hasMore && <span>Загрузка...</span>}
        </div>
      </section>
    </div>
  )
}
