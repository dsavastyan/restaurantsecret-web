import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { API_BASE } from '@/config/api'

const createDefaultPresets = () => ({ highProtein: false, lowFat: false, lowKcal: false })
const createDefaultRange = () => ({
  kcal: { min: '', max: '' },
  protein: { min: '', max: '' },
  fat: { min: '', max: '' },
  carbs: { min: '', max: '' }
})

export default function Menu() {
  const { slug } = useParams()
  const outlet = useOutletContext() || {}
  const access = outlet.access
  const requireAccess = outlet.requireAccess

  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [presets, setPresets] = useState(createDefaultPresets)
  const [range, setRange] = useState(createDefaultRange)

  const hasAccess = access?.isActive

  useEffect(() => {
    if (hasAccess === false && typeof requireAccess === 'function') {
      requireAccess()
    }
  }, [hasAccess, requireAccess])

  useEffect(() => {
    setQuery('')
    setPresets(createDefaultPresets())
    setRange(createDefaultRange())
  }, [slug])

  useEffect(() => {
    let aborted = false

    if (hasAccess === false) {
      setLoading(false)
      setMenu(null)
      return () => { aborted = true }
    }

    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const url = `${API_BASE}/restaurants/${slug}/menu`
        console.log('MENU FETCH URL:', url)
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const raw = await res.json()
        const data = raw?.categories ? raw : { name: raw?.name || slug, categories: [] }
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
  }, [slug, hasAccess])

  const dishes = useMemo(() => flattenDishes(menu), [menu])

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

  const resetFilters = () => {
    setQuery('')
    setPresets(createDefaultPresets())
    setRange(createDefaultRange())
  }

  if (hasAccess === false) {
    return (
      <div className="stack">
        <h1>Меню</h1>
        <p>Оформите подписку, чтобы просматривать меню.</p>
      </div>
    )
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
                    <div className="tags">
                      <span className="tag">{formatValue(dish.kcal)} ккал</span>
                      <span className="tag">Б {formatValue(dish.protein)}</span>
                      <span className="tag">Ж {formatValue(dish.fat)}</span>
                      <span className="tag">У {formatValue(dish.carbs)}</span>
                      {Number.isFinite(dish.weight) && <span className="tag">{formatValue(dish.weight)} г</span>}
                      {dish.category && <span className="tag">{dish.category}</span>}
                    </div>
                    {dish.ingredients && <div className="muted">{dish.ingredients}</div>}
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

function normalizeMenu(raw) {
  return raw || {}
}

function flattenDishes(menu) {
  if (!menu?.categories) return []
  const output = []
  for (const category of menu.categories) {
    for (const dish of category.dishes || []) {
      output.push({
        ...dish,
        category: category.name,
        kcal: toNumber(dish.kcal ?? dish.calories),
        protein: toNumber(dish.protein ?? dish.proteins),
        fat: toNumber(dish.fat ?? dish.fats),
        carbs: toNumber(dish.carbs ?? dish.carbohydrates),
        price: toNumber(dish.price),
        weight: toNumber(dish.weight)
      })
    }
  }
  return output
}

function toNumber(value) {
  if (value == null) return NaN
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const match = String(value).match(/[\d.]+/)
  return match ? Number(match[0]) : NaN
}

function inRange(value, min, max) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return min === '' && max === ''
  }
  const lower = min === '' ? -Infinity : Number(min)
  const upper = max === '' ? Infinity : Number(max)
  return numeric >= lower && numeric <= upper
}

function formatValue(value) {
  return Number.isFinite(value) ? Math.round(value) : '—'
}
