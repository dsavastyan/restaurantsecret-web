import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../api/client.js'
import { useSWRLite } from '../hooks/useSWRLite.js'

export default function Search() {
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const [query, setQuery] = useState(q)

  useEffect(() => setQuery(q), [q])

  const key = useMemo(() => `s-${q}`, [q])
  const { data, loading, error } = useSWRLite(key, () => q ? api.search(q, { limit: 50 }) : Promise.resolve({ items: [] }), { initialData: { items: [] } })

  return (
    <div className="stack">
      <h2>Поиск</h2>
      <input value={query} onChange={(e) => {
        const v = e.target.value
        setQuery(v)
        const t = setTimeout(() => {
          setSp(v ? { q: v } : {})
        }, 300)
        return () => clearTimeout(t)
      }} placeholder="Бургер, суп, лосось…" />
      {loading && <p>Ищем…</p>}
      {error && <p className="err">Ошибка: {String(error.message || error)}</p>}
      <ul className="cards">
        {(data?.items ?? []).map(it => (
          <li key={it.id} className="card">
            <div className="card-body">
              <strong>{it.name}</strong>
              <div className="muted">{it.restaurant_name}</div>
              <div className="muted">{it.kcal ?? '—'} ккал · {it.proteins_g ?? '—'}/{it.fats_g ?? '—'}/{it.carbs_g ?? '—'}</div>
            </div>
            <div className="card-actions">
              <Link to={`/restaurant/${it.restaurant_slug}/menu`}>К меню</Link>
            </div>
          </li>
        ))}
      </ul>
      {!loading && (data?.items?.length===0) && q && <p>Ничего не нашли по «{q}»</p>}
    </div>
  )
}
