// Restaurant menu page with filters for macros and calories.
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AttributionControl, CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { apiGet } from '@/lib/requests'
import { flattenMenuDishes, formatNumeric } from '@/lib/nutrition'
import { formatDescription, getRussianPluralWord, matchesSearchQuery } from '@/lib/text'
import { formatMenuCapturedAt } from '@/lib/dates'
import { useAuth } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'
import { MenuOutdatedModal } from '@/components/MenuOutdatedModal'
import DishCard from '@/components/DishCard/DishCard'
import { useDishCardStore } from '@/store/dishCard'
import { useFavoriteRestaurantsStore } from '@/store/favoriteRestaurants'
import { analytics } from '@/services/analytics'
import { toast } from '@/lib/toast'
import { useMeta } from '@/lib/useMeta'

const createDefaultPresets = () => ({ highProtein: false, lowFat: false, lowKcal: false })
const createDefaultRange = () => ({
  kcal: { min: '', max: '' },
  protein: { min: '', max: '' },
  fat: { min: '', max: '' },
  carbs: { min: '', max: '' }
})
const DEFAULT_MAP_CENTER = [55.751244, 37.618423]

const formatPositionCount = (count) => {
  const absCount = Math.abs(count)
  const mod10 = absCount % 10
  const mod100 = absCount % 100

  let suffix = 'позиций'

  if (mod10 === 1 && mod100 !== 11) {
    suffix = 'позиция'
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    suffix = 'позиции'
  }

  return `${count} ${suffix}`
}

const normalizeRestaurantLinkUrl = (rawUrl) => {
  if (!rawUrl) return null
  const text = String(rawUrl).trim()
  if (!text || text === '-' || text === '—') return null
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, '')}`

  try {
    const parsed = new URL(withProtocol)
    if (!/^https?:$/i.test(parsed.protocol) || !parsed.hostname.includes('.')) return null
    return parsed.toString()
  } catch (_) {
    return null
  }
}

export default function Menu() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const accessToken = useAuth((state) => state.accessToken)
  const { fetchStatus } = useSubscriptionStore((state) => ({
    fetchStatus: state.fetchStatus,
  }))
  const open = useDishCardStore((state) => state.open)
  const {
    isFavoriteRestaurant,
    toggleFavoriteRestaurant,
    loadFavoriteRestaurants,
  } = useFavoriteRestaurantsStore((state) => ({
    isFavoriteRestaurant: state.isFavorite(slug),
    toggleFavoriteRestaurant: state.toggle,
    loadFavoriteRestaurants: state.load,
  }))

  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isOutdatedOpen, setIsOutdatedOpen] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [restaurantPoint, setRestaurantPoint] = useState(null)

  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false)
  const [presets, setPresets] = useState(createDefaultPresets)
  const [range, setRange] = useState(createDefaultRange)

  // Reset filters whenever the restaurant slug changes.
  useEffect(() => {
    setQuery('')
    setSelectedCategory('all')
    setIsAdvancedFiltersOpen(false)
    setPresets(createDefaultPresets())
    setRange(createDefaultRange())
  }, [slug])

  // Fetch the menu.
  useEffect(() => {
    let aborted = false

      ; (async () => {
        try {
          await fetchStatus(accessToken)
          setLoading(true)
          setError('')
          const raw = await apiGet(
            `/restaurants/${slug}/menu`,
            accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
          )
          const data = raw?.categories ? raw : { ...(raw || {}), name: raw?.name || slug, categories: [] }
          if (!aborted) {
            const normalizedMenu = normalizeMenu(data)
            setMenu(normalizedMenu)
            analytics.track('restaurant_menu_open', { slug, name: normalizedMenu.name || slug })
          }
        } catch (err) {
          if (!aborted) {
            console.error('Failed to load menu', err)
            setError('Не удалось загрузить меню. Попробуйте обновить страницу позже.')
          }
        } finally {
          if (!aborted) setLoading(false)
        }
      })()

    return () => {
      aborted = true
    }
  }, [accessToken, fetchStatus, slug])

  useEffect(() => {
    setIsMapOpen(false)
  }, [slug])

  useEffect(() => {
    if (accessToken) {
      loadFavoriteRestaurants(accessToken)
    }
  }, [accessToken, loadFavoriteRestaurants])

  useEffect(() => {
    let aborted = false
    setRestaurantPoint(null)

    ; (async () => {
      try {
        const mapData = await apiGet('/restaurants/map')
        if (aborted) return
        const targetSlug = String(slug || '').trim().toLowerCase()
        const points = Array.isArray(mapData?.items) ? mapData.items : []
        const found = points.find((item) => String(item?.slug || '').trim().toLowerCase() === targetSlug)
        const lat = Number(found?.lat)
        const lon = Number(found?.lon)
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setRestaurantPoint({ lat, lon })
        }
      } catch (coordsError) {
        if (!aborted) console.error('Failed to load restaurant coordinates', coordsError)
      }
    })()

    return () => {
      aborted = true
    }
  }, [slug])

  const dishes = useMemo(() => flattenMenuDishes(menu), [menu])
  const freeDishKeys = useMemo(
    () => new Set(dishes.slice(0, 3).map((dish) => buildDishAccessKey(dish))),
    [dishes]
  )
  const capturedAt = useMemo(() => formatMenuCapturedAt(menu?.menuCapturedAt), [menu?.menuCapturedAt])

  // Apply search and macro filters locally to keep the UI responsive.
  const filtered = useMemo(() => {
    const q = query.trim()
    return dishes.filter((dish) => {
      const categoryName = formatDescription(dish.category, '') || 'Без категории'
      if (selectedCategory !== 'all' && categoryName !== selectedCategory) return false
      const searchableComposition = formatDescription(dish.ingredients ?? dish.description, '')
      if (q && !matchesSearchQuery(dish.name, q) && !matchesSearchQuery(searchableComposition, q)) return false
      if (presets.highProtein && !(dish.protein >= 25)) return false
      if (presets.lowFat && !(dish.fat <= 10)) return false
      if (presets.lowKcal && !(dish.kcal <= 400)) return false
      if (!inRange(dish.kcal, range.kcal.min, range.kcal.max)) return false
      if (!inRange(dish.protein, range.protein.min, range.protein.max)) return false
      if (!inRange(dish.fat, range.fat.min, range.fat.max)) return false
      if (!inRange(dish.carbs, range.carbs.min, range.carbs.max)) return false
      return true
    })
  }, [dishes, query, selectedCategory, presets, range])

  const categoryOptions = useMemo(() => {
    const source = Array.isArray(menu?.categories) ? menu.categories : []
    const names = source
      .map((category) => formatDescription(category?.name, '') || 'Без категории')
      .filter(Boolean)
    return Array.from(new Set(names))
  }, [menu?.categories])

  const groupedDishes = useMemo(() => {
    if (!menu?.categories?.length) {
      return filtered.length ? [{ name: 'Меню', dishes: filtered }] : []
    }

    const ordered = menu.categories.map((category) => ({
      name: formatDescription(category?.name, '') || 'Без категории',
      dishes: [],
    }))
    const lookup = new Map(ordered.map((item) => [item.name, item]))
    const known = new Set(lookup.keys())

    for (const dish of filtered) {
      const categoryName = formatDescription(dish.category, '')
      const bucketName = categoryName && known.has(categoryName) ? categoryName : null
      if (bucketName) {
        lookup.get(bucketName)?.dishes.push(dish)
      }
    }

    const leftovers = filtered.filter((dish) => {
      const categoryName = formatDescription(dish.category, '')
      return !categoryName || !known.has(categoryName)
    })
    if (leftovers.length) {
      ordered.push({ name: 'Другое', dishes: leftovers })
    }

    return ordered.filter((section) => section.dishes.length)
  }, [filtered, menu?.categories])
  const restaurantLinkUrl = useMemo(() => normalizeRestaurantLinkUrl(menu?.instagramUrl), [menu?.instagramUrl])
  const seoRestaurantName = menu?.name || slug || 'ресторана'
  const seoDescription = useMemo(
    () => `Меню ${seoRestaurantName} с КБЖУ: калории, белки, жиры и углеводы блюд ресторана. Сравнивайте блюда ${seoRestaurantName} по калорийности и макронутриентам перед посещением ресторана.`,
    [seoRestaurantName]
  )
  const mapCenter = useMemo(
    () => (restaurantPoint ? [restaurantPoint.lat, restaurantPoint.lon] : DEFAULT_MAP_CENTER),
    [restaurantPoint]
  )
  const mapOpenUrl = useMemo(() => {
    if (restaurantPoint) {
      const { lat, lon } = restaurantPoint
      return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
    }
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${menu?.name || slug} ресторан`)}`
  }, [menu?.name, restaurantPoint, slug])

  useMeta({
    title: `Меню ${seoRestaurantName} с КБЖУ — калории, белки, жиры, углеводы`,
    description: seoDescription,
    canonical: `https://restaurantsecret.ru/restaurants/${slug}`,
  })

  // Toggle a preset chip and re-run memoized filtering.
  const togglePreset = (key) => {
    setPresets((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const updateRange = (macro, edge, value) => {
    const clean = value.replace(/[^\d]/g, '')
    setRange((prev) => ({
      ...prev,
      [macro]: {
        ...prev[macro],
        [edge]: clean,
      },
    }))
  }

  // Reset search, presets and custom ranges in one click.
  const resetFilters = () => {
    setQuery('')
    setSelectedCategory('all')
    setPresets(createDefaultPresets())
    setRange(createDefaultRange())
  }

  const openMapInBrowser = () => {
    window.open(mapOpenUrl, '_blank', 'noopener,noreferrer')
  }

  const handleShare = async () => {
    const pageUrl = window.location.href
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches

    if (isMobileViewport && navigator.share) {
      try {
        await navigator.share({
          title: menu?.name || 'Меню ресторана',
          url: pageUrl,
        })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(pageUrl)
      if (!isMobileViewport) {
        toast.success('Ссылка скопирована', { duration: 2200 })
      }
    } catch (_) {
      // Ignore clipboard API failures in unsupported environments.
    }
  }

  const handleToggleRestaurantFavorite = async () => {
    if (!slug) return
    if (!accessToken) {
      navigate('/login', { state: { from: window.location.pathname + window.location.search } })
      return
    }
    if (!isFavoriteRestaurant) {
      analytics.track('favorite_add', { type: 'restaurant', slug, name: menu?.name || slug })
    } else {
      analytics.track('favorite_remove', { type: 'restaurant', slug, name: menu?.name || slug })
    }
    await toggleFavoriteRestaurant(accessToken, slug)
  }

  return (
    <div className="menu-page">
      <header className="menu-hero">
        <div className="menu-mobile-hero">
          <div className="menu-mobile-hero__title-row">
            <h1 className="menu-mobile-hero__title" aria-label={`Меню ${seoRestaurantName} с КБЖУ`}>
              {seoRestaurantName}
            </h1>

            <button
              type="button"
              className={`menu-mobile-hero__favorite ${isFavoriteRestaurant ? 'is-active' : ''}`}
              onClick={handleToggleRestaurantFavorite}
              aria-label={isFavoriteRestaurant ? 'Удалить ресторан из избранного' : 'Добавить ресторан в избранное'}
              title={isFavoriteRestaurant ? 'В избранном' : 'Добавить в избранное'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path
                  d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"
                  fill={isFavoriteRestaurant ? '#E11D48' : 'none'}
                  stroke={isFavoriteRestaurant ? '#E11D48' : 'currentColor'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="menu-mobile-hero__meta-line">
            <span>{dishes.length} {getRussianPluralWord(dishes.length, 'блюдо', 'блюда', 'блюд')}</span>
            {!!capturedAt && (
              <>
                <span aria-hidden="true">•</span>
                <span>Обновлено {capturedAt}</span>
              </>
            )}
          </div>

          <div className="menu-mobile-hero__actions">
            <button
              type="button"
              className="menu-mobile-hero__map"
              onClick={openMapInBrowser}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">
                <path d="M12 21s7-5.1 7-11a7 7 0 0 0-14 0c0 5.9 7 11 7 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>На карте</span>
            </button>

            {restaurantLinkUrl ? <RestaurantWebLink href={restaurantLinkUrl} className="menu-mobile-hero__web" /> : null}

            <button
              type="button"
              className="menu-mobile-hero__report"
              onClick={() => setIsOutdatedOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 11.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="7.6" r="1" fill="currentColor" />
              </svg>
              <span>Сообщить об ошибке</span>
            </button>
          </div>
        </div>

        <div className="menu-hero__top-row">
          <div className="menu-hero__top-main">
            <button
              type="button"
              className="menu-hero__back-catalog"
              onClick={() => navigate('/catalog')}
              aria-label="Ко всем меню"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">
                <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Ко всем меню</span>
            </button>
            <div className="menu-hero__pill">
              <span>Меню ресторана</span>
            </div>
            <button
              type="button"
              className={`menu-hero__pill-fav ${isFavoriteRestaurant ? 'is-active' : ''}`}
              onClick={handleToggleRestaurantFavorite}
              aria-label={isFavoriteRestaurant ? 'Удалить ресторан из избранного' : 'Добавить ресторан в избранное'}
              title={isFavoriteRestaurant ? 'В избранном' : 'Добавить в избранное'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path
                  d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 9.24 3 10.91 3.81 12 5.09 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z"
                  fill={isFavoriteRestaurant ? '#E11D48' : 'none'}
                  stroke={isFavoriteRestaurant ? '#E11D48' : 'currentColor'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="menu-hero__status-row">
            <button
              type="button"
              className="menu-outdated"
              onClick={() => setIsOutdatedOpen(true)}
            >
              Меню устарело?
            </button>
            <div className="menu-hero__badge">
              <span className="menu-hero__badge-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M7 2v8m4-8v8M7 2H5v8a4 4 0 0 0 8 0V2h-2M9 14v8M17 2v20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                {filtered.length
                  ? `${filtered.length} ${getRussianPluralWord(filtered.length, 'блюдо', 'блюда', 'блюд')}`
                  : 'Ничего не найдено'}
              </span>
            </div>
          </div>
        </div>
        <div className="menu-hero__header">
          <div className="menu-hero__lead">
            <div className="menu-hero__title-row">
              <h1 className="menu-hero__title" aria-label={`Меню ${seoRestaurantName} с КБЖУ`}>
                {seoRestaurantName}
              </h1>
              <div className="menu-hero__socials">
                {restaurantLinkUrl ? <RestaurantWebLink href={restaurantLinkUrl} /> : null}
                <button
                  type="button"
                  className="menu-hero__share"
                  onClick={handleShare}
                  aria-label="Поделиться страницей ресторана"
                  title="Поделиться"
                >
                  <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">
                    <path
                      d="M12 16V4m0 0-4 4m4-4 4 4M6 13v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            {!!capturedAt && <div className="menu__captured-at">Меню добавлено: {capturedAt}</div>}
            <div className="menu-hero__meta-row">
              <button
                type="button"
                className="menu-hero__map-mobile-btn"
                onClick={openMapInBrowser}
              >
                Показать на карте
              </button>
            </div>
          </div>

          <button
            type="button"
            className="menu-hero__mini-map"
            onClick={() => setIsMapOpen(true)}
            aria-label="Открыть карту ресторана"
            title="Открыть карту ресторана"
          >
            <MenuLeafletMap
              className="menu-hero__mini-map-frame"
              center={mapCenter}
              marker={restaurantPoint}
              interactive={false}
              title={`Карта ресторана ${menu?.name || slug}`}
            />
          </button>
        </div>
      </header>

      {isMapOpen ? (
        <div className="menu-map-modal" role="dialog" aria-modal="true" aria-label="Карта ресторана">
          <button type="button" className="menu-map-modal__backdrop" onClick={() => setIsMapOpen(false)} aria-label="Закрыть карту" />
          <div className="menu-map-modal__dialog">
            <button type="button" className="menu-map-modal__close" onClick={() => setIsMapOpen(false)} aria-label="Закрыть">
              Закрыть
            </button>
            <MenuLeafletMap
              className="menu-map-modal__frame"
              center={mapCenter}
              marker={restaurantPoint}
              interactive
              title={`Большая карта ресторана ${menu?.name || slug}`}
            />
          </div>
        </div>
      ) : null}

      <section className="menu-filters" aria-label="Фильтры блюд">
        <div className="menu-filters__primary-row">
          <div className="menu-filters__search">
            <label className="sr-only" htmlFor="menu-search">Поиск по названию блюда</label>
            <input
              id="menu-search"
              className="menu-filters__input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по блюду или составу"
              aria-label="Поиск блюда"
            />
          </div>

          <CategorySelect
            id="menu-category-select"
            className="menu-category-filter"
            value={selectedCategory}
            options={categoryOptions}
            onChange={setSelectedCategory}
          />

          <button
            type="button"
            className={`menu-filters__toggle-btn ${isAdvancedFiltersOpen ? 'is-active' : ''}`}
            onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
            aria-expanded={isAdvancedFiltersOpen}
            aria-controls="advanced-macro-filters"
            title="Подробные фильтры КБЖУ"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 6h10M17 6h4M9 6a2 2 0 1 0 0 0ZM3 12h4M11 12h10M15 12a2 2 0 1 0 0 0ZM3 18h10M17 18h4M9 18a2 2 0 1 0 0 0Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="menu-filters__chips" role="group" aria-label="Быстрые фильтры">
            <FilterChip
              active={presets.lowKcal}
              label="🔥 Мало калорий"
              description="<= 400 ккал"
              onClick={() => togglePreset('lowKcal')}
            />
            <FilterChip
              active={presets.highProtein}
              label="💪 Много белка"
              description=">= 25 г"
              onClick={() => togglePreset('highProtein')}
            />
            <FilterChip
              active={presets.lowFat}
              label="🥗 Мало жиров"
              description="<= 10 г"
              onClick={() => togglePreset('lowFat')}
            />
          </div>
        </div>

        <div id="advanced-macro-filters" className={`menu-filters__advanced ${isAdvancedFiltersOpen ? 'is-open' : ''}`}>
          <div className="filter-grid">
            <MacroRange label="Калории" value={range.kcal} onChange={(edge, val) => updateRange('kcal', edge, val)} />
            <MacroRange label="Белки (г)" value={range.protein} onChange={(edge, val) => updateRange('protein', edge, val)} />
            <MacroRange label="Жиры (г)" value={range.fat} onChange={(edge, val) => updateRange('fat', edge, val)} />
            <MacroRange label="Углеводы (г)" value={range.carbs} onChange={(edge, val) => updateRange('carbs', edge, val)} />
          </div>
          <button type="button" className="menu-filters__reset" onClick={resetFilters}>Сбросить всё</button>
        </div>
      </section>

      <section className="menu-content" aria-live="polite">
        {loading && <p>Загружаем меню…</p>}
        {!!error && !loading && <p className="err">{error}</p>}
        {!loading && !error && (
          groupedDishes.length ? (
            groupedDishes.map((section, sectionIndex) => (
              <article key={section.name} className="menu-section">
                <header className="menu-section__header">
                  <div className="menu-section__title-wrap">
                    <h2 className="menu-section__title">{section.name}</h2>
                    {sectionIndex === 0 ? (
                      <CategorySelect
                        id="menu-section-category-select"
                        className="menu-section__category-filter"
                        value={selectedCategory}
                        options={categoryOptions}
                        onChange={setSelectedCategory}
                      />
                    ) : null}
                  </div>
                  <div className="menu-section__count">{formatPositionCount(section.dishes.length)}</div>
                </header>
                <ul className="menu-grid">
                  {section.dishes.map((dish) => {
                    const isFreeAccess = freeDishKeys.has(buildDishAccessKey(dish))
                    return (
                      <DishCard
                        key={`${section.name}-${dish.name}`}
                        dish={dish}
                        restaurantSlug={slug}
                        restaurantName={menu?.name || slug}
                        isFreeAccess={isFreeAccess}
                        onClick={() => open({
                          id: dish.id,
                          dishName: dish.name,
                          restaurantSlug: slug,
                          restaurantName: menu?.name || slug,
                          isFreeAccess,
                        })}
                      />
                    )
                  })}
                </ul>
              </article>
            ))
          ) : (
            menu?.categories?.length ? (
              <p className="muted">Нет блюд по заданным параметрам</p>
            ) : (
              <p className="muted">Меню этого ресторана пока не добавлено. Мы работаем над этим.</p>
            )
          )
        )}
      </section>
      <MenuOutdatedModal
        restaurantName={menu?.name || slug}
        isOpen={isOutdatedOpen}
        onClose={() => setIsOutdatedOpen(false)}
      />
    </div>
  )
}

function CategorySelect({ id, className, value, options, onChange }) {
  return (
    <div className={className} aria-label="Фильтр по категории">
      <label className="sr-only" htmlFor={id}>Категория меню</label>
      <select
        id={id}
        className="menu-category-filter__select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="all">Категории</option>
        {options.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  )
}

function FilterChip({ active, label, description, onClick }) {
  return (
    <button
      type="button"
      className={`menu-chip ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="menu-chip__label">{label}</span>
      <span className="menu-chip__description">{description}</span>
    </button>
  )
}

function RestaurantWebLink({ href, className = 'menu-hero__web' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ссылка ресторана"
      title="Ссылка ресторана"
      className={className}
    >
      <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.25" />
        <path d="M3 12h18" />
        <path d="M12 2.75c2.35 2.55 3.55 5.63 3.55 9.25s-1.2 6.7-3.55 9.25" />
        <path d="M12 2.75C9.65 5.3 8.45 8.38 8.45 12s1.2 6.7 3.55 9.25" />
        <path d="M5.35 6.05c1.72.83 3.93 1.25 6.65 1.25s4.93-.42 6.65-1.25" />
        <path d="M5.35 17.95c1.72-.83 3.93-1.25 6.65-1.25s4.93.42 6.65 1.25" />
      </svg>
    </a>
  )
}

function MenuLeafletMap({ className, center, marker, interactive, title }) {
  const zoom = marker ? 16 : 11
  const mapKey = `${center[0]}:${center[1]}:${zoom}:${interactive ? 'interactive' : 'preview'}`

  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={zoom}
      className={className}
      attributionControl={false}
      dragging={interactive}
      touchZoom={interactive}
      doubleClickZoom={interactive}
      scrollWheelZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      zoomControl={interactive}
      title={title}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {interactive ? <AttributionControl prefix={false} /> : null}
      {marker ? (
        <CircleMarker
          center={[marker.lat, marker.lon]}
          radius={8}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#d62839', fillOpacity: 0.95 }}
        />
      ) : null}
    </MapContainer>
  )
}

// Controlled inputs for selecting min/max bounds of a macro nutrient.
function MacroRange({ label, value, onChange }) {
  return (
    <div className="range">
      <label className="range-label">{label}</label>
      <div className="range-row">
        <input
          className="range-input"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="мин"
          value={value.min}
          onChange={(event) => onChange('min', event.target.value)}
        />
        <span className="range-dash">—</span>
        <input
          className="range-input"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="макс"
          value={value.max}
          onChange={(event) => onChange('max', event.target.value)}
        />
      </div>
    </div>
  )
}

// Preserve nullish menus but ensure we always return an object.
function normalizeMenu(raw) {
  return raw || {}
}

// Inclusive range check that treats empty fields as unbounded.
function inRange(value, min, max) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return min === '' && max === ''
  }
  const lower = min === '' ? -Infinity : Number(min)
  const upper = max === '' ? Infinity : Number(max)
  return numeric >= lower && numeric <= upper
}

function buildDishAccessKey(dish) {
  if (dish?.id != null && dish?.id !== '') return `id:${dish.id}`
  return `name:${String(dish?.name || '').trim().toLowerCase()}`
}
