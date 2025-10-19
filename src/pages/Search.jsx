// Dish search view shared between the web app and Telegram mini app.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useSWRLite } from '../hooks/useSWRLite.js'

export default function Search() {
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const [query, setQuery] = useState(q)
  const navigate = useNavigate()
  const { access, requireAccess, requestPaywall } = useOutletContext() || {}
  const canAccess = access?.isActive

  // Prevent non-subscribers from navigating deeper into the app.
  const ensureAccess = useCallback(() => {
    if (requireAccess) {
      return requireAccess()
    }
    if (canAccess) return true
    if (requestPaywall) requestPaywall()
    return false
  }, [canAccess, requireAccess, requestPaywall])

  useEffect(() => {
    if (canAccess === false) {
      ensureAccess()
    }
  }, [canAccess, ensureAccess])

  useEffect(() => setQuery(q), [q])

  const key = useMemo(() => `s-${q}`, [q])
  // Debounce is handled outside; here we simply fetch when a query exists and
  // access is allowed.
  const { data, loading, error } = useSWRLite(
    key,
    () => q ? api.search(q, { limit: 50 }) : Promise.resolve({ items: [] }),
    { initialData: { items: [] }, enabled: Boolean(canAccess) }
  )

  // Navigate to a specific restaurant menu from the search results.
  const openMenu = useCallback((slug) => {
    if (!slug) return
    if (ensureAccess()) {
      navigate(`/r/${slug}/menu`)
    }
  }, [ensureAccess, navigate])

  if (canAccess === false) {
    return (
      <div className="stack">
        <h2>Поиск</h2>
        <p>Оформите подписку, чтобы пользоваться поиском блюд.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <h2>Поиск</h2>
      <input value={query} onChange={(e) => {
        const v = e.target.value
        setQuery(v)
        // Lightweight debounce implemented with setTimeout; for real-world use
        // consider a dedicated hook.
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
              <button type="button" className="link" onClick={() => openMenu(it.restaurant_slug)}>К меню</button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && (data?.items?.length===0) && q && <p>Ничего не нашли по «{q}»</p>}
    </div>
  )
}
