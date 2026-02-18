// Restaurant menu page with filters for macros and calories.
import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet } from '@/lib/requests'
import { flattenMenuDishes } from '@/lib/nutrition'
import { formatDescription, matchesSearchQuery } from '@/lib/text'
import { formatMenuCapturedAt } from '@/lib/dates'
import { useAuth } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'
import { MenuOutdatedModal } from '@/components/MenuOutdatedModal'
import DishCard from '@/components/DishCard/DishCard'
import { useDishCardStore } from '@/store/dishCard'
import { analytics } from '@/services/analytics'

const createDefaultPresets = () => ({ highProtein: false, lowFat: false, lowKcal: false })
const createDefaultRange = () => ({
  kcal: { min: '', max: '' },
  protein: { min: '', max: '' },
  fat: { min: '', max: '' },
  carbs: { min: '', max: '' }
})

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

export default function Menu() {
  const { slug } = useParams()
  const accessToken = useAuth((state) => state.accessToken)
  const { fetchStatus } = useSubscriptionStore((state) => ({
    fetchStatus: state.fetchStatus,
  }))
  const open = useDishCardStore((state) => state.open)

  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isOutdatedOpen, setIsOutdatedOpen] = useState(false)

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
          const raw = await apiGet(`/restaurants/${slug}/menu`)
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
  const instagramUrl = useMemo(() => normalizeInstagramUrl(menu?.instagramUrl), [menu?.instagramUrl])

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

  return (
    <div className="menu-page">
      <header className="menu-hero">
        <div className="menu-hero__top-row">
          <div className="menu-hero__pill">Меню ресторана</div>
          <button
            type="button"
            className="menu-outdated"
            onClick={() => setIsOutdatedOpen(true)}
          >
            Меню устарело?
          </button>
        </div>
        <div className="menu-hero__header">
          <div className="menu-hero__title-row">
            <h1 className="menu-hero__title">{menu?.name || 'Меню'}</h1>
            {instagramUrl ? <InstagramLink href={instagramUrl} /> : null}
          </div>

          <div className="menu-hero__meta-row">
            {!!capturedAt && <div className="menu__captured-at">Меню добавлено: {capturedAt}</div>}
            <div className="menu-hero__badge">
              {filtered.length ? `${filtered.length} блюд` : 'Ничего не найдено'}
            </div>
          </div>
        </div>
      </header>

      <section className="menu-category-filter" aria-label="Фильтр по категории">
        <label className="sr-only" htmlFor="menu-category-select">Категория меню</label>
        <select
          id="menu-category-select"
          className="menu-category-filter__select"
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          <option value="all">Категории</option>
          {categoryOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </section>

      <section className="menu-filters" aria-label="Фильтры блюд">
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

        <div className="menu-filters__macro-row">
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
            <FilterChip
              active={presets.lowKcal}
              label="🔥 Мало калорий"
              description="<= 400 ккал"
              onClick={() => togglePreset('lowKcal')}
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
            groupedDishes.map((section) => (
              <article key={section.name} className="menu-section">
                <header className="menu-section__header">
                  <div>
                    <h2 className="menu-section__title">{section.name}</h2>
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
                        showRestaurantName={false}
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

function InstagramLink({ href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram ресторана"
      title="Instagram"
      className="menu-hero__insta"
    >
      <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11.5 1.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      </svg>
    </a>
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
