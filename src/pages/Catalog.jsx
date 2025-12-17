// Catalog page showing the full list of restaurants with lightweight filters.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { api } from '../api/client.js'
import { useSWRLite } from '../hooks/useSWRLite.js'

export default function Catalog() {
  const { data: filters } = useSWRLite('filters', () => api.filters())
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pagesData, setPagesData] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const navigate = useNavigate()
  const { access, requireAccess, requestPaywall } = useOutletContext() || {}

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

  const { data, loading, error } = useSWRLite(
    `restaurants-${page}-${selectedCuisines.join(',')}-${debouncedQuery}`,
    () => api.restaurants({
      limit: 20,
      page,
      cuisine: selectedCuisines,
      query: debouncedQuery || undefined
    })
  )

  const cuisineKey = useMemo(() => selectedCuisines.join('|'), [selectedCuisines])

  useEffect(() => {
    setPagesData([])
    setHasMore(false)
  }, [debouncedQuery, cuisineKey])

  useEffect(() => {
    if (!data?.items) return

    setPagesData(prev => {
      const next = [...prev]
      next[page - 1] = data.items
      return next
    })
    setHasMore(Boolean(data?.has_more))
  }, [data, page])

  const items = useMemo(() => pagesData.flat().filter(Boolean), [pagesData])
  const isInitialLoading = loading && !items.length
  const visibleItems = useMemo(() => {
    if (!items.length) return []

    const normalizedQuery = debouncedQuery.toLowerCase()
    const cuisines = selectedCuisines.map((c) => c?.toLowerCase())

    return items.filter((item) => {
      const name = item?.name?.toLowerCase() || ''
      const cuisine = item?.cuisine?.toLowerCase() || ''
      const matchesQuery = !normalizedQuery || name.includes(normalizedQuery)
      const matchesCuisine = !cuisines.length || cuisines.includes(cuisine)

      return matchesQuery && matchesCuisine
    })
  }, [debouncedQuery, items, selectedCuisines])

  // Options are memoized so the filter chips do not re-render unnecessarily.
  const cuisineOptions = useMemo(() => filters?.cuisines ?? [], [filters?.cuisines])

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
    setPage(1)
    setDebouncedQuery(query.trim())
  }, [query])

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
                onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                placeholder="Например, Chaikhona, BB&Burgers, Додо"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  className="catalog-search__clear"
                  onClick={() => { setQuery(''); setPage(1) }}
                  aria-label="Очистить поиск"
                >
                  ×
                </button>
              )}
            </div>
            <button type="submit" className="btn btn--primary catalog-search__submit">Искать</button>
          </form>

          <div className="catalog-filters">
            <div className="catalog-filter">
              <div className="catalog-filter__label">Кухня</div>
              <div className="catalog-filter__chips">
                <button
                  type="button"
                  className={`pill-chip${selectedCuisines.length === 0 ? ' is-active' : ''}`}
                  onClick={() => { setSelectedCuisines([]); setPage(1) }}
                >
                  Все кухни
                </button>
                {cuisineOptions.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`pill-chip${selectedCuisines.includes(c) ? ' is-active' : ''}`}
                    onClick={() => {
                      setPage(1)
                      setSelectedCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
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
          {visibleItems.map(r => {
            const allDishes = extractDishes(r)
            const dishes = allDishes.slice(0, 8)
            const dishesCount = typeof r?.dishesCount === 'number'
              ? r.dishesCount
              : allDishes.length
            return (
              <li key={r.slug || r.name} className="catalog-card" role="group" aria-label={r?.name ?? 'Ресторан'}>
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

        {hasMore && (
          <div className="catalog-actions">
            <button onClick={() => setPage(p => p + 1)} className="btn btn--primary">Загрузить ещё</button>
          </div>
        )}
      </section>
    </div>
  )
}
