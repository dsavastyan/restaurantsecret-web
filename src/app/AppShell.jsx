// Shared layout for authenticated areas. Manages subscription state and toggles
// the paywall overlay when required.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, useLocation } from 'react-router-dom'
import NavBar from '@/components/NavBar'
import Paywall from '../components/Paywall.jsx'
import { API_BASE } from '@/config/api'

// Default shape for the subscription/access status persisted in localStorage.
const defaultAccess = { ok: false, isActive: false, expiresAt: null }

export default function AppShell() {
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
  const [paywallVisible, setPaywallVisible] = useState(false)

  // Merge new access info into state. A falsy value resets to defaults.
  const handleAccessUpdate = useCallback((next) => {
    if (!next) {
      setAccess(defaultAccess)
      return
    }
    setAccess(prev => ({ ...prev, ...next }))
  }, [])

  // Persist subscription state so that a refresh keeps the paywall status.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('rs_access_state', JSON.stringify(access))
    } catch (err) {
      console.warn('Failed to persist access state', err)
    }
  }, [access])

  // Sync access state across tabs/windows via the storage event.
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

  // Listen for custom `rs-access-update` events fired by Paywall and other
  // components to update access immediately after purchase.
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

  // Apply Telegram-specific tweaks when running inside the WebApp container.
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

  // Whenever access becomes active we close the paywall.
  useEffect(() => {
    if (access?.isActive) {
      setPaywallVisible(false)
    }
  }, [access?.isActive])

  // Expose helpers to descendants through React Router outlet context.
  const requestPaywall = useCallback(() => {
    setPaywallVisible(true)
  }, [])

  const closePaywall = useCallback(() => {
    setPaywallVisible(false)
  }, [])

  const requireAccess = useCallback(() => {
    if (access?.isActive) return true
    setPaywallVisible(true)
    return false
  }, [access?.isActive])

  // Determine when to show the paywall. We hide it on payment routes to avoid
  // trapping the user in a loop while confirming purchase.
  const showPaywall = useMemo(() => {
    if (access?.isActive) return false
    if (location.pathname.startsWith('/pay')) return false
    return paywallVisible
  }, [access?.isActive, location.pathname, paywallVisible])

  // Manual refresh triggered by the user after completing payment.
  const refreshAccess = useCallback(async () => {
    try {
      const user = (typeof window !== 'undefined' && window.localStorage.getItem('rs_tg_user_id')) || '176483490'
      const response = await fetch(`${API_BASE}/me`, {
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

  // Values passed to nested routes via useOutletContext.
  const outletContext = useMemo(() => ({
    access,
    handleAccessUpdate,
    refreshAccess,
    requestPaywall,
    closePaywall,
    requireAccess
  }), [access, handleAccessUpdate, refreshAccess, requestPaywall, closePaywall, requireAccess])

  const isLanding = location.pathname === '/'
  const hideGlobalSearch = isLanding || location.pathname.startsWith('/r/')

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">
        <div className={showPaywall ? 'container locked' : 'container'}>
          {!hideGlobalSearch && (
            <form action="/search" method="get" className="search">
              <input name="q" placeholder="Найти блюдо..." aria-label="Search" />
            </form>
          )}
          <Outlet context={outletContext} />
        </div>
      </main>
      {showPaywall && (
        <PaywallPortal>
          <div className="rs-paywall-overlay">
            <Paywall onRefresh={refreshAccess} returnTo={location.pathname} />
          </div>
        </PaywallPortal>
      )}
    </div>
  )
}

function PaywallPortal({ children }) {
  const [mounted, setMounted] = useState(false)

  // Delay rendering until after the component has mounted to avoid SSR issues
  // and toggle a body class while the paywall overlay is visible.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    setMounted(true)
    document.body.classList.add('rs-paywall-open')

    return () => {
      document.body.classList.remove('rs-paywall-open')
    }
  }, [])

  if (!mounted || typeof document === 'undefined') return null

  // Render the paywall overlay straight into the body element to bypass any
  // parent stacking-context limitations.
  return createPortal(children, document.body)
}
