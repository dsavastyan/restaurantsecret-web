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

const createDefaultPresets = () => ({ highProtein: false, lowFat: false, lowKcal: false })
const createDefaultRange = () => ({
  kcal: { min: '', max: '' },
  protein: { min: '', max: '' },
  fat: { min: '', max: '' },
  carbs: { min: '', max: '' }
})

export default function Menu() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const accessToken = useAuth((state) => state.accessToken)
  const { hasActiveSub, fetchStatus } = useSubscriptionStore((state) => ({
    hasActiveSub: state.hasActiveSub,
    fetchStatus: state.fetchStatus,
  }))

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

    ;(async () => {
      try {
        await fetchStatus(accessToken)
        setLoading(true)
        setError('')
        const raw = await apiGet(`/restaurants/${slug}/menu`)
        const data = raw?.categories ? raw : { ...(raw || {}), name: raw?.name || slug, categories: [] }
        if (!aborted) setMenu(normalizeMenu(data))
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
      name: category?.name || 'Без категории',
      dishes: [],
    }))
    const lookup = new Map(ordered.map((item) => [item.name, item]))
    const known = new Set(lookup.keys())

    for (const dish of filtered) {
      const bucketName = dish.category && known.has(dish.category) ? dish.category : null
      if (bucketName) {
        lookup.get(bucketName)?.dishes.push(dish)
      }
    }

    const leftovers = filtered.filter((dish) => !dish.category || !known.has(dish.category))
    if (leftovers.length) {
      ordered.push({ name: 'Другое', dishes: leftovers })
    }

    return ordered.filter((section) => section.dishes.length)
  }, [filtered, menu?.categories])

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
      navigate('/account/subscription')
      return
    }
    navigate('/login', { state: { from: '/account/subscription' } })
  }

  return (
    <div className="menu-page">
      <header className="menu-hero">
        <div className="menu-hero__pill">Меню ресторана</div>
        <div className="menu-hero__header">
          <div>
            <h1 className="menu-hero__title">{menu?.name || 'Меню'}</h1>
            <p className="menu-hero__subtitle">
              Живое меню с нутрицентикой и ценами в одной ленте. Фильтры помогают найти блюда под
              тренировку, баланс или семейный ужин.
            </p>
            {!!capturedAt && <div className="menu__captured-at">Меню добавлено: {capturedAt}</div>}
          </div>
          <div className="menu-hero__actions">
            <button
              type="button"
              className="menu-outdated"
              onClick={() => setIsOutdatedOpen(true)}
            >
              Меню устарело
            </button>
            <div className="menu-hero__badge">
              {filtered.length ? `${filtered.length} блюд по фильтрам` : 'Ничего не найдено'}
            </div>
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
              placeholder="Поиск по названию или ингредиентам"
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
                    <p className="menu-section__eyebrow">Категория</p>
                    <h2 className="menu-section__title">{section.name}</h2>
                  </div>
                  <div className="menu-section__count">{section.dishes.length} позиций</div>
                </header>
                <ul className="menu-grid">
                  {section.dishes.map((dish) => (
                    <li key={`${section.name}-${dish.name}`} className="menu-card">
                      <div className="menu-card__top">
                        <div className="menu-card__title-row">
                          <h3 className="menu-card__title">{dish.name}</h3>
                          {Number.isFinite(dish.price) && <div className="menu-card__price">{Math.round(dish.price)} ₽</div>}
                        </div>
                        {hasActiveSub ? (
                          <>
                            <div className="menu-card__tags">
                              <span className="menu-tag">{formatNumeric(dish.kcal)} ккал</span>
                              <span className="menu-tag">Б {formatNumeric(dish.protein)}</span>
                              <span className="menu-tag">Ж {formatNumeric(dish.fat)}</span>
                              <span className="menu-tag">У {formatNumeric(dish.carbs)}</span>
                              {Number.isFinite(dish.weight) && <span className="menu-tag">{formatNumeric(dish.weight)} г</span>}
                            </div>
                            <p className="menu-card__description">
                              {formatDescription(dish.ingredients ?? dish.description) || 'Описание скоро появится'}
                            </p>
                          </>
                        ) : (
                          <div className="menu-paywall">
                            <p className="menu-paywall__text">Эта информация доступна только по подписке.</p>
                            <button type="button" className="subscribe-btn" onClick={handleSubscribe}>
                              Оформить подписку
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          ) : (
            menu?.categories?.length ? (
              <p className="muted">Под эти параметры сейчас ничего нет. Измени фильтры.</p>
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
