// Entry point for the Vite-powered React application. We keep the file tiny so
// it stays easy to reason about during hydration.
import React from 'react'
import { createRoot } from 'react-dom/client'
import Router from './routes/Router.jsx'
import './styles.css'

// Register the service worker (if supported) once the page has fully loaded so
// network caching can work in production. Errors are intentionally swallowed to
// avoid surfacing noisy warnings to end users.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  })
}

// Mount the root router. The Router component contains all route definitions.
createRoot(document.getElementById('root')).render(<Router />)
