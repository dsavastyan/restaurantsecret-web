import React from 'react'
import { Link, useLocation } from 'react-router-dom'

import { analytics } from '@/services/analytics'
import { useAuth } from '@/store/auth'

const freeFeatures = [
  {
    title: 'Просмотр 5 блюд без регистрации',
    description: 'Посмотрите, как работает RestSecret, прежде чем перейти на полный доступ.',
    included: true,
  },
  { title: 'Все рестораны и блюда', included: false },
  { title: 'Дневник питания + цели по КБЖУ', included: false },
  { title: 'Избранные рестораны и блюда', included: false },
  { title: 'Полный поиск по меню и осознанный выбор без ограничений', included: false },
]

const proFeatures = [
  'Все рестораны и блюда',
  'Дневник питания + цели по КБЖУ',
  'Избранные рестораны и блюда',
  'Полный поиск по меню и осознанный выбор без ограничений',
]

export default function Tariffs() {
  const location = useLocation()
  const accessToken = useAuth((state) => state.accessToken)
  const proTo = accessToken ? '/account/subscription' : '/login'
  const proState = accessToken ? undefined : { from: '/account/subscription' }

  const handleProClick = () => {
    analytics.track('cta_clicked', { location: 'tariffs', text: 'Попробовать Pro' })
  }

  return (
    <main className="tariffs-page">
      <header className="tariffs-nav">
        <div className="tariffs-nav__left">
          <Link to="/" className="tariffs-nav__brand-link" aria-label="RestaurantSecret">
            <img src="/assets/logo.png" alt="" aria-hidden="true" className="tariffs-nav__logo" />
            <span className="tariffs-nav__brand">RestaurantSecret</span>
          </Link>
        </div>

        <nav className="tariffs-nav__center" aria-label="Разделы">
          <Link to="/#restaurants-list">Рестораны</Link>
          <Link to="/#why">Как работает</Link>
          <Link to="/tariffs" className="is-active">Тарифы</Link>
          <a href="https://t.me/RestSecretSupport_bot" target="_blank" rel="noopener noreferrer">Поддержка</a>
        </nav>

        <div className="tariffs-nav__right">
          <Link
            to={accessToken ? '/account' : '/login'}
            state={accessToken ? undefined : { from: location.pathname + location.search }}
            className="tariffs-nav__login-link"
          >
            Личный кабинет
          </Link>
          <Link
            to={proTo}
            state={proState}
            className="tariffs-nav__cta"
            onClick={handleProClick}
          >
            Попробовать Pro
          </Link>
        </div>
      </header>

      <section className="tariffs-hero" aria-labelledby="tariffs-title">
        <h1 className="tariffs-title" id="tariffs-title">
          Выберите тариф <em>под свою цель</em>
        </h1>

        <div className="tariffs-cards" aria-label="Варианты тарифов">
          <article className="tariff-card tariff-card--free">
            <div className="tariff-card__body">
              <h2 className="tariff-card__title">Бесплатно</h2>
              <div className="tariff-card__price-row">
                <span className="tariff-card__price">0 ₽</span>
              </div>
              <p className="tariff-card__desc">Для знакомства с сервисом</p>

              <ul className="tariff-card__features" aria-label="Возможности бесплатного тарифа">
                {freeFeatures.map((feature) => (
                  <li
                    className={`tariff-card__feature${feature.included ? '' : ' tariff-card__feature--muted'}`}
                    key={feature.title}
                  >
                    <span className="tariff-card__feature-icon" aria-hidden="true" />
                    <span>
                      <strong>{feature.title}</strong>
                      {feature.description && <small>{feature.description}</small>}
                    </span>
                  </li>
                ))}
              </ul>

              <Link className="tariff-card__secondary-button" to="/">
                Начать бесплатно
              </Link>
            </div>
          </article>

          <article className="tariff-card tariff-card--pro">
            <div className="tariff-card__body">
              <h2 className="tariff-card__title">Премиум</h2>
              <p className="tariff-card__desc">Полный доступ к RestSecret</p>

              <div className="tariff-card__price-option tariff-card__price-option--month">
                <div>
                  <span className="tariff-card__price">199 ₽</span>
                  <span className="tariff-card__period">/мес</span>
                </div>
                <span className="tariff-card__note">дешевле стаканчика кофе</span>
              </div>

              <div className="tariff-card__price-option tariff-card__price-option--year">
                <span className="tariff-card__best-badge">★ Самый выгодный</span>
                <div className="tariff-card__annual-price">
                  <span className="tariff-card__price">1 490 ₽</span>
                  <span className="tariff-card__period">/год</span>
                </div>
                <div className="tariff-card__monthly-equivalent">
                  <strong>124 ₽</strong>
                  <span>/мес</span>
                  <s>199 ₽/мес</s>
                </div>
              </div>

              <ul className="tariff-card__features tariff-card__features--pro" aria-label="Возможности тарифа Премиум">
                {proFeatures.map((feature) => (
                  <li className="tariff-card__feature" key={feature}>
                    <span className="tariff-card__feature-icon" aria-hidden="true" />
                    <strong>{feature}</strong>
                  </li>
                ))}
              </ul>

              <Link
                className="tariff-card__primary-button"
                to={proTo}
                state={proState}
                onClick={handleProClick}
              >
                Попробовать Pro
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
