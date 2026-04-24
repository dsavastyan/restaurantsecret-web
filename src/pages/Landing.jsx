import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import RestaurantMap from '@/components/RestaurantMap'
import { CookieSettingsModal } from '@/components/CookieSettingsModal'
import { postSuggest } from '@/lib/api'
import { isMoscowDaytime } from '@/lib/moscowDaytime'
import { toast } from '@/lib/toast'
import { useAuth } from '@/store/auth'
import { analytics } from '@/services/analytics'

const STATS_FALLBACK = {
  restaurants: 412,
  dishes: 38240,
  points: 1080,
  weeklyAdded: 17,
}

const POPULAR_QUERIES = ['Том ям', 'боул с лососем', 'салат цезарь', 'стейк', 'паста']

const SAMPLE_DISHES = [
  {
    id: 91001,
    name: 'Сибас с томатами',
    restaurant: 'Duo Asia',
    kcal: 247,
    p: 16,
    f: 17,
    c: 5,
    tag: 'до 300 ккал',
  },
  {
    id: 91002,
    name: 'Пепперони',
    restaurant: 'Cafe Pushkin',
    kcal: 854,
    p: 32,
    f: 24,
    c: 14,
    tag: 'белковый',
  },
  {
    id: 91003,
    name: 'Кекс шоколадный брауни',
    restaurant: 'Probka',
    kcal: 504,
    p: 28,
    f: 36,
    c: 62,
    tag: 'читмил',
  },
]

const FEATURED_RESTAURANTS = [
  { name: 'Cafe Pushkin', dishes: 18 },
  { name: 'White Rabbit', dishes: 34 },
  { name: 'Probka', dishes: 12 },
  { name: 'Duo Asia', dishes: 56 },
  { name: 'Bluefin', dishes: 28 },
  { name: 'Torro Grill', dishes: 41 },
  { name: 'Tanuki', dishes: 78 },
  { name: 'Bjorn', dishes: 22 },
  { name: 'Ruski', dishes: 15 },
  { name: 'Twins Garden', dishes: 31 },
  { name: 'Dr. Zhivago', dishes: 19 },
  { name: 'Chicha', dishes: 44 },
]

const VALUE_CARDS = [
  {
    title: 'До 40% точнее',
    description: 'Чем усредненные калькуляторы калорий: данные от ресторанов.',
  },
  {
    title: '< 5 секунд',
    description: 'Время на поиск ресторана и подходящего блюда.',
  },
  {
    title: 'Цели без компромиссов',
    description: 'Выбирайте меню под вашу норму по фильтрам в 2 клика.',
  },
  {
    title: 'Все в одном месте',
    description: 'Ставь цели, добавляй любимые блюда и места в избранное, веди дневник, делись с друзьями.',
  },
]

function buildSearchUrl(query) {
  return `/search?q=${encodeURIComponent(query)}&type=dish`
}

function resolveThemeMode() {
  const htmlTheme = document.documentElement.getAttribute('data-rs-theme')
  if (htmlTheme === 'day' || htmlTheme === 'night') return htmlTheme
  return isMoscowDaytime() ? 'day' : 'night'
}

export default function Landing() {
  const navigate = useNavigate()
  const location = useLocation()
  const accessToken = useAuth((state) => state.accessToken)
  const accessTokenOrUndefined = accessToken || undefined

  const [themeMode, setThemeMode] = useState(resolveThemeMode)
  const [stats, setStats] = useState({ restaurants: 0, points: 0, weeklyAdded: 0 })
  const [query, setQuery] = useState('')
  const [likedDishIds, setLikedDishIds] = useState(() => new Set())
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false)
  const [restaurant, setRestaurant] = useState('')
  const [dish, setDish] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const suggestZoneRef = useRef(null)

  const resolvedStats = useMemo(() => ({
    restaurants: stats.restaurants > 0 ? stats.restaurants : STATS_FALLBACK.restaurants,
    dishes: STATS_FALLBACK.dishes,
    points: stats.points > 0 ? stats.points : STATS_FALLBACK.points,
    weeklyAdded: stats.weeklyAdded > 0 ? stats.weeklyAdded : STATS_FALLBACK.weeklyAdded,
  }), [stats.points, stats.restaurants, stats.weeklyAdded])

  useEffect(() => {
    analytics.track('landing_open')
    analytics.trackLandingAttribution().catch(() => { })
  }, [])

  useEffect(() => {
    const updateTheme = () => setThemeMode(resolveThemeMode())
    updateTheme()
    const id = window.setInterval(updateTheme, 60000)

    const observer = new MutationObserver((changes) => {
      if (changes.some((change) => change.attributeName === 'data-rs-theme')) {
        updateTheme()
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-rs-theme'],
    })

    const onStorage = (event) => {
      if (event.key === 'rs_theme_preference') {
        updateTheme()
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      window.clearInterval(id)
      observer.disconnect()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    if (!suggestOpen) return

    function handleClickOutside(event) {
      if (!suggestZoneRef.current?.contains(event.target)) {
        setSuggestOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setSuggestOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [suggestOpen])

  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (sectionId === 'restaurants') {
      navigate('/restaurants')
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    analytics.track('search_submit', { type: 'query', query: trimmed })
    navigate(buildSearchUrl(trimmed))
  }

  function handlePopularClick(value) {
    setQuery(value)
    analytics.track('search_submit', { type: 'query', query: value, source: 'landing_popular_chip' })
    navigate(buildSearchUrl(value))
  }

  function toggleDishLike(dishId) {
    setLikedDishIds((previous) => {
      const next = new Set(previous)
      if (next.has(dishId)) {
        next.delete(dishId)
      } else {
        next.add(dishId)
      }
      return next
    })
  }

  async function handleSuggestSubmit(event) {
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
        accessTokenOrUndefined,
      )
      toast.success('Заявка отправлена')
      setRestaurant('')
      setDish('')
      setCity('')
      setEmail('')
      setSuggestOpen(false)
    } catch (error) {
      console.error('Failed to submit suggestion', error)
      toast.error('Не удалось отправить заявку. Попробуйте еще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <main className={`landing-warm landing-warm--${themeMode}`} data-theme={themeMode}>
        <header className="landing-warm__nav">
          <div className="landing-warm__nav-left">
            <Link to="/" className="landing-warm__brand-link" aria-label="RestaurantSecret">
              <img src="/assets/logo.png" alt="" aria-hidden="true" className="landing-warm__logo" />
              <span className="landing-warm__brand">RestaurantSecret</span>
            </Link>
          </div>

          <nav className="landing-warm__nav-center" aria-label="Разделы">
            <button type="button" onClick={() => scrollToSection('restaurants-list')}>Рестораны</button>
            <button type="button" onClick={() => scrollToSection('why')}>Как работает</button>
            <Link to="/tariffs">Тарифы</Link>
            <a href="https://t.me/RestSecretSupport_bot" target="_blank" rel="noopener noreferrer">Поддержка</a>
          </nav>

          <div className="landing-warm__nav-right">
            {accessToken ? (
              <Link to="/account" className="landing-warm__login-link">Личный кабинет</Link>
            ) : (
              <Link
                to="/login"
                state={{ from: location.pathname + location.search }}
                className="landing-warm__login-link"
              >
                Войти
              </Link>
            )}
            <Link to="/onboarding/welcome" className="landing-warm__nav-cta">
              Попробовать бесплатно
            </Link>
          </div>
        </header>

        <section className="landing-warm__hero" id="top">
          <h1 className="landing-warm__hero-title">
            Ешь <em>вкусно</em>,
            <br />
            выбирай <span className="landing-warm__hero-underlined">осознанно</span>.
          </h1>

          <p className="landing-warm__hero-subtitle">
            Все меню ресторанов с КБЖУ и составом блюд
          </p>

          <form className="landing-warm__search" onSubmit={handleSearchSubmit}>
            <span className="landing-warm__search-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ресторан, блюдо или кухня..."
              aria-label="Поиск ресторана или блюда"
            />
            <button type="submit">Найти</button>
          </form>

          <div className="landing-warm__chips" aria-label="Популярные запросы">
            <span className="landing-warm__chips-label">Популярно:</span>
            {POPULAR_QUERIES.map((item) => (
              <button
                key={item}
                type="button"
                className="landing-warm__chip"
                onClick={() => handlePopularClick(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="landing-warm__stats">
            <div className="landing-warm__stat">
              <p>{resolvedStats.restaurants}</p>
              <span>ресторанов в базе</span>
            </div>
            <div className="landing-warm__stat">
              <p>{resolvedStats.dishes.toLocaleString('ru-RU')}</p>
              <span>блюд с полным КБЖУ</span>
            </div>
            <div className="landing-warm__stat">
              <p>+{resolvedStats.weeklyAdded}</p>
              <span>новых за эту неделю</span>
            </div>
          </div>
        </section>

        <section className="landing-warm__dishes" aria-labelledby="dish-preview-title">
          <div className="landing-warm__section-head">
            <h2 id="dish-preview-title">
              Каждое блюдо <em>разобрано</em> до грамма
            </h2>
            <p>Фильтруйте по целям и выбирайте то, что подходит.</p>
          </div>

          <div className="landing-warm__dish-grid">
            {SAMPLE_DISHES.map((dishCard) => {
              const isLiked = likedDishIds.has(dishCard.id)
              return (
                <article key={dishCard.id} className="landing-warm__dish-card">
                  <div className="landing-warm__dish-head">
                    <div>
                      <span>{dishCard.restaurant}</span>
                      <h3>{dishCard.name}</h3>
                    </div>
                    <strong>{dishCard.tag}</strong>
                  </div>

                  <div className="landing-warm__dish-kbzhu">
                    <KbzhuDonut p={dishCard.p} f={dishCard.f} c={dishCard.c} kcal={dishCard.kcal} />
                    <KbzhuBars p={dishCard.p} f={dishCard.f} c={dishCard.c} />
                  </div>

                  <div className="landing-warm__dish-actions">
                    <button
                      type="button"
                      className={`landing-warm__dish-like ${isLiked ? 'is-liked' : ''}`}
                      onClick={() => toggleDishLike(dishCard.id)}
                      aria-label={isLiked ? 'Убрать из избранного' : 'Добавить в избранное'}
                    >
                      <HeartIcon />
                    </button>
                    <button
                      type="button"
                      className="landing-warm__dish-diary"
                      onClick={() => navigate(buildSearchUrl(dishCard.name))}
                    >
                      В дневник →
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="landing-warm__why" id="why">
          <div className="landing-warm__why-title-wrap">
            <h2>
              Рестораны не предавая <em>цели</em>
            </h2>
          </div>
          <div className="landing-warm__why-grid">
            {VALUE_CARDS.map((item, index) => (
              <article key={item.title} className={`landing-warm__why-card landing-warm__why-card--${index + 1}`}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-warm__featured" id="restaurants-list">
          <div className="landing-warm__featured-head">
            <h2>
              От камерных бистро до <em>звездных</em> ресторанов
            </h2>
          </div>

          <div className="landing-warm__featured-columns">
            {FEATURED_RESTAURANTS.map((restaurantItem) => (
              <div key={restaurantItem.name} className="landing-warm__featured-row">
                <span>{restaurantItem.name}</span>
                <small>{restaurantItem.dishes} блюд</small>
              </div>
            ))}
          </div>

          <p className="landing-warm__featured-caption">- и еще 400+ заведений Москвы -</p>

          <div className="landing-warm__suggest" ref={suggestZoneRef}>
            <button
              type="button"
              className="landing-warm__suggest-trigger"
              onClick={() => setSuggestOpen((previous) => !previous)}
              aria-expanded={suggestOpen}
            >
              Не нашли нужный ресторан или блюдо?
            </button>
            {suggestOpen && (
              <div className="suggest-popover" role="dialog" aria-label="Форма заявки" aria-modal="false">
                <div className="suggest-popover__header">
                  <p className="suggest-popover__title">Расскажите, что нужно добавить</p>
                  <button type="button" className="suggest-popover__close" onClick={() => setSuggestOpen(false)} aria-label="Закрыть">
                    ×
                  </button>
                </div>
                <form className="suggest-popover__form" onSubmit={handleSuggestSubmit} noValidate>
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
                    {submitting ? 'Отправляем...' : 'Отправить'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        <section className="landing-warm__map" id="map">
          <div className="landing-warm__map-frame">
            <RestaurantMap
              themeMode={themeMode}
              showSummaryHeader={false}
              onStatsChange={setStats}
            />

            <aside className="landing-warm__map-overlay">
              <h3>{resolvedStats.points.toLocaleString('ru-RU')} точек на карте Москвы</h3>
              <p>Посмотрите ближайшие рестораны и их меню.</p>
              <Link to="/catalog">Открыть карту →</Link>
            </aside>
          </div>
        </section>

        <section className="landing-warm__cta">
          <h2>
            Попробуйте <em>бесплатно</em>.
          </h2>
          <p>Первые 7 дней - доступ ко всей базе ресторанов.</p>
          <div className="landing-warm__cta-actions">
            <Link to="/onboarding/welcome" className="landing-warm__cta-primary">Начать бесплатно</Link>
            <Link to="/restaurants" className="landing-warm__cta-secondary">Посмотреть меню</Link>
          </div>
        </section>

        <footer className="landing-warm__footer">
          <div className="landing-warm__footer-links">
            <Link to="/legal">Пользовательское соглашение</Link>
            <Link to="/privacy">Политика конфиденциальности</Link>
            <Link to="/tariffs">Тарифы</Link>
            <Link to="/licenses">Лицензии</Link>
            <button type="button" onClick={() => setIsCookieModalOpen(true)}>Настройки cookies</button>
            <Link to="/contact">Контакты</Link>
            <a href="https://t.me/RestSecretSupport_bot" target="_blank" rel="noopener noreferrer">Поддержка</a>
            <Link to="/feedback">Оставить отзыв</Link>
          </div>

          <div className="landing-warm__footer-meta">
            <span>© 2026 RestaurantSecret</span>
            <span>•</span>
            <span>Самозанятое лицо (НПД), Савастьян Дарья, ИНН 771007750946</span>
          </div>
        </footer>
      </main>

      <CookieSettingsModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />
    </>
  )
}

function KbzhuDonut({ p, f, c, kcal }) {
  const size = 88
  const stroke = 10
  const total = Math.max(p + f + c, 1)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const cx = size / 2
  const cy = size / 2

  const segments = [
    { fraction: p / total, color: 'var(--warm-p)' },
    { fraction: f / total, color: 'var(--warm-f)' },
    { fraction: c / total, color: 'var(--warm-c)' },
  ]

  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--warm-donut-track)"
        strokeWidth={stroke}
      />
      {segments.map((segment, index) => {
        const length = circumference * segment.fraction
        const arc = (
          <circle
            key={`${segment.color}-${index}`}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )
        offset += length
        return arc
      })}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--warm-ink)"
        style={{ font: '700 16px Inter, ui-sans-serif, system-ui' }}
      >
        {kcal}
      </text>
      <text
        x="50%"
        y={cy + 14}
        textAnchor="middle"
        fill="var(--warm-ink-soft)"
        style={{ font: '600 9px Inter, ui-sans-serif, system-ui', letterSpacing: 0.4 }}
      >
        ККАЛ
      </text>
    </svg>
  )
}

function KbzhuBars({ p, f, c }) {
  const total = Math.max(p + f + c, 1)

  return (
    <div className="landing-warm__bars">
      <div className="landing-warm__bars-track">
        <div style={{ width: `${(p / total) * 100}%`, background: 'var(--warm-p)' }} />
        <div style={{ width: `${(f / total) * 100}%`, background: 'var(--warm-f)' }} />
        <div style={{ width: `${(c / total) * 100}%`, background: 'var(--warm-c)' }} />
      </div>
      <div className="landing-warm__bars-legend">
        <span><b style={{ color: 'var(--warm-p)' }}>●</b> Б {p}г</span>
        <span><b style={{ color: 'var(--warm-f)' }}>●</b> Ж {f}г</span>
        <span><b style={{ color: 'var(--warm-c)' }}>●</b> У {c}г</span>
      </div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
