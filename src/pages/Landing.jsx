import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import SearchInput from '@/components/SearchInput'
import RestaurantMap from '@/components/RestaurantMap'
import { postSuggest } from '@/lib/api'
import { isMoscowDaytime } from '@/lib/moscowDaytime'
import { toast } from '@/lib/toast'
import { useAuth } from '@/store/auth'
import { analytics } from '@/services/analytics'

function getRussianPluralWord(count, one, few, many) {
  const value = Math.abs(Number(count)) % 100
  const lastDigit = value % 10

  if (value >= 11 && value <= 14) return many
  if (lastDigit === 1) return one
  if (lastDigit >= 2 && lastDigit <= 4) return few
  return many
}

export default function Landing() {
  const [themeMode, setThemeMode] = useState(() => (isMoscowDaytime() ? 'day' : 'night'))

  useEffect(() => {
    const updateTheme = () => setThemeMode(isMoscowDaytime() ? 'day' : 'night')
    updateTheme()
    const id = window.setInterval(updateTheme, 60000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <main className={`landing landing--${themeMode}`} data-theme={themeMode}>
      <Hero />
      <RestaurantsSection themeMode={themeMode} />
    </main>
  )
}

function Hero() {
  const [query, setQuery] = useState('')

  useEffect(() => {
    analytics.track('landing_open')
  }, [])

  return (
    <header className="hero" aria-labelledby="hero-title">
      <div className="hero__motto-wrap" aria-label="Слоган">
        <p className="hero__motto">Ешь вкусно, выбирай осознанно</p>
      </div>

      <h1 id="hero-title" className="hero__title">
        Все меню ресторанов
        <br />
        с КБЖУ и составом блюд
      </h1>

      <div className="hero__inline-benefits" aria-label="Преимущества">
        <div className="hero__inline-benefit">
          <span className="hero__inline-icon" aria-hidden="true">🕓</span>
          <span className="hero__inline-text">Всё в одном месте</span>
        </div>
        <div className="hero__inline-benefit">
          <span className="hero__inline-icon" aria-hidden="true">🍽️</span>
          <span className="hero__inline-text">Выбирай в 2 клика, не выходя за цели</span>
        </div>
      </div>

      <div className="hero__search">
        <SearchInput value={query} onChange={setQuery} />
      </div>
    </header>
  )
}

function RestaurantsSection({ themeMode }) {
  const [stats, setStats] = useState({ restaurants: 0, points: 0, weeklyAdded: 0 })
  const [suggestOpen, setSuggestOpen] = useState(false)
  const suggestZoneRef = useRef(null)

  useEffect(() => {
    if (!suggestOpen) return

    function handleClickOutside(event) {
      if (!suggestZoneRef.current?.contains(event.target)) {
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
    <section className="restaurants" aria-label="Карта ресторанов">
      <div className="container">
        <div className="section-heading">
          <h2 id="restaurants-title" className="section-title">Мы уже собрали меню этих ресторанов</h2>
          <p className="restaurants__count">
            {stats.restaurants} {getRussianPluralWord(stats.restaurants, 'ресторан', 'ресторана', 'ресторанов')} • {stats.points} точек
          </p>
          <p className="restaurants__updates">
            Постоянное обновление: на этой неделе добавили {stats.weeklyAdded} {getRussianPluralWord(stats.weeklyAdded, 'ресторан', 'ресторана', 'ресторанов')}
          </p>
          <div className="restaurants__suggest" ref={suggestZoneRef}>
            <button
              type="button"
              className="hero__suggest-trigger restaurants__suggest-trigger"
              onClick={() => setSuggestOpen((prev) => !prev)}
              aria-expanded={suggestOpen}
            >
              Не нашли нужный ресторан или блюдо?
            </button>
            {suggestOpen && <SuggestPopover onClose={() => setSuggestOpen(false)} />}
          </div>
        </div>

        <RestaurantMap
          themeMode={themeMode}
          showSummaryHeader={false}
          onStatsChange={setStats}
        />

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
