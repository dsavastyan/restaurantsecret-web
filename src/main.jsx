// Entry point for the Vite-powered React application. We keep the file tiny so
// it stays easy to reason about during hydration.
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Router from './routes/Router.jsx'
import ToastViewport from './components/ui/ToastViewport.tsx'
import MaintenanceScreen from './components/MaintenanceScreen.jsx'
import './styles.css'

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
  }, [])

  if (!ready) return null // Initial loading state (splash screen could go here)

  if (maintenance?.enabled) {
    return <MaintenanceScreen cfg={maintenance} />
  }

  return (
    <>
      <Router />
      <ToastViewport />
    </>
  )
}

// Mount the root component.
createRoot(document.getElementById('root')).render(<Root />)
