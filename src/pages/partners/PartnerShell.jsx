// src/pages/partners/PartnerShell.jsx
// Layout for the restaurant self-serve portal (/partners/*). Deliberately NOT nested
// under AppShell: no consumer NavBar/Footer, no subscription/paywall state, no
// Telegram WebApp wiring, no onboarding redirect — none of that applies to a
// restaurant user and some of it (the onboarding-redirect effect in AppShell) could
// misfire if Дарья tests this while also logged in as a subscriber in the same browser.
import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
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
  const isMenuFlowPage = location.pathname.replace(/\/+$/, '') === '/partners/upload'
  const isSeasonalMenuFlowPage = /^\/partners\/seasonal\/[^/]+\/?$/.test(location.pathname)
  const isMenuPreviewPage = /^\/partners\/menu-preview\/[^/]+\/?$/.test(location.pathname)
  // Дашборд рисует собственную шапку (название ресторана, статус меню, выход),
  // поэтому общий header портала там не нужен.
  const isDashboardPage = location.pathname.replace(/\/+$/, '') === '/partners/dashboard'

  const [status, setStatus] = useState(isLoginPage ? 'idle' : 'loading') // idle | loading | ready | error
  const [restaurant, setRestaurant] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [lastUpload, setLastUpload] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    setStatus('loading')
    setLoadError(null)
    try {
      const data = await restaurantPortalApi.me()
      setRestaurant(data.restaurant)
      setRestaurants(data.restaurants?.length ? data.restaurants : data.restaurant ? [data.restaurant] : [])
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

  const handleRestaurantChange = async (restaurantId) => {
    if (Number(restaurantId) === Number(restaurant?.id)) return
    setStatus('loading')
    setLoadError(null)
    try {
      await restaurantPortalApi.switchRestaurant(Number(restaurantId))
      await refresh()
    } catch (err) {
      setLoadError(err.message || 'Не получилось переключить ресторан.')
      setStatus('error')
    }
  }

  const isFirstPublication = restaurant
    ? restaurant.has_published_menu === false ||
      (restaurant.has_published_menu == null && lastUpload?.status !== 'published')
    : false

  if (isLoginPage) {
    return (
      <div className="partners">
        <Outlet context={{ restaurant: null, restaurants: [], lastUpload: null, refresh }} />
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

  if (isMenuPreviewPage) {
    return (
      <Outlet context={{
        restaurant,
        restaurants,
        lastUpload,
        refresh,
        isFirstPublication,
      }} />
    )
  }

  if (isFirstPublication) {
    return (
      <div className="partners partners--setup">
        <Outlet context={{
          restaurant,
          restaurants,
          lastUpload,
          refresh,
          handleLogout,
          handleRestaurantChange,
          isFirstPublication,
        }} />
      </div>
    )
  }

  if (isMenuFlowPage || isSeasonalMenuFlowPage) {
    return (
      <div className="partners partners--setup">
        <Outlet context={{
          restaurant,
          restaurants,
          lastUpload,
          refresh,
          handleLogout,
          handleRestaurantChange,
          isFirstPublication,
        }} />
      </div>
    )
  }

  return (
    <div className="partners">
      {!isDashboardPage && (
        <header className="partners__header">
          <div className="partners__brand" aria-label="RestaurantSecret">
            <img className="partners__brand-logo" src="/assets/logo-64.png" width="40" height="40" alt="" aria-hidden="true" />
            <span className="partners__brand-name">RestaurantSecret</span>
            <span className="partners__brand-sub">Кабинет ресторана</span>
          </div>
          <div className="partners__header-right">
            <button className="partners__logout" onClick={handleLogout}>
              Выйти
              <LogOut size={30} strokeWidth={1.55} aria-hidden="true" />
            </button>
          </div>
        </header>
      )}
      <main className="partners__main">
        <Outlet context={{
          restaurant,
          restaurants,
          lastUpload,
          refresh,
          handleLogout,
          handleRestaurantChange,
          isFirstPublication,
        }} />
      </main>
    </div>
  )
}
