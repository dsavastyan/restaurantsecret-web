// Entry point for the Vite-powered React application. We keep the file tiny so
// it stays easy to reason about during hydration.
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Router from './routes/Router.jsx'
import ToastViewport from './components/ui/ToastViewport.tsx'
import MaintenanceScreen from './components/MaintenanceScreen.jsx'
import { ConsentBanner } from './components/ConsentBanner.jsx'
import { analytics } from './services/analytics'
import { loadTelegramWebApp } from './lib/telegram'
import './styles.css'
import './account-mobile-profile.css'

const SPLASH_MAX_WAIT_MS = 15000
const SPLASH_IDLE_MS = 700
let splashGeneration = 0

const initialFetchTracker = (() => {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return { pending: 0 }
  }

  const originalFetch = window.fetch.bind(window)
  const ignoredPatterns = [
    '/api/analytics/event',
    '/api/consent/analytics',
    'mc.yandex.ru',
  ]

  const tracker = {
    pending: 0,
  }

  function getFetchUrl(input) {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.href
    return input?.url || ''
  }

  function shouldTrack(input) {
    const splash = document.getElementById('rs-splash')
    if (!splash || splash.dataset.state === 'hiding') return false

    const url = getFetchUrl(input)
    return !ignoredPatterns.some((pattern) => url.includes(pattern))
  }

  function emitChange() {
    window.dispatchEvent(new Event('rs-initial-fetch-change'))
  }

  function trackedFetch(...args) {
    const track = shouldTrack(args[0])
    if (!track) return originalFetch(...args)

    tracker.pending += 1
    emitChange()

    return originalFetch(...args).finally(() => {
      tracker.pending = Math.max(0, tracker.pending - 1)
      emitChange()
    })
  }

  window.fetch = trackedFetch
  return tracker
})()

loadTelegramWebApp().catch(() => { })

function showInitialSplash() {
  const splash = document.getElementById('rs-splash')
  if (!splash) return

  splashGeneration += 1
  splash.dataset.state = 'shown'
  splash.removeAttribute('aria-hidden')
  splash.classList.remove('rs-splash--hide')
}

function waitForWindowLoad() {
  if (document.readyState === 'complete') return Promise.resolve()

  return new Promise((resolve) => {
    window.addEventListener('load', resolve, { once: true })
  })
}

function waitForFontsReady() {
  if (!document.fonts?.ready) return Promise.resolve()
  return document.fonts.ready.catch(() => { })
}

function isVisible(element) {
  if (!(element instanceof Element)) return false
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && element.getClientRects().length > 0
}

function hasVisibleLoadingState(root) {
  const loadingSelectors = [
    '[aria-busy="true"]',
    '[data-rs-loading="true"]',
    '.catalog-state:not(.catalog-state--empty)',
    '.map-overlay',
    '.favorites-loading',
    '.goals-loading',
    '.dish-card__loading',
    '.account-skeleton',
    '.account-history__item--skeleton',
    '.restaurant-card.skeleton',
    '.search-state',
  ]

  if (loadingSelectors.some((selector) => {
    try {
      return Array.from(root.querySelectorAll(selector)).some(isVisible)
    } catch {
      return false
    }
  })) {
    return true
  }

  return Array.from(root.querySelectorAll('p, div, span'))
    .some((element) => isVisible(element) && /(?:Загружаем|Загрузка|Ищем)/i.test(element.textContent || ''))
}

function getPendingImages(root) {
  return Array.from(root.querySelectorAll('img'))
    .filter((img) => isVisible(img) && !img.complete)
}

function waitForInitialPageSettle() {
  const root = document.getElementById('root')
  if (!root) return Promise.resolve()

  return new Promise((resolve) => {
    const startedAt = performance.now()
    let lastChangedAt = performance.now()
    let done = false
    let timer = 0

    const finish = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      observer.disconnect()
      window.removeEventListener('rs-initial-fetch-change', markChanged)
      resolve()
    }

    const markChanged = () => {
      lastChangedAt = performance.now()
      scheduleCheck()
    }

    const observer = new MutationObserver(markChanged)
    observer.observe(root, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    })

    const scheduleCheck = () => {
      if (done || timer) return
      timer = window.setTimeout(check, 100)
    }

    const check = () => {
      timer = 0
      const now = performance.now()
      const timedOut = now - startedAt >= SPLASH_MAX_WAIT_MS
      const isSettled =
        initialFetchTracker.pending === 0 &&
        getPendingImages(root).length === 0 &&
        !hasVisibleLoadingState(root) &&
        now - lastChangedAt >= SPLASH_IDLE_MS

      if (timedOut || isSettled) {
        finish()
        return
      }

      scheduleCheck()
    }

    window.addEventListener('rs-initial-fetch-change', markChanged)
    scheduleCheck()
  })
}

async function hideInitialSplash() {
  const generation = splashGeneration

  const hide = () => {
    if (generation !== splashGeneration) return

    const splash = document.getElementById('rs-splash')
    if (!splash || splash.dataset.state === 'hiding') return

    splash.dataset.state = 'hiding'
    splash.setAttribute('aria-hidden', 'true')
    splash.classList.add('rs-splash--hide')
    window.setTimeout(() => {
      if (splash.dataset.state === 'hiding') {
        splash.dataset.state = 'hidden'
      }
    }, 550)
  }

  const hideAfterPaint = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(hide)
    })
  }

  await Promise.race([
    Promise.all([
      waitForWindowLoad(),
      waitForFontsReady(),
      waitForInitialPageSettle(),
    ]),
    new Promise((resolve) => window.setTimeout(resolve, SPLASH_MAX_WAIT_MS)),
  ])

  hideAfterPaint()
}

// Register the service worker (if supported) once the page has fully loaded so
// network caching can work in production. Errors are intentionally swallowed to
// avoid surfacing noisy warnings to end users.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => { })
  })
}

/**
 * Root wrapper that handles global maintenance state before mounting the router.
 */
function Root() {
  const [maintenance, setMaintenance] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Analytics: Session Start
    analytics.trackSessionStart().catch(() => { })
    analytics.trackLandingAttribution().catch(() => { })

    // Analytics: Session End / Duration (Simplified)
    const handleUnload = () => {
      // We could track session_end here with navigator.sendBeacon if needed
      // For now, mostly relying on session_start metadata and backend analysis
    }
    window.addEventListener('pagehide', handleUnload)

    // Fetch the maintenance kill-switch from public folder. Use a cache-busting
    // timestamp to ensure we get the latest version from GitHub Pages.
    fetch(`/maintenance.json?ts=${Date.now()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return setMaintenance(null)

        // Bypass logic: Check URL parameter first, then localStorage
        const params = new URLSearchParams(window.location.search)
        const bypassParam = params.get('bypass')
        const storedBypass = localStorage.getItem('rs_maint_bypass')

        if (data.enabled && data.bypassKey) {
          if (bypassParam === data.bypassKey) {
            localStorage.setItem('rs_maint_bypass', data.bypassKey)
            return setMaintenance({ ...data, enabled: false }) // Disable for this session
          }

          if (storedBypass === data.bypassKey) {
            return setMaintenance({ ...data, enabled: false }) // Disable for this session
          }
        }

        setMaintenance(data)
      })
      .catch(() => setMaintenance(null))
      .finally(() => setReady(true))

    return () => {
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [])

  useEffect(() => {
    if (ready && maintenance?.enabled) {
      hideInitialSplash()
    }
  }, [ready, maintenance?.enabled])

  if (!ready) return null

  if (maintenance?.enabled) {
    return <MaintenanceScreen cfg={maintenance} />
  }

  return (
    <Router onRouteStart={showInitialSplash} onReady={hideInitialSplash}>
      <ToastViewport />
      <ConsentBanner />
    </Router>
  )
}

// Mount the root component.
createRoot(document.getElementById('root')).render(<Root />)
