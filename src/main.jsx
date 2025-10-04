import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

const inTelegram = typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp;
const Router = inTelegram ? HashRouter : BrowserRouter;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <Router>
    <App />
  </Router>
)
