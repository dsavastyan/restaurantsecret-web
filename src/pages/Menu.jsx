// Restaurant menu page with filters for macros and calories.
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '@/lib/requests'
import { flattenMenuDishes, formatNumeric } from '@/lib/nutrition'
import { formatDescription } from '@/lib/text'
import { formatMenuCapturedAt } from '@/lib/dates'
import { useAuth } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'

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
        [edge]: clean
      }
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
    <div className="stack">
      <h1>{menu?.name || 'Меню'}</h1>

      <section className="filters" aria-label="Фильтры блюд">
        <div className="filters-row">
          <input
            className="filter-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию блюда"
            aria-label="Поиск блюда"
          />
          <button type="button" className="filter-reset" onClick={resetFilters}>Сбросить</button>
        </div>

        <div className="chips">
          <button
            type="button"
            className={`chip ${presets.highProtein ? 'active' : ''}`}
            onClick={() => togglePreset('highProtein')}
          >
            💪 Много белка
          </button>
          <button
            type="button"
            className={`chip ${presets.lowFat ? 'active' : ''}`}
            onClick={() => togglePreset('lowFat')}
          >
            🥗 Мало жиров
          </button>
          <button
            type="button"
            className={`chip ${presets.lowKcal ? 'active' : ''}`}
            onClick={() => togglePreset('lowKcal')}
          >
            🔥 Мало калорий
          </button>
        </div>

        <div className="filter-grid">
          <MacroRange label="Калории" value={range.kcal} onChange={(edge, val) => updateRange('kcal', edge, val)} />
          <MacroRange label="Белки (г)" value={range.protein} onChange={(edge, val) => updateRange('protein', edge, val)} />
          <MacroRange label="Жиры (г)" value={range.fat} onChange={(edge, val) => updateRange('fat', edge, val)} />
          <MacroRange label="Углеводы (г)" value={range.carbs} onChange={(edge, val) => updateRange('carbs', edge, val)} />
        </div>
      </section>

      <section>
        {loading && <p>Загружаем меню…</p>}
        {!!error && !loading && <p className="err">{error}</p>}
        {!loading && !error && (
          filtered.length ? (
            <ul className="list" aria-live="polite">
              {filtered.map((dish) => (
                <li key={`${dish.category || 'dish'}-${dish.name}`} className="row">
                  <div className="row-main">
                    <strong>{dish.name}</strong>
                    {hasActiveSub ? (
                      <>
                        <div className="tags">
                          <span className="tag">{formatNumeric(dish.kcal)} ккал</span>
                          <span className="tag">Б {formatNumeric(dish.protein)}</span>
                          <span className="tag">Ж {formatNumeric(dish.fat)}</span>
                          <span className="tag">У {formatNumeric(dish.carbs)}</span>
                          {Number.isFinite(dish.weight) && <span className="tag">{formatNumeric(dish.weight)} г</span>}
                          {dish.category && <span className="tag">{dish.category}</span>}
                        </div>
                        <div className="muted">{formatDescription(dish.ingredients ?? dish.description)}</div>
                      </>
                    ) : (
                      <div className="menu-paywall">
                        <p className="muted">Эта информация доступна только по подписке.</p>
                        <button type="button" className="subscribe-btn" onClick={handleSubscribe}>
                          Оформить подписку
                        </button>
                      </div>
                    )}
                    {!!capturedAt && <div className="muted">Меню добавлено: {capturedAt}</div>}
                  </div>
                  <div className="row-aside">
                    {Number.isFinite(dish.price) && <div className="price">{Math.round(dish.price)} ₽</div>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            menu?.categories?.length ? (
              <p className="muted">Под эти параметры сейчас ничего нет. Измени фильтры.</p>
            ) : (
              <p className="muted">Меню этого ресторана пока не добавлено. Мы работаем над этим.</p>
            )
          )
        )}
      </section>
    </div>
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
