import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useSWRLite } from '../hooks/useSWRLite.js'

export default function Home() {
  const { data: filters } = useSWRLite('filters', () => api.filters())
  const [selectedCuisines, setSelectedCuisines] = useState([])
  const [calKey, setCalKey] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, error } = useSWRLite(
    `restaurants-${page}-${selectedCuisines.join(',')}-${calKey}`,
    () => api.restaurants({ limit: 20, page, cuisine: selectedCuisines, calorie_range: calKey })
  )

  const items = data?.items ?? []

  return (
    <div className="stack">
      <div className="filters">
        <div>
          <label>Кухни</label>
          <div className="chips">
            {filters?.cuisines?.map(c => (
              <button
                key={c}
                className={selectedCuisines.includes(c) ? 'chip active' : 'chip'}
                onClick={() => {
                  setPage(1)
                  setSelectedCuisines(prev => prev.includes(c) ? prev.filter(x => x!==c) : [...prev, c])
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label>Калории</label>
          <div className="chips">
            {filters?.calorie_ranges?.map(r => (
              <button key={r.key}
                className={calKey===r.key ? 'chip active' : 'chip'}
                onClick={() => { setPage(1); setCalKey(k => k===r.key ? '' : r.key) }}>
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
          <li key={r.slug} className="card">
            <div className="card-body">
              <h3>{r.name}</h3>
              <div className="muted">{r.cuisine ?? '—'}</div>
              <div className="muted">Блюд: {r.dish_count ?? '—'}</div>
            </div>
            <div className="card-actions">
              <Link to={`/r/${r.slug}`}>Профиль</Link>
              <Link to={`/r/${r.slug}/menu`}>Меню</Link>
            </div>
          </li>
        ))}
      </ul>

      {data?.has_more && (
        <button onClick={() => setPage(p => p+1)} className="primary">Загрузить ещё</button>
      )}
    </div>
  )
}
