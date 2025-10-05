import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { api } from '../api/client.js'
import { useSWRLite } from '../hooks/useSWRLite.js'

export default function Catalog() {
  const { data: filters } = useSWRLite('filters', () => api.filters())
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [calKey, setCalKey] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { access, requireAccess, requestPaywall } = useOutletContext() || {}

  const ensureAccess = useCallback(() => {
    if (requireAccess) {
      return requireAccess()
    }
    if (access?.isActive) return true
    if (requestPaywall) requestPaywall()
    return false
  }, [access?.isActive, requireAccess, requestPaywall])

  const openProfile = useCallback((slug) => {
    if (!slug) return
    if (ensureAccess()) {
      navigate(`/r/${slug}`)
    }
  }, [ensureAccess, navigate])

  const openMenu = useCallback((slug) => {
    if (!slug) return
    if (ensureAccess()) {
      navigate(`/r/${slug}/menu`)
    }
  }, [ensureAccess, navigate])

  const { data, loading, error } = useSWRLite(
    `restaurants-${page}-${selectedCuisines.join(',')}-${calKey}`,
    () => api.restaurants({ limit: 20, page, cuisine: selectedCuisines, calorie_range: calKey })
  )

  const items = data?.items ?? []

  const cuisineOptions = useMemo(() => filters?.cuisines ?? [], [filters?.cuisines])
  const calorieOptions = useMemo(() => filters?.calorie_ranges ?? [], [filters?.calorie_ranges])

  return (
    <div className="stack">
      <div className="filters">
        <div>
          <label>Кухни</label>
          <div className="chips">
            {cuisineOptions.map(c => (
              <button
                key={c}
                className={selectedCuisines.includes(c) ? 'chip active' : 'chip'}
                onClick={() => {
                  setPage(1)
                  setSelectedCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label>Калории</label>
          <div className="chips">
            {calorieOptions.map(r => (
              <button key={r.key}
                className={calKey === r.key ? 'chip active' : 'chip'}
                onClick={() => { setPage(1); setCalKey(k => k === r.key ? '' : r.key) }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <button className="link" onClick={() => { setSelectedCuisines([]); setCalKey(''); setPage(1); }}>Сбросить</button>
      </div>

      {loading && !items.length && <p>Загрузка…</p>}
      {error && <p className="err">Ошибка: {String(error.message || error)}</p>}

      <ul className="cards">
        {items.map(r => (
          <li key={r.slug} className="card" role="group" aria-label={r?.name ?? 'Ресторан'}>
            <button type="button" className="card-body card-button" onClick={() => openProfile(r.slug)}>
              <h3>{r.name}</h3>
              <div className="muted">{r.cuisine ?? '—'}</div>
              <div className="muted">Блюд: {r.dish_count ?? '—'}</div>
            </button>
            <div className="card-actions">
              <button type="button" className="link" onClick={() => openProfile(r.slug)}>Профиль</button>
              <button type="button" className="link" onClick={() => openMenu(r.slug)}>Меню</button>
            </div>
          </li>
        ))}
      </ul>

      {data?.has_more && (
        <button onClick={() => setPage(p => p + 1)} className="primary">Загрузить ещё</button>
      )}
    </div>
  )
}
