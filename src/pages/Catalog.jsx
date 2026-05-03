// Catalog page showing the full list of restaurants with lightweight filters.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useMeta } from '@/lib/useMeta'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { api } from '../api/client.js'
import CuisineFilter from '../components/CuisineFilter.jsx'
import { useSWRLite } from '../hooks/useSWRLite.js'
import { useFavoriteRestaurantsStore } from '@/store/favoriteRestaurants'
import { useAuth } from '@/store/auth'
import { analytics } from '@/services/analytics'
import { getRussianPluralWord } from '@/lib/text'
import { getLandingStats } from '@/lib/api'

// Fetch a large number to emulate "all" items since backend pagination seems flaky
const FETCH_LIMIT = 1000;
const PAGE_SIZE = 8;

const CuisineIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 3v8" />
    <path d="M5 3v8" />
    <path d="M9 3v8" />
    <path d="M5 11h4" />
    <path d="M7 11v10" />
    <path d="M16 3v18" />
    <path d="M16 3c2.4 1.5 3.6 3.4 3.6 5.8 0 2.5-1.2 4.1-3.6 4.9" />
  </svg>
)

const MetroIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 19 11 5c.4-.8 1.6-.8 2 0l7 14" />
    <path d="M8.2 14h7.6" />
    <path d="M10.1 10h3.8" />
  </svg>
)

const RestaurantWebIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9.25" />
    <path d="M3 12h18" />
    <path d="M12 2.75c2.35 2.55 3.55 5.63 3.55 9.25s-1.2 6.7-3.55 9.25" />
    <path d="M12 2.75C9.65 5.3 8.45 8.38 8.45 12s1.2 6.7 3.55 9.25" />
    <path d="M5.35 6.05c1.72.83 3.93 1.25 6.65 1.25s4.93-.42 6.65-1.25" />
    <path d="M5.35 17.95c1.72-.83 3.93-1.25 6.65-1.25s4.93.42 6.65 1.25" />
  </svg>
)

const WeeklyAddedIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 3v3" />
    <path d="M17 3v3" />
    <path d="M5 9h14" />
    <path d="M6.6 5h10.8c1.1 0 2 .9 2 2v10.8c0 1.1-.9 2-2 2H6.6c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2Z" />
    <path d="M12 12v5" />
    <path d="M9.5 14.5h5" />
  </svg>
)

const normalizeInstagramUrl = (rawUrl) => {
  if (!rawUrl) return null
  const text = String(rawUrl).trim()
  if (!text || text === '-' || text === '—') return null
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, '')}`

  try {
    const parsed = new URL(withProtocol)
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    if (!host.endsWith('instagram.com')) return null
    return parsed.toString()
  } catch (_) {
    return null
  }
}

export default function Catalog() {
  useMeta({
    title: 'Каталог ресторанов с КБЖУ — RestaurantSecret',
    description: 'Все рестораны Москвы с полным меню и данными КБЖУ. Фильтрация по кухне, метро и целям питания.',
    canonical: 'https://restaurantsecret.ru/catalog',
  })

  const { data: filters } = useSWRLite('filters', () => api.filters())
  const { data: landingStats } = useSWRLite('landing-stats', () => getLandingStats())
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [selectedMetro, setSelectedMetro] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const navigate = useNavigate()
  const { access, requireAccess, requestPaywall } = useOutletContext() || {}

  const accessToken = useAuth((state) => state.accessToken);
  const { isFavorite, toggleFavorite, loadFavorites } = useFavoriteRestaurantsStore((state) => ({
    isFavorite: state.isFavorite,
    toggleFavorite: state.toggle,
    loadFavorites: state.load,
  }));

  useEffect(() => {
    if (accessToken) {
      loadFavorites(accessToken);
    }
  }, [accessToken, loadFavorites]);

  const handleToggleFavorite = useCallback(async (e, slug, name) => {
    e.stopPropagation();
    if (!accessToken) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    const currentlyFavorite = isFavorite(slug)
    if (!currentlyFavorite) {
      analytics.track("favorite_add", { type: "restaurant", slug, name: name || slug })
    } else {
      analytics.track("favorite_remove", { type: "restaurant", slug, name: name || slug })
    }
    await toggleFavorite(accessToken, slug);
  }, [accessToken, isFavorite, navigate, toggleFavorite]);

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
    const metro = selectedMetro.trim().toLowerCase()

    return allItems.filter((item) => {
      const name = item?.name?.toLowerCase() || ''
      const cuisine = item?.cuisine?.toLowerCase() || ''
      const matchesQuery = !normalizedQuery || name.includes(normalizedQuery)

      // Split cuisines by comma and check if any selected cuisine is in the list
      let matchesCuisine = !cuisines.length
      if (cuisines.length && cuisine) {
        const itemCuisines = cuisine.split(',').map(c => c.trim())
        matchesCuisine = cuisines.some(selectedCuisine =>
          itemCuisines.some(itemCuisine => itemCuisine.includes(selectedCuisine))
        )
      }

      const itemMetroCandidate = [
        item?.metro,
        item?.metro_name,
        item?.metroName,
        item?.metro_station,
        item?.metroStation,
      ].find(Boolean)
      const itemMetro = String(itemMetroCandidate || '').toLowerCase()
      const matchesMetro = !metro || itemMetro === metro

      return matchesQuery && matchesCuisine && matchesMetro
    })
  }, [debouncedQuery, allItems, selectedCuisines, selectedMetro])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedQuery, selectedCuisines, selectedMetro])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))

  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredItems.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredItems])

  const isInitialLoading = loading && !allItems.length

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  // Options are memoized so the filter chips do not re-render unnecessarily.
  const cuisineOptions = useMemo(() => {
    const raw = filters?.cuisines ?? []
    return Array.from(new Set(raw.map(c => {
      let val = String(c).trim()
      if (val.toLowerCase() === 'nan') return 'Другое'
      return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
    }))).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [filters?.cuisines])

  const metroOptions = useMemo(() => {
    const values = allItems
      .map((item) => item?.metro || item?.metro_name || item?.metroName || item?.metro_station || item?.metroStation)
      .filter(Boolean)
      .map((name) => String(name).trim())
      .filter(Boolean)
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [allItems])

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
    const trimmed = String(name || '').trim()
    const numeric = trimmed.match(/^(\d+\s*(?:см|cm|°)?)/i)
    if (numeric) return numeric[1].replace(/\s+/g, '').toUpperCase()

    const firstWord = trimmed.split(/\s+/).find(Boolean) || ''
    if (/^[A-Za-zА-Яа-яЁё]{2,4}$/.test(firstWord)) return firstWord.toUpperCase()

    return trimmed
      .split(' ')
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'RS'
  }, [])

  const getBadgeClassName = useCallback((name) => {
    const label = getInitials(name)
    return [
      'catalog-card__badge',
      label.length >= 4 ? 'catalog-card__badge--long' : '',
      label.length >= 5 ? 'catalog-card__badge--xlong' : '',
    ].filter(Boolean).join(' ')
  }, [getInitials])

  const getMetroName = useCallback((restaurant) => {
    return [
      restaurant?.metro,
      restaurant?.metro_name,
      restaurant?.metroName,
      restaurant?.metro_station,
      restaurant?.metroStation,
    ].find(Boolean) || ''
  }, [])

  const shownFrom = filteredItems.length ? ((currentPage - 1) * PAGE_SIZE) + 1 : 0
  const shownTo = Math.min(currentPage * PAGE_SIZE, filteredItems.length)
  const totalRestaurantCount = allItems.length || Number(rawData?.total ?? rawData?.count ?? 0)
  const weeklyAdded = Number(landingStats?.weeklyAdded ?? 0)

  const handleSubmit = useCallback((event) => {
    event.preventDefault()
    setDebouncedQuery(query.trim())
    setCurrentPage(1)
  }, [query])

  return (
    <div className="catalog-page">
      <header className="catalog-heading">
        <div>
          <h1 className="catalog-heading__title">Рестораны</h1>
        </div>
        <div className="catalog-heading__metrics">
          <div className="catalog-heading__stat" aria-label={`${totalRestaurantCount} ресторанов`}>
            <div className="catalog-heading__stat-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M5 20h14" />
                <path d="M7 20V9.8c0-.9.7-1.6 1.6-1.6h6.8c.9 0 1.6.7 1.6 1.6V20" />
                <path d="M9.2 8.2a2.8 2.8 0 0 1 5.6 0" />
                <path d="M10 12h4" />
                <path d="M10 15h4" />
                <path d="M12 4.5V3" />
              </svg>
            </div>
            <div>
              <strong>{totalRestaurantCount.toLocaleString('ru-RU')}</strong>
              <span>{getRussianPluralWord(totalRestaurantCount, 'ресторан', 'ресторана', 'ресторанов')}</span>
            </div>
          </div>
          {weeklyAdded > 0 && (
            <div className="catalog-heading__weekly" aria-label={`Добавлено на этой неделе: ${weeklyAdded}`}>
              <div className="catalog-heading__stat-icon catalog-heading__stat-icon--weekly" aria-hidden="true">
                <WeeklyAddedIcon />
              </div>
              <div>
                <strong>+{weeklyAdded.toLocaleString('ru-RU')}</strong>
                <span>добавлено на этой неделе</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="catalog-hero" aria-label="Поиск и фильтры ресторанов">
        <div className="catalog-hero__inner">
          <form className="catalog-search" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="restaurant-search">Поиск по ресторанам</label>
            <div className="catalog-search__field">
              <svg className="catalog-search__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.2 16.2 4.1 4.1" />
              </svg>
              <input
                id="restaurant-search"
                className="catalog-search__input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Найти ресторан"
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
            <button
              type="button"
              className="catalog-search__filter-btn"
              aria-label="Фильтры ресторанов"
              onClick={() => document.querySelector('.catalog-filter')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M3 6h10M17 6h4M9 6a2 2 0 1 0 0 0ZM3 12h4M11 12h10M15 12a2 2 0 1 0 0 0ZM3 18h10M17 18h4M9 18a2 2 0 1 0 0 0Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="catalog-filter-row">
              <div className="catalog-filter">
                <div className="catalog-filter__label">Кухня</div>
                <div className="catalog-filter__control">
                  <CuisineFilter
                    cuisines={cuisineOptions}
                    selectedCuisines={selectedCuisines}
                    onChange={setSelectedCuisines}
                  />
                </div>
              </div>
              <div className="catalog-filter">
                <div className="catalog-filter__label">Метро</div>
                <div className="catalog-filter__select-wrap">
                  <select
                    className="catalog-metro-select"
                    value={selectedMetro}
                    onChange={(e) => setSelectedMetro(e.target.value)}
                    disabled={!metroOptions.length}
                  >
                    <option value="">Любое</option>
                    {metroOptions.map((metroName) => (
                      <option key={metroName} value={metroName.toLowerCase()}>
                        {metroName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      {weeklyAdded > 0 && (
        <div className="catalog-mobile-weekly" aria-label={`Добавлено на этой неделе: ${weeklyAdded}`}>
          <strong>+{weeklyAdded.toLocaleString('ru-RU')}</strong>
          <span>добавлено на этой неделе</span>
        </div>
      )}

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
            const instagramUrl = normalizeInstagramUrl(r.instagramUrl)
            const dishesCount = typeof r?.dishesCount === 'number'
              ? r.dishesCount
              : allDishes.length
            const badgeText = getInitials(r?.name)
            return (
              <li key={`${r.slug || r.name}-${i}`} className="catalog-card" role="group" aria-label={r?.name ?? 'Ресторан'}>
                <div className="catalog-card__top">
                  <div className="catalog-card__identity">
                    <div className={`${getBadgeClassName(r?.name)} catalog-card__badge--tone-${i % 4}`} aria-hidden="true">{badgeText}</div>
                    <div className="catalog-card__copy">
                      <h3 className="catalog-card__title">{r.name}</h3>
                      <div className="catalog-card__meta">
                        {r?.cuisine && (
                          <span className="catalog-card__meta-item">
                            <CuisineIcon />
                            {r.cuisine}
                          </span>
                        )}
                        {getMetroName(r) && (
                          <span className="catalog-card__meta-item">
                            <MetroIcon />
                            {getMetroName(r)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="catalog-card__top-actions">
                    {instagramUrl && (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Ссылка ресторана"
                        title="Ссылка ресторана"
                        className="catalog-card__icon-btn catalog-card__icon-btn--web"
                      >
                        <RestaurantWebIcon />
                      </a>
                    )}
                    <button
                      type="button"
                      className={`catalog-card__icon-btn catalog-card__fav-btn ${isFavorite(r.slug) ? 'is-active' : ''}`}
                      onClick={(e) => handleToggleFavorite(e, r.slug, r.name)}
                      aria-label={isFavorite(r.slug) ? "Удалить из избранного" : "Добавить в избранное"}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z"
                          fill={isFavorite(r.slug) ? "#E11D48" : "none"}
                          stroke={isFavorite(r.slug) ? "#E11D48" : "currentColor"}
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="catalog-card__bottom">
                  <div className="catalog-card__label">
                    Блюда в меню: {dishesCount} {getRussianPluralWord(dishesCount, 'блюдо', 'блюда', 'блюд')}
                  </div>
                  <button type="button" className="btn btn--primary" onClick={() => openMenu(r.slug)}>Открыть меню</button>
                </div>
              </li>
            )
          })}
        </ul>

        {!isInitialLoading && filteredItems.length > 0 && (
          <nav className="catalog-pagination" aria-label="Навигация по ресторанам">
            <button
              type="button"
              className="catalog-pagination__button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              aria-label="Предыдущая страница"
            >
              ‹
            </button>
            <span className="catalog-pagination__text">
              Показано {shownFrom}–{shownTo} из {filteredItems.length} {getRussianPluralWord(filteredItems.length, 'ресторан', 'ресторана', 'ресторанов')}
            </span>
            <button
              type="button"
              className="catalog-pagination__button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              aria-label="Следующая страница"
            >
              ›
            </button>
          </nav>
        )}
      </section>
    </div>
  )
}
