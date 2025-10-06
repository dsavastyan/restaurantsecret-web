// Landing.jsx — MVP landing page for RestaurantSecret
// Assumptions:
// - React + Vite SPA already set up
// - Global stylesheet (styles.css) exists; this file adds semantic classNames
// - API base: https://api.restaurantsecret.ru
// - No payment/subscription flows here (frozen by product decision)
// - Chips under "Почему это важно" are examples only (non-clickable)
// - SEO meta tags to be placed in index.html (not here)

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { API_BASE } from '@/config/api'

export default function Landing() {
  return (
    <main className="landing">
      <Hero />
      <WhyImportant />
      <RestaurantsSection />
      <SuggestRestaurant />
      <Footer />
    </main>
  )
}

function Hero() {
  return (
    <header className="hero" aria-labelledby="hero-title">
      <div className="hero__brand">
        <img src="/assets/logo.png" alt="RestaurantSecret" className="brand__logo" />
        <span className="brand__name">RestaurantSecret</span>
      </div>

      <h1 id="hero-title" className="hero__title">
        Все меню ресторанов
        <br />
        с КБЖУ и составом
        <br />
        блюд
      </h1>

      <p className="hero__subtitle">Ешь вкусно, выбирай осознанно.</p>

      <Link to="/restaurants" className="hero__cta">
        Посмотреть рестораны
      </Link>
    </header>
  )
}

function WhyImportant() {
  return (
    <section className="why" aria-labelledby="why-title">
      <div className="container">
        <h2 id="why-title" className="section-title">Почему это важно</h2>
        <div className="why__cards">
          <Card icon="🕒" title="Экономь время" text="Больше не ищи меню по сайтам." />
          <Card icon="🍽️" title="Планируй питание" text="Заранее подбирай блюда по КБЖУ." />
          <Card icon="💪" title="Контролируй рацион" text="Выбирай, не выходя за цели." />
        </div>
        <p className="why__example" aria-label="Примеры фильтров">
          Выбирай по параметрам: <span className="chip">💪 Много белка</span>
          <span className="dot" />
          <span className="chip">🥗 Мало жиров</span>
          <span className="dot" />
          <span className="chip">🔥 Мало калорий</span>
        </p>
      </div>
    </section>
  )
}

function RestaurantsSection() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let aborted = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE}/restaurants?limit=24`)
        if (!res.ok) {
          const t = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status} ${res.statusText} — ${t}`)
        }
        const data = await res.json()
        if (!aborted) {
          const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
          setItems(list)
        }
      } catch (e) {
        console.error('Restaurants load failed:', e)
        if (!aborted) setError('Не удалось загрузить рестораны')
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    load()
    return () => { aborted = true }
  }, [])

  return (
    <section className="restaurants" aria-labelledby="restaurants-title">
      <div className="container">
        <h2 id="restaurants-title" className="section-title">Мы уже собрали меню этих ресторанов Москвы</h2>
        <p className="section-subtitle">Мы постепенно добавляем новые рестораны — напишите нам, если вашего пока нет.</p>

        {loading && (
          <div className="grid grid--skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card card--skeleton" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="error">{error}</div>
        )}

        {!loading && !error && (
          <div className="grid">
            {items.map((r) => (
              <RestaurantCard key={r.id || r.slug || r.name} item={r} />
            ))}
          </div>
        )}

        <div className="center">
          <Link className="btn btn--outline" to="/restaurants">Показать все рестораны</Link>
        </div>
      </div>
    </section>
  )
}

function RestaurantCard({ item }) {
  const title = item?.name || 'Ресторан'
  const cuisine = item?.cuisine || item?.cuisine_name || ''
  const slug = item?.slug || ''
  const initials = useMemo(() => getInitials(title), [title])
  const href = slug ? `/r/${slug}/menu` : '#'

  return (
    <Link className="card restaurant-card" to={href} title={`Меню ${title} с КБЖУ и составом блюд`}>
      <div className="avatar" aria-hidden="true">{initials}</div>
      <div className="card__content">
        <div className="restaurant__name">{title}</div>
        {cuisine && <div className="restaurant__cuisine">{cuisine}</div>}
      </div>
    </Link>
  )
}

function SuggestRestaurant() {
  const [name, setName] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done | error

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setState('sending')
      const res = await fetch('/suggest-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_name: name.trim(), city: 'Москва', source: 'landing' })
      })
      if (!res.ok) throw new Error('NETWORK')
      setName('')
      setState('done')
      // Optional toast can be triggered by parent app
      // Here we keep it quiet to avoid intrusive alerts
    } catch (e) {
      setState('error')
    }
  }

  return (
    <section className="suggest" aria-labelledby="suggest-title">
      <div className="container">
        <h3 id="suggest-title" className="section-title section-title--small">Не нашли нужный ресторан?</h3>
        <p className="section-subtitle">Сообщите нам, и мы добавим его в базу.</p>
        <form onSubmit={submit} className="suggest__form" noValidate>
          <input
            className="input"
            type="text"
            name="restaurant_name"
            placeholder="Введите название ресторана"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Название ресторана"
            required
            minLength={2}
          />
          <button className="btn btn--primary" type="submit" disabled={state==='sending'}>
            {state === 'sending' ? 'Отправляем…' : 'Отправить'}
          </button>
        </form>
        {state === 'done' && <p className="hint" role="status">Спасибо! Мы учтём ваш запрос 🙌</p>}
        {state === 'error' && <p className="hint hint--error" role="status">Не удалось отправить. Попробуйте ещё раз позже.</p>}
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer__inner">
          <nav className="footer__nav" aria-label="Нижняя навигация">
            <Link to="/legal" className="footer__link">Политика</Link>
            <Link to="/contact" className="footer__link">Контакты</Link>
            <a href="https://t.me/restaurantsecret" className="footer__link" target="_blank" rel="noreferrer">Telegram-бот</a>
          </nav>
        <div className="footer__copy">RestaurantSecret © 2025. Все меню ресторанов Москвы — с КБЖУ.</div>
      </div>
    </footer>
  )
}

function Card({ icon, title, text }) {
  return (
    <div className="card why__card">
      <div className="card__icon" aria-hidden="true">{icon}</div>
      <div className="card__title">{title}</div>
      <div className="card__text">{text}</div>
    </div>
  )
}

function getInitials(name) {
  const parts = String(name).split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const last = parts[1]?.[0] || ''
  return (first + last).toUpperCase()
}

/* ---------------------------------------------------------
  Minimal styles to complement existing styles.css.
  If you prefer a separate CSS file, move these rules there.
--------------------------------------------------------- */

const styles = `
:root {
  --bg: #f7faf7;
  --fg: #0f172a;
  --muted: #64748b;
  --card: #ffffff;
  --line: #e5e7eb;
  --brand: #0ea5e9;
  --brand-2: #22c55e;
}

.landing { color: var(--fg); min-height: 100dvh; }
.container { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
.section-title { font-size: 28px; line-height: 1.25; margin: 0 0 8px; }
.section-title--small { font-size: 22px; }
.section-subtitle { color: var(--muted); margin: 0 0 16px; }
.center { display: flex; justify-content: center; margin-top: 16px; }
.hint { color: var(--muted); font-size: 13px; margin-top: 8px; }
.hint--error { color: #b91c1c; }

/* Why */
.why { padding: 40px 0; }
.why__cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 12px; }
.why__example { margin-top: 12px; color: var(--muted); text-align: center; }
.chip { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #f1f5f9; border: 1px solid var(--line); margin: 0 4px; font-size: 14px; }
.dot { display: inline-block; width: 4px; height: 4px; background: var(--line); border-radius: 50%; margin: 0 6px; vertical-align: middle; }

/* Restaurants grid */
.restaurants { padding: 40px 0; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.grid--skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; box-shadow: 0 1px 1px rgba(0,0,0,0.02); }
.card--skeleton { height: 84px; background: linear-gradient(90deg, #f6f7f8 0%, #eef1f4 50%, #f6f7f8 100%); background-size: 200% 100%; animation: shimmer 1.1s infinite linear; border-radius: 14px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.restaurant-card { display: flex; gap: 12px; align-items: center; text-decoration: none; color: inherit; }
.avatar { width: 44px; height: 44px; border-radius: 12px; background: #f0f9ff; display: grid; place-items: center; font-weight: 700; }
.card__content { min-width: 0; }
.restaurant__name { font-weight: 600; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
.restaurant__cuisine { color: var(--muted); font-size: 14px; margin-top: 2px; }

/* Suggest */
.suggest { padding: 40px 0; }
.suggest__form { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.input { padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; }

/* Footer */
.footer { padding: 28px 0 36px; border-top: 1px solid var(--line); background: #fcfdfc; margin-top: 20px; }
.footer__inner { display: flex; flex-direction: column; gap: 10px; align-items: center; }
.footer__nav { display: flex; gap: 12px; }
.footer__link { color: #0f172a; opacity: .8; text-decoration: none; }
.footer__link:hover { opacity: 1; text-decoration: underline; }
.footer__copy { color: var(--muted); font-size: 13px; }

/* Buttons */
.btn { --btn-bg: var(--brand); --btn-fg: #fff; appearance: none; border: none; border-radius: 12px; padding: 12px 16px; cursor: pointer; font-weight: 600; }
.btn--primary { background: var(--btn-bg); color: var(--btn-fg); }
.btn--primary:hover { filter: brightness(0.98); }
.btn--outline { background: #fff; border: 1px solid var(--line); color: var(--fg); }

`

if (typeof document !== 'undefined') {
  // Inject component-scoped styles at runtime (keeps single-file delivery)
  const id = 'landing-inline-styles'
  if (!document.getElementById(id)) {
    const el = document.createElement('style')
    el.id = id
    el.appendChild(document.createTextNode(styles))
    document.head.appendChild(el)
  }
}
