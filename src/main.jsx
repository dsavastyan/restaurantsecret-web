import React from 'react'
import { createRoot } from 'react-dom/client'
import Router from './routes/Router.jsx'
import './styles.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(<Router />)
