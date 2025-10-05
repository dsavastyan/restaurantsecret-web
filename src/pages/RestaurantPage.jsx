import React, { useEffect } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useSWRLite } from '../hooks/useSWRLite.js'

export default function RestaurantPage() {
  const { slug } = useParams()
  const { access, requireAccess } = useOutletContext() || {}
  const canAccess = access?.isActive

  useEffect(() => {
    if (canAccess === false && requireAccess) {
      requireAccess()
    }
  }, [canAccess, requireAccess])

  const { data, loading, error } = useSWRLite(`r-${slug}`, () => api.restaurant(slug), { enabled: Boolean(canAccess) })

  if (canAccess === false) {
    return <p>Оформите подписку, чтобы просматривать ресторан.</p>
  }

  if (loading) return <p>Загрузка…</p>
  if (error) return <p className="err">Ошибка: {String(error.message || error)}</p>

  return (
    <div className="stack">
      <h2>{data?.name ?? slug}</h2>
      <div className="muted">{data?.cuisine ?? '—'}</div>
      <Link to={`/restaurant/${slug}/menu`} className="primary">Открыть меню</Link>
    </div>
  )
}
