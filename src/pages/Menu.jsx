// Restaurant menu page with filters for macros and calories.
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '@/lib/requests'
import { flattenMenuDishes, formatNumeric } from '@/lib/nutrition'
import { formatDescription } from '@/lib/text'
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
  const navigate = useNavigate()
  const accessToken = useAuth((state) => state.accessToken)
  const { hasActiveSub, fetchStatus } = useSubscriptionStore((state) => ({
    hasActiveSub: state.hasActiveSub,
    fetchStatus: state.fetchStatus,
  }))
  const open = useDishCardStore((state) => state.open)

  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isOutdatedOpen, setIsOutdatedOpen] = useState(false)

  const [query, setQuery] = useState('')
  const [presets, setPresets] = useState(createDefaultPresets)
  const [range, setRange] = useState(createDefaultRange)

  // Reset filters whenever the restaurant slug changes.
  useEffect(() => {
    setQuery('')
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
  const capturedAt = useMemo(() => formatMenuCapturedAt(menu?.menuCapturedAt), [menu?.menuCapturedAt])

  // Apply search and macro filters locally to keep the UI responsive.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return dishes.filter((dish) => {
      if (q && !dish.name?.toLowerCase().includes(q)) return false
      if (presets.highProtein && !(dish.protein >= 25)) return false
      if (presets.lowFat && !(dish.fat <= 10)) return false
      if (presets.lowKcal && !(dish.kcal <= 400)) return false
      if (!inRange(dish.kcal, range.kcal.min, range.kcal.max)) return false
      if (!inRange(dish.protein, range.protein.min, range.protein.max)) return false
      if (!inRange(dish.fat, range.fat.min, range.fat.max)) return false
      if (!inRange(dish.carbs, range.carbs.min, range.carbs.max)) return false
      return true
    })
  }, [dishes, query, presets, range])

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
    setPresets(createDefaultPresets())
    setRange(createDefaultRange())
  }

  const handleSubscribe = () => {
    if (accessToken) {
      navigate('/account/subscription', { state: { from: window.location.pathname + window.location.search } })
      return
    }
    navigate('/login', { state: { from: '/account/subscription' } })
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
          <div className="menu-hero__title-block">
            <div className="menu-hero__title-row">
              <h1 className="menu-hero__title">{menu?.name || 'Меню'}</h1>
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram ресторана"
                  title="Instagram"
                  style={{ color: '#E1306C', display: 'inline-flex', marginLeft: 8 }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
                    <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm11.5 1.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                  </svg>
                </a>
              )}
              <div className="menu-hero__badge">
                {filtered.length ? `${filtered.length} блюд` : 'Ничего не найдено'}
              </div>
            </div>
            {!!capturedAt && <div className="menu__captured-at">Меню добавлено: {capturedAt}</div>}
          </div>
        </div>
      </header>

      <section className="menu-filters" aria-label="Фильтры блюд">
        <div className="menu-filters__bar">
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
          <button type="button" className="menu-filters__reset" onClick={resetFilters}>Сбросить всё</button>
        </div>

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

        <div className="filter-grid">
          <MacroRange label="Калории" value={range.kcal} onChange={(edge, val) => updateRange('kcal', edge, val)} />
          <MacroRange label="Белки (г)" value={range.protein} onChange={(edge, val) => updateRange('protein', edge, val)} />
          <MacroRange label="Жиры (г)" value={range.fat} onChange={(edge, val) => updateRange('fat', edge, val)} />
          <MacroRange label="Углеводы (г)" value={range.carbs} onChange={(edge, val) => updateRange('carbs', edge, val)} />
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
                  {section.dishes.map((dish) => (
                    <DishCard
                      key={`${section.name}-${dish.name}`}
                      dish={dish}
                      restaurantSlug={slug}
                      restaurantName={menu?.name || slug}
                      onClick={() => open({
                        id: dish.id,
                        dishName: dish.name,
                        restaurantSlug: slug,
                        restaurantName: menu?.name || slug,
                      })}
                    />
                  ))}
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
