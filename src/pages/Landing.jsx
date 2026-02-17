import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import SearchInput from '@/components/SearchInput'
import RestaurantMap from '@/components/RestaurantMap'
import { postSuggest } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useAuth } from '@/store/auth'
import { analytics } from '@/services/analytics'

export default function Landing() {
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') return 'day'
    const saved = window.localStorage.getItem('rs_landing_theme')
    if (saved === 'night' || saved === 'day') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('rs_landing_theme', themeMode)
  }, [themeMode])

  return (
    <main className={`landing landing--${themeMode}`} data-theme={themeMode}>
      <Hero
        themeMode={themeMode}
        onToggleTheme={() => setThemeMode((prev) => (prev === 'day' ? 'night' : 'day'))}
      />
      <WhyImportant />
      <RestaurantsSection themeMode={themeMode} />
    </main>
  )
}

function Hero({ themeMode, onToggleTheme }) {
  const [query, setQuery] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)
  const searchZoneRef = useRef(null)

  useEffect(() => {
    analytics.track('landing_open')
  }, [])

  useEffect(() => {
    if (!suggestOpen) return

    function handleClickOutside(event) {
      if (!searchZoneRef.current?.contains(event.target)) {
        setSuggestOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSuggestOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [suggestOpen])

  return (
    <header className="hero" aria-labelledby="hero-title">
      <div className="hero__topline">
        <div className="hero__brand">
          <img src="/assets/logo.png" alt="RestaurantSecret" className="brand__logo" />
          <span className="brand__name">RestaurantSecret</span>
        </div>
        <button type="button" className="theme-switch" onClick={onToggleTheme}>
          {themeMode === 'night' ? 'Дневной режим' : 'Ночной режим'}
        </button>
      </div>

      <h1 id="hero-title" className="hero__title">
        Все меню ресторанов
        <br />
        с КБЖУ и составом
        <br />
        блюд
      </h1>

      <p className="hero__subtitle">Ешь вкусно, выбирай осознанно</p>

      <div className="hero__search" ref={searchZoneRef}>
        <SearchInput value={query} onChange={setQuery} />
        <button
          type="button"
          className="hero__suggest-trigger"
          onClick={() => setSuggestOpen((prev) => !prev)}
          aria-expanded={suggestOpen}
        >
          Не нашли нужный ресторан или блюдо?
        </button>
        {suggestOpen && <SuggestPopover onClose={() => setSuggestOpen(false)} />}
      </div>
    </header>
  )
}

function WhyImportant() {
  return (
    <section className="benefits" aria-label="Преимущества">
      <div className="container">
        <ul className="benefits__grid">
          <li className="benefit-card">
            <div className="benefit-icon" aria-hidden="true">🕓</div>
            <div className="benefit-text">Всё в одном месте</div>
          </li>

          <li className="benefit-card">
            <div className="benefit-icon" aria-hidden="true">🎯</div>
            <div className="benefit-text">Выбирай в 2 клика, не выходя за цели</div>
          </li>
        </ul>
      </div>
    </section>
  )
}

function RestaurantsSection({ themeMode }) {
  return (
    <section className="restaurants" aria-label="Карта ресторанов">
      <div className="container">
        <div className="section-heading">
          <h2 id="restaurants-title" className="section-title">Мы уже собрали меню этих ресторанов</h2>
          <p className="section-subtitle">Найдите любимое заведение на карте</p>
        </div>

        <RestaurantMap themeMode={themeMode} />

        <div className="center">
          <Link className="btn btn--outline" to="/restaurants">Показать все списком</Link>
        </div>
      </div>
    </section>
  )
}

function SuggestPopover({ onClose }) {
  const accessToken = useAuth((state) => state.accessToken)
  const accessTokenOrUndefined = accessToken || undefined
  const [restaurant, setRestaurant] = useState('')
  const [dish, setDish] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedRestaurant = restaurant.trim()
    if (!trimmedRestaurant) {
      setValidationError('Укажите название ресторана')
      return
    }

    setValidationError('')
    setSubmitting(true)

    try {
      await postSuggest(
        {
          name: trimmedRestaurant,
          dish_name: dish.trim() || null,
          city: city.trim() || null,
          email: email.trim() || null,
        },
        accessTokenOrUndefined
      )
      toast.success('Заявка отправлена')
      setRestaurant('')
      setDish('')
      setCity('')
      setEmail('')
      onClose?.()
    } catch (error) {
      console.error('Failed to submit suggestion', error)
      toast.error('Не удалось отправить заявку. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="suggest-popover" role="dialog" aria-label="Форма заявки" aria-modal="false">
      <div className="suggest-popover__header">
        <p className="suggest-popover__title">Расскажите, что нужно добавить</p>
        <button type="button" className="suggest-popover__close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
      </div>
      <form className="suggest-popover__form" onSubmit={handleSubmit} noValidate>
        <label className="suggest-popover__field">
          <span>Ресторан *</span>
          <input
            type="text"
            value={restaurant}
            onChange={(event) => {
              setRestaurant(event.target.value)
              if (validationError) setValidationError('')
            }}
            placeholder="Например, Cafe Pushkin"
            required
            className={validationError ? 'is-invalid' : ''}
          />
        </label>

        <label className="suggest-popover__field">
          <span>Блюдо</span>
          <input
            type="text"
            value={dish}
            onChange={(event) => setDish(event.target.value)}
            placeholder="Например, Том ям"
          />
        </label>

        <label className="suggest-popover__field">
          <span>Город</span>
          <input type="text" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Москва" />
        </label>

        <label className="suggest-popover__field">
          <span>Email для обратной связи</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" inputMode="email" />
        </label>

        {validationError && (
          <p className="hint hint--error" role="status">
            {validationError}
          </p>
        )}

        <button className="btn btn--primary" type="submit" disabled={submitting}>
          {submitting ? 'Отправляем…' : 'Отправить'}
        </button>
      </form>
    </div>
  )
}
