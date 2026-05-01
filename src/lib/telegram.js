let telegramLoader = null

function hasTelegramParams(searchParams) {
  const keys = new Set(Array.from(searchParams.keys(), (key) => key.toLowerCase()))
  return (
    keys.has('tgwebappdata') ||
    keys.has('tgwebappversion') ||
    keys.has('tgwebappplatform') ||
    keys.has('tgwebappstartparam')
  )
}

export function isTelegramLaunch() {
  if (typeof window === 'undefined') return false
  if (window.Telegram?.WebApp) return true

  const params = new URLSearchParams(window.location.search)
  if (hasTelegramParams(params)) return true

  const hash = window.location.hash || ''
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return false

  return hasTelegramParams(new URLSearchParams(hash.slice(queryIndex + 1)))
}

export function loadTelegramWebApp() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!isTelegramLaunch()) return Promise.resolve(null)
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp)
  if (telegramLoader) return telegramLoader

  telegramLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-rs-telegram-web-app]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Telegram?.WebApp || null), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.async = true
    script.dataset.rsTelegramWebApp = 'true'
    script.onload = () => resolve(window.Telegram?.WebApp || null)
    script.onerror = reject
    document.head.appendChild(script)
  })

  return telegramLoader
}
