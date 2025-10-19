// Landing.jsx — MVP landing page for RestaurantSecret
// Assumptions:
// - React + Vite SPA already set up
// - Global stylesheet (styles.css) exists; this file adds semantic classNames
// - API base: https://api.restaurantsecret.ru
// - No payment/subscription flows here (frozen by product decision)
// - Блок преимуществ под hero показывает три ключевые выгоды (без отдельного заголовка)
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

// Hero section with simple CTA guiding users to the catalog.
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

// Highlights the three main value propositions of RestaurantSecret.
function WhyImportant() {
  return (
    <section className="benefits" aria-label="Преимущества">
      <div className="container">
        <ul className="benefits__grid">
          <li className="benefit-card">
            <div className="benefit-icon" aria-hidden="true">🕓</div>
            <div className="benefit-text">
              <div className="benefit-title">Экономь время</div>
              <div className="benefit-desc">Больше не ищи меню по сайтам.</div>
            </div>
          </li>

          <li className="benefit-card">
            <div className="benefit-icon" aria-hidden="true">🍽️</div>
            <div className="benefit-text">
              <div className="benefit-title">Планируй питание</div>
              <div className="benefit-desc">Заранее подбирай блюда по КБЖУ.</div>
            </div>
          </li>

          <li className="benefit-card">
            <div className="benefit-icon" aria-hidden="true">💪</div>
            <div className="benefit-text">
              <div className="benefit-title">Контролируй рацион</div>
              <div className="benefit-desc">Выбирай, не выходя за цели.</div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  )
}

// Fetch and display a small preview grid of restaurants directly on the
// landing page.
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

  let content = null

  if (loading) {
    content = (
      <ul className="restaurants__grid" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="restaurant-item">
            <div className="restaurant-card skeleton" aria-hidden="true">
              <div className="restaurant-badge" aria-hidden="true">&nbsp;</div>
              <div className="restaurant-text">
                <div className="restaurant-name">&nbsp;</div>
                <div className="restaurant-cuisine">&nbsp;</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )
  } else if (error) {
    content = <div className="error">{error}</div>
  } else {
    content = (
      <ul className="restaurants__grid">
        {items.map((r) => (
          <RestaurantCard key={r.id || r.slug || r.name} item={r} />
        ))}
      </ul>
    )
  }

  return (
    <section className="restaurants" aria-label="Список ресторанов">
      <div className="container">
        <h2 id="restaurants-title" className="section-title">Мы уже собрали меню этих ресторанов Москвы</h2>
        <p className="section-subtitle">Мы постепенно добавляем новые рестораны — напишите нам, если вашего пока нет.</p>

        {content}

        <div className="center">
          <Link className="btn btn--outline" to="/restaurants">Показать все рестораны</Link>
        </div>
      </div>
    </section>
  )
}

// A single restaurant card used in the preview grid.
function RestaurantCard({ item }) {
  const title = item?.name || 'Ресторан'
  const cuisine = item?.cuisine || item?.cuisine_name || ''
  const slug = item?.slug || ''
  const initials = useMemo(() => getInitials(title), [title])
  const href = slug ? `/r/${slug}/menu` : '#'

  return (
    <li className="restaurant-item">
      <Link className="restaurant-card" to={href} title={`Меню ${title} с КБЖУ и составом блюд`}>
        <div className="restaurant-badge" aria-hidden="true">{initials}</div>
        <div className="restaurant-text">
          <div className="restaurant-name">{title}</div>
          {cuisine && <div className="restaurant-cuisine">{cuisine}</div>}
        </div>
      </Link>
    </li>
  )
}

// Minimal form for collecting user suggestions when a restaurant is missing.
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

// Simple footer with legal links and contact info.
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

// Create two-character initials from the restaurant name to display in the
// circular badge.
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

/* Benefits */
.benefits { padding: clamp(12px, 3vw, 24px); }
.benefits__grid { list-style: none; margin: 0; padding: 0; display: grid; gap: clamp(8px, 2vw, 14px); grid-template-columns: 1fr; }
@media (min-width: 900px) {
  .benefits__grid { grid-template-columns: 1fr 1fr; }
}
.benefit-card { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px; padding: 14px 16px; background: #ffffff; border-radius: 16px; border: 1px solid #e8edf0; box-shadow: 0 1px 0 #ffffff inset, 0 6px 18px rgba(31, 74, 62, 0.06); }
.benefit-icon { width: 42px; height: 42px; display: grid; place-items: center; font-size: 22px; border-radius: 12px; background: linear-gradient(180deg, #f4f8f5 0%, #eef4f0 100%); box-shadow: 0 1px 0 #ffffff inset, 0 2px 8px rgba(31, 74, 62, 0.08); user-select: none; }
.benefit-text { min-width: 0; }
.benefit-title { color: #1f4a3e; font-weight: 700; font-size: clamp(15px, 2.2vw, 18px); line-height: 1.2; }
.benefit-desc { margin-top: 2px; color: #294b43cc; font-size: clamp(13px, 2vw, 16px); line-height: 1.35; }
@media (max-width: 420px) {
  .benefit-card { padding: 12px 14px; border-radius: 14px; }
  .benefit-icon { width: 38px; height: 38px; font-size: 20px; }
}

/* Restaurants grid */
.restaurants { padding: clamp(8px, 3vw, 24px); }
.restaurants__grid { list-style: none; margin: 0; padding: 0; display: grid; gap: clamp(8px, 2vw, 16px); grid-template-columns: 1fr; }
@media (min-width: 768px) { .restaurants__grid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1140px) { .restaurants__grid { grid-template-columns: 1fr 1fr 1fr; } }
.restaurant-item { }
.restaurant-card { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; text-decoration: none; background: #fff; border-radius: 18px; border: 1px solid #e8edf0; box-shadow: 0 1px 0 #ffffff inset, 0 6px 18px rgba(31, 74, 62, 0.06); transition: transform .12s ease, box-shadow .15s ease, border-color .12s ease; }
.restaurant-card:hover { transform: translateY(-1px); box-shadow: 0 1px 0 #ffffff inset, 0 12px 28px rgba(31, 74, 62, 0.10); border-color: #dfe8e6; }
.restaurant-card:focus-visible { outline: 0; box-shadow: 0 0 0 3px #cfe3da, 0 10px 24px rgba(31, 74, 62, 0.10); }
.restaurant-badge { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; font-weight: 800; font-size: 16px; letter-spacing: 0.3px; color: #1f4a3e; background: radial-gradient(80% 80% at 30% 20%, #e8f2ea 0%, #dfeee5 60%, #d7e8de 100%); box-shadow: 0 1px 0 #ffffff inset, 0 2px 8px rgba(31, 74, 62, 0.08); user-select: none; }
.restaurant-text { min-width: 0; }
.restaurant-name { color: #1f4a3e; font-weight: 800; font-size: clamp(15px, 2.6vw, 20px); line-height: 1.18; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.restaurant-cuisine { margin-top: 2px; color: #2c5149cc; font-size: clamp(13px, 2.2vw, 15px); line-height: 1.2; }
@media (max-width: 400px) { .restaurant-card { padding: 12px 14px; border-radius: 16px; } .restaurant-badge { width: 44px; height: 44px; border-radius: 12px; } }
.restaurant-card.skeleton { position: relative; overflow: hidden; color: transparent; }
.restaurant-card.skeleton::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, #f4f7f5 0%, #eef3f0 40%, #f4f7f5 80%); animation: shimmer 1.1s linear infinite; border-radius: inherit; }
@keyframes shimmer { 0% { transform: translateX(-60%); } 100% { transform: translateX(60%); } }

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
