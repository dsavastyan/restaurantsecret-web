// src/pages/partners/PartnerShell.jsx
// Layout for the restaurant self-serve portal (/partners/*). Deliberately NOT nested
// under AppShell: no consumer NavBar/Footer, no subscription/paywall state, no
// Telegram WebApp wiring, no onboarding redirect — none of that applies to a
// restaurant user and some of it (the onboarding-redirect effect in AppShell) could
// misfire if Дарья tests this while also logged in as a subscriber in the same browser.
import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { restaurantPortalApi } from '@/api/restaurantPortal'
import './partners.css'

// Keep this section out of search results — it's not part of the public site.
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])
}

export default function PartnerShell() {
  useNoIndex()

  const location = useLocation()
  const navigate = useNavigate()
  const isLoginPage = location.pathname.replace(/\/+$/, '') === '/partners/login'

  const [status, setStatus] = useState(isLoginPage ? 'idle' : 'loading') // idle | loading | ready | error
  const [restaurant, setRestaurant] = useState(null)
  const [lastUpload, setLastUpload] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    setStatus('loading')
    setLoadError(null)
    try {
      const data = await restaurantPortalApi.me()
      setRestaurant(data.restaurant)
      setLastUpload(data.last_upload)
      setStatus('ready')
    } catch (err) {
      if (err.status === 401) {
        navigate('/partners/login', { replace: true })
        return
      }
      setLoadError(err.message || 'Не получилось загрузить данные кабинета.')
      setStatus('error')
    }
  }, [navigate])

  useEffect(() => {
    if (isLoginPage) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage])

  const handleLogout = async () => {
    try {
      await restaurantPortalApi.logout()
    } catch {
      // ignore — cookie is server-side, worst case it expires on its own
    }
    navigate('/partners/login', { replace: true })
  }

  if (isLoginPage) {
    return (
      <div className="partners">
        <Outlet context={{ restaurant: null, lastUpload: null, refresh }} />
      </div>
    )
  }

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="partners partners--centered">
        <p className="partners__loading">Загружаем кабинет…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="partners partners--centered">
        <p className="partners__error">{loadError}</p>
        <button className="partners__btn" onClick={refresh}>Повторить</button>
      </div>
    )
  }

  return (
    <div className="partners">
      <header className="partners__header">
        <div className="partners__brand">
          <span className="partners__brand-name">RestaurantSecret</span>
          <span className="partners__brand-sub">Кабинет ресторана</span>
        </div>
        <div className="partners__header-right">
          {restaurant?.name && <span className="partners__restaurant-name">{restaurant.name}</span>}
          <button className="partners__logout" onClick={handleLogout}>Выйти</button>
        </div>
      </header>
      <main className="partners__main">
        <Outlet context={{ restaurant, lastUpload, refresh }} />
      </main>
    </div>
  )
}
