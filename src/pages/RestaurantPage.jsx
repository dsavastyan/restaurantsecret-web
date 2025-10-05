import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client.js'
import { useSWRLite } from '../hooks/useSWRLite.js'

export default function RestaurantPage() {
  const { slug } = useParams()
  const { data, loading, error } = useSWRLite(`r-${slug}`, () => api.restaurant(slug))

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
