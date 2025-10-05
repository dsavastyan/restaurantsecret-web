import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE } from '@/config/api'
import { useSubscription } from '@/hooks/useSubscription'
import SubscriptionModal from '@/components/SubscriptionModal'

export default function RestaurantPage() {
  const { slug } = useParams()
  const { loading: subLoading, isActive } = useSubscription()
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!subLoading && !isActive) {
      setModalOpen(true)
    } else {
      setModalOpen(false)
    }
  }, [subLoading, isActive])

  useEffect(() => {
    let aborted = false

    async function load() {
      if (subLoading || !isActive) {
        if (!aborted) {
          setLoading(false)
          setMenu(null)
          setError(null)
        }
        return
      }

      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE}/restaurant/${slug}/menu`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!aborted) setMenu(data)
      } catch (err) {
        if (!aborted) {
          setMenu(null)
          setError(err)
        }
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    load()

    return () => {
      aborted = true
    }
  }, [slug, subLoading, isActive])

  const showPaywall = !subLoading && !isActive

  return (
    <main className="page">
      <header className="page__header">
        <h1>{slug}</h1>
      </header>

      {subLoading && <p>Проверяем подписку…</p>}

      {showPaywall ? (
        <div className="paywall">
          <p>Меню ресторана доступно по подписке.</p>
        </div>
      ) : (
        <>
          {loading && <p>Загружаем меню…</p>}
          {!loading && error && <p className="err">Ошибка: {String(error.message || error)}</p>}
          {!loading && !error && menu && (
            <div className="menu">
              <p>Меню загружено (демо-рендер)</p>
            </div>
          )}
        </>
      )}

      <SubscriptionModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  )
}
