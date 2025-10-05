import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Restaurant from './pages/Restaurant.jsx'
import Menu from './pages/Menu.jsx'
import Search from './pages/Search.jsx'
import PaySuccess from './pages/PaySuccess.jsx'
import PayMockSuccess from './pages/PayMockSuccess.jsx'
import Paywall from './components/Paywall.jsx'

const defaultAccess = { ok: false, isActive: false, expiresAt: null }

export default function App() {
  const location = useLocation()
  const [access, setAccess] = useState(() => {
    if (typeof window === 'undefined') return defaultAccess
    try {
      const stored = window.localStorage.getItem('rs_access_state')
      if (!stored) return defaultAccess
      const parsed = JSON.parse(stored)
      return { ...defaultAccess, ...parsed }
    } catch (err) {
      console.warn('Failed to parse access state', err)
      return defaultAccess
    }
  })

  const handleAccessUpdate = useCallback((next) => {
    if (!next) {
      setAccess(defaultAccess)
      return
    }
    setAccess(prev => ({ ...prev, ...next }))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('rs_access_state', JSON.stringify(access))
    } catch (err) {
      console.warn('Failed to persist access state', err)
    }
  }, [access])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (event) => {
      if (event.key !== 'rs_access_state') return
      if (!event.newValue) {
        handleAccessUpdate(defaultAccess)
        return
      }
      try {
        const parsed = JSON.parse(event.newValue)
        handleAccessUpdate(parsed)
      } catch (err) {
        console.warn('Failed to sync access state', err)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [handleAccessUpdate])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event) => {
      if (!event?.detail) return
      handleAccessUpdate(event.detail)
    }
    window.addEventListener('rs-access-update', handler)
    return () => {
      window.removeEventListener('rs-access-update', handler)
    }
  }, [handleAccessUpdate])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    tg.ready()
    tg.expand()
    tg.setHeaderColor('bg_color')

    const handleThemeChange = () => {
      document.body.classList.toggle('tg-dark', tg.colorScheme === 'dark')
    }

    handleThemeChange()
    tg.onEvent('themeChanged', handleThemeChange)

    return () => {
      tg.offEvent('themeChanged', handleThemeChange)
    }
  }, [])

  const showPaywall = useMemo(() => {
    if (access?.isActive) return false
    return !location.pathname.startsWith('/pay')
  }, [access?.isActive, location.pathname])

  const refreshAccess = useCallback(async () => {
    try {
      const user = (typeof window !== 'undefined' && window.localStorage.getItem('rs_tg_user_id')) || '176483490'
      const response = await fetch('https://api.restaurantsecret.ru/me', {
        headers: {
          'Authorization': `Bearer ${user}`
        }
      })

      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}`)
      }

      const me = await response.json()
      const detail = {
        ok: me?.ok ?? true,
        isActive: Boolean(me?.isActive),
        expiresAt: me?.expiresAt ?? null
      }

      handleAccessUpdate(detail)

      if (!detail.isActive) {
        alert('Подписка пока не активна. Попробуйте повторить проверку позже.')
      }
    } catch (err) {
      console.error('Failed to refresh access', err)
      alert('Не удалось проверить доступ. Попробуйте позже.')
    }
  }, [handleAccessUpdate])

  return (
    <div className={showPaywall ? 'container locked' : 'container'}>
      <header className="topbar">
        <Link to="/" className="brand">RestaurantSecret</Link>
        <form action="/search" method="get" className="search">
          <input name="q" placeholder="Найти блюдо..." aria-label="Search" />
        </form>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/r/:slug" element={<Restaurant />} />
          <Route path="/r/:slug/menu" element={<Menu />} />
          <Route path="/search" element={<Search />} />
          <Route path="/pay/success" element={<PaySuccess onAccessUpdate={handleAccessUpdate} access={access} />} />
          <Route path="/pay/mock-success" element={<PayMockSuccess />} />
        </Routes>
      </main>
      {showPaywall && (
        <div className="rs-paywall-overlay">
          <Paywall onRefresh={refreshAccess} />
        </div>
      )}
    </div>
  )
}
