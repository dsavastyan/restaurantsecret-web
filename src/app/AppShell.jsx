// Shared layout for authenticated areas. Manages subscription state and toggles
// the paywall overlay when required.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import NavBar from '@/components/NavBar'
import SearchInput from '@/components/SearchInput'
import DishCardModal from '@/components/DishCardModal'
import DiaryFloatingButton from '@/components/DiaryFloatingButton'
import Footer from '@/components/Footer.jsx'
import IphoneInstallPrompt from '@/components/IphoneInstallPrompt.jsx'
import { PD_API_BASE } from '@/config/api'
import { fetchCurrentUser } from '@/lib/api'
import { isMoscowDaytime } from '@/lib/moscowDaytime'
import { toast } from '@/lib/toast'
import { useAuth } from '@/store/auth'

// Default shape for the subscription/access status persisted in localStorage.
const defaultAccess = { ok: false, isActive: false, expiresAt: null, event: null }
const THEME_PREFERENCE_KEY = 'rs_theme_preference'

const accessEventMessages = {
  subscription_pending: {
    variant: 'info',
    message: 'Оплата обрабатывается. Повторите проверку доступа через несколько секунд.'
  },
  subscription_expired: {
    variant: 'warning',
    message: 'Подписка истекла. Оформите продление, чтобы открыть доступ.'
  },
  subscription_inactive: {
    variant: 'warning',
    message: 'Подписка пока не активна. Проверьте статус оплаты или попробуйте позже.'
  },
  subscription_error: {
    variant: 'error',
    message: 'Не удалось подтвердить подписку. Попробуйте позже или обратитесь в поддержку.'
  }
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const accessToken = useAuth((state) => state.accessToken)
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
  const [searchQuery, setSearchQuery] = useState('')
  const [isDayTheme, setIsDayTheme] = useState(() => isMoscowDaytime())
  const lastAccessEventRef = useRef(null)

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

  // Surface notable access-related events to the user through toasts.
  useEffect(() => {
    const eventName = access?.event
    if (!eventName) {
      lastAccessEventRef.current = null
      return
    }

    if (lastAccessEventRef.current === eventName) return
    lastAccessEventRef.current = eventName

    const config = accessEventMessages[eventName]
    if (config && typeof toast[config.variant] === 'function') {
      toast[config.variant](config.message)
    }
  }, [access?.event])

  // Apply Telegram-specific tweaks when running inside the WebApp container.
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    tg.ready()
    tg.expand()
    tg.setHeaderColor('bg_color')
  }, [])

  // Expose helpers to descendants through React Router outlet context.
  const requestPaywall = useCallback(() => {
    // Paywall functionality disabled.
  }, [])

  const closePaywall = useCallback(() => {
    // Paywall functionality disabled.
  }, [])

  const requireAccess = useCallback(() => {
    return true
  }, [])

  const showPaywall = false

  // Keep a lightweight previous-route pointer for analytics attribution in SPA navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const currentPath = `${location.pathname}${location.search || ''}`
    const previousCurrent = window.sessionStorage.getItem('rs_current_path')
    if (previousCurrent && previousCurrent !== currentPath) {
      window.sessionStorage.setItem('rs_prev_path', previousCurrent)
    }
    window.sessionStorage.setItem('rs_current_path', currentPath)
  }, [location.pathname, location.search])

  // Manual refresh triggered by the user after completing payment.
  const refreshAccess = useCallback(async () => {
    try {
      if (!accessToken) {
        toast.info('Войдите в аккаунт, чтобы проверить доступ')
        return
      }
      const response = await fetch(`${PD_API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}`)
      }

      const me = await response.json()
      const derivedEvent = me?.event ?? me?.status ?? (!me?.ok ? 'subscription_error' : null)
      const detail = {
        ok: me?.ok ?? true,
        isActive: Boolean(me?.isActive),
        expiresAt: me?.expiresAt ?? null,
        event: derivedEvent
      }

      handleAccessUpdate(detail)

      if (!detail.isActive && !detail.event) {
        toast.info('Подписка пока не активна. Попробуйте повторить проверку позже.')
      }
    } catch (err) {
      console.error('Failed to refresh access', err)
      toast.error('Не удалось проверить доступ. Попробуйте позже.')
    }
  }, [accessToken, handleAccessUpdate])

  // Values passed to nested routes via useOutletContext.
  const outletContext = useMemo(() => ({
    access,
    handleAccessUpdate,
    refreshAccess,
    requestPaywall,
    closePaywall,
    requireAccess
  }), [access, handleAccessUpdate, refreshAccess, requestPaywall, closePaywall, requireAccess])

  const isContact = location.pathname.startsWith('/contact')
  const isLanding = location.pathname === '/'
  const isLoginPage = location.pathname === '/login'
  const isOnboardingPage = location.pathname.startsWith('/onboarding')
  const isImmersivePage = isLoginPage || isOnboardingPage

  useEffect(() => {
    if (!accessToken || isOnboardingPage || isLoginPage) return

    let isCancelled = false

    ;(async () => {
      try {
        const me = await fetchCurrentUser(accessToken)
        if (isCancelled) return
        if (me?.user?.onboarding_completed === true) return

        const currentPath = `${location.pathname}${location.search || ''}`
        navigate('/onboarding/welcome', {
          replace: true,
          state: { from: currentPath }
        })
      } catch (err) {
        console.error('Failed to check onboarding status', err)
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [accessToken, isLoginPage, isOnboardingPage, location.pathname, location.search, navigate])

  // Sync global UI theme by Moscow sunrise/sunset and expose it via html/body dataset.
  useEffect(() => {
    const resolveTheme = () => {
      const saved = window.localStorage.getItem(THEME_PREFERENCE_KEY)
      if (saved === 'day' || saved === 'night') {
        return saved
      }
      return isMoscowDaytime() ? 'day' : 'night'
    }

    const applyTheme = () => {
      const theme = resolveTheme()
      setIsDayTheme(theme === 'day')
      document.documentElement.setAttribute('data-rs-theme', theme)
      document.body.setAttribute('data-rs-theme', theme)
    }

    applyTheme()
    const id = window.setInterval(applyTheme, 60000)
    const onStorage = (event) => {
      if (event.key === THEME_PREFERENCE_KEY) {
        applyTheme()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const showGlobalSearch = useMemo(() => {
    const allowedPrefixes = ['/catalog', '/app']
    const matchesPrefix = allowedPrefixes.some((prefix) =>
      location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
    )

    const isCatalogRoute =
      location.pathname === '/catalog' ||
      location.pathname.startsWith('/catalog/') ||
      location.pathname === '/app/catalog' ||
      location.pathname.startsWith('/app/catalog/')

    // Каталог ресторанов имеет собственный поисковый блок, поэтому общий поиск
    // здесь не показываем, чтобы избежать дублирования.
    if (isCatalogRoute || location.pathname === '/restaurants' || location.pathname.startsWith('/restaurants/')) {
      return false
    }

    return matchesPrefix
  }, [location.pathname])

  return (
    <div className={`min-h-screen flex flex-col app-theme app-theme--${isDayTheme ? 'day' : 'night'}`}>
      <NavBar />
      <DishCardModal />
      <DiaryFloatingButton />
      <IphoneInstallPrompt />
      <main className="flex-1">
        {isImmersivePage ? (
          <Outlet context={outletContext} />
        ) : isContact ? (
          <div className={showPaywall ? 'contact-wrapper locked' : 'contact-wrapper'}>
            <Outlet context={outletContext} />
          </div>
        ) : (
          <div className={showPaywall ? 'container locked' : isLanding ? 'container container--landing' : 'container'}>
            {showGlobalSearch && (
              <div className="app-shell__search">
                <div className="app-shell__search-inner">
                  <SearchInput value={searchQuery} onChange={setSearchQuery} />
                </div>
              </div>
            )}
            <Outlet context={outletContext} />
          </div>
        )}
      </main>
      {!isImmersivePage && <Footer />}
    </div>
  )
}
