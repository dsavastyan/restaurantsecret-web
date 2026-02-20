import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const PROMPT_DELAY_MS = 15000
const REOPEN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
const DISMISSED_AT_KEY = 'rs_ios_install_prompt_dismissed_at'

const STEP_ONE_IMAGES = {
  rus: '/assets/web%20app%20instruction/add-to-home-rus.png',
  eng: '/assets/web%20app%20instruction/add-to-home-eng.png'
}

const STEP_THREE_IMAGES = {
  rus: '/assets/web%20app%20instruction/web-app-view-rus.png',
  eng: '/assets/web%20app%20instruction/web-app-view-eng.png'
}

function isIphoneSafari() {
  if (typeof window === 'undefined') return false
  if (window.Telegram?.WebApp) return false

  const ua = window.navigator.userAgent || ''
  const isIphone = /iPhone/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/i.test(ua)

  return isIphone && isSafari
}

function isInstalledPwa() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function getDismissedAt() {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(DISMISSED_AT_KEY)
  if (!value) return null
  const timestamp = Number(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

export default function IphoneInstallPrompt() {
  const defaultLang =
    typeof window !== 'undefined' && (window.navigator.language || '').toLowerCase().startsWith('ru')
      ? 'rus'
      : 'eng'
  const [isOpen, setIsOpen] = useState(false)
  const [stepOneLang, setStepOneLang] = useState(defaultLang)
  const [stepThreeLang, setStepThreeLang] = useState(defaultLang)
  const timerRef = useRef(null)

  const isEligibleDevice = useMemo(() => isIphoneSafari(), [])

  useEffect(() => {
    if (!isEligibleDevice || isInstalledPwa()) return

    const dismissedAt = getDismissedAt()
    if (dismissedAt && Date.now() - dismissedAt < REOPEN_INTERVAL_MS) return

    const startTimer = () => {
      if (timerRef.current) return
      timerRef.current = window.setTimeout(() => {
        if (!isInstalledPwa()) {
          setIsOpen(true)
        }
      }, PROMPT_DELAY_MS)

      window.removeEventListener('pointerdown', startTimer)
      window.removeEventListener('touchstart', startTimer)
      window.removeEventListener('keydown', startTimer)
      window.removeEventListener('scroll', startTimer)
    }

    window.addEventListener('pointerdown', startTimer, { passive: true })
    window.addEventListener('touchstart', startTimer, { passive: true })
    window.addEventListener('keydown', startTimer)
    window.addEventListener('scroll', startTimer, { passive: true })

    const reevaluateInstall = () => {
      if (isInstalledPwa()) {
        setIsOpen(false)
      }
    }

    document.addEventListener('visibilitychange', reevaluateInstall)

    return () => {
      window.removeEventListener('pointerdown', startTimer)
      window.removeEventListener('touchstart', startTimer)
      window.removeEventListener('keydown', startTimer)
      window.removeEventListener('scroll', startTimer)
      document.removeEventListener('visibilitychange', reevaluateInstall)
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [isEligibleDevice])

  const handleClose = () => {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
    setIsOpen(false)
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="ios-install-prompt__overlay" role="dialog" aria-modal="true" aria-label="Установка веб-приложения">
      <div className="ios-install-prompt">
        <button type="button" className="ios-install-prompt__close" onClick={handleClose} aria-label="Закрыть">
          ×
        </button>

        <img className="ios-install-prompt__logo" src="/assets/logo.png" alt="RestSecret" />

        <div className="ios-install-prompt__card">
          <h2 className="ios-install-prompt__title">Установите<br />веб-приложение<br />для айфона</h2>
          <ol className="ios-install-prompt__steps">
            <li>Нажмите на иконку <strong>Поделиться</strong>.</li>
            <li>В выпадающем меню найдите <br />На экран Домой -&gt; Добавить.</li>
          </ol>
        </div>

        <div className="ios-install-prompt__lang-row">
          <button
            type="button"
            className={`ios-install-prompt__lang ${stepOneLang === 'rus' ? 'is-active' : ''}`}
            onClick={() => setStepOneLang('rus')}
          >
            Рус
          </button>
          <button
            type="button"
            className={`ios-install-prompt__lang ${stepOneLang === 'eng' ? 'is-active' : ''}`}
            onClick={() => setStepOneLang('eng')}
          >
            Eng
          </button>
        </div>

        <img className="ios-install-prompt__image" src={STEP_ONE_IMAGES[stepOneLang]} alt="Шаг добавления на экран домой" />

        <p className="ios-install-prompt__step-three">3. Настройте веб-приложение по инструкции ниже.</p>

        <div className="ios-install-prompt__lang-row">
          <button
            type="button"
            className={`ios-install-prompt__lang ${stepThreeLang === 'rus' ? 'is-active' : ''}`}
            onClick={() => setStepThreeLang('rus')}
          >
            Рус
          </button>
          <button
            type="button"
            className={`ios-install-prompt__lang ${stepThreeLang === 'eng' ? 'is-active' : ''}`}
            onClick={() => setStepThreeLang('eng')}
          >
            Eng
          </button>
        </div>

        <img className="ios-install-prompt__image" src={STEP_THREE_IMAGES[stepThreeLang]} alt="Шаг настройки веб-приложения" />

        <a className="ios-install-prompt__support" href="/contact">
          Поддержка
        </a>
      </div>
    </div>,
    document.body
  )
}
