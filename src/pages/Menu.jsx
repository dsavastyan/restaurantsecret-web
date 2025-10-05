import React, { useEffect } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useSWRLite } from '../hooks/useSWRLite.js'

export default function Menu() {
  const { slug } = useParams()
  const { access, requireAccess } = useOutletContext() || {}
  const canAccess = access?.isActive

  useEffect(() => {
    if (canAccess === false && requireAccess) {
      requireAccess()
    }
  }, [canAccess, requireAccess])

  const { data, loading, error } = useSWRLite(`menu-${slug}`, () => api.menu(slug), { enabled: Boolean(canAccess) })

  if (canAccess === false) {
    return <p>Оформите подписку, чтобы просматривать меню.</p>
  }

  if (loading) return <p>Загрузка…</p>
  if (error) return <p className="err">Ошибка: {String(error.message || error)}</p>

  const dishes = data?.dishes ?? []

  return (
    <div className="stack">
      <h2>Меню</h2>
      <ul className="list">
        {dishes.map(d => (
          <li key={d.id} className="row">
            <div className="row-main">
              <strong>{d.name}</strong>
              {d.tags?.length ? <div className="tags">{d.tags.map(t => <span key={t} className="tag">{t}</span>)}</div> : null}
              {d.composition ? <div className="muted">{d.composition}</div> : null}
            </div>
            <div className="row-aside">
              <div className="kcal">{d.kcal ?? '—'} ккал</div>
              <div className="kbju">{d.proteins_g ?? '—'}/{d.fats_g ?? '—'}/{d.carbs_g ?? '—'}</div>
              {d.price_rub ? <div className="price">{d.price_rub} ₽</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
