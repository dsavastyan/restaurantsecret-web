// Paywall overlay that showcases available plans and routes users into the
// payment flow.
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { analytics } from '@/services/analytics'

export default function Paywall({ onRefresh }) {
  useEffect(() => {
    analytics.track("paywall_show");
  }, []);

  return (
    <section className="rs-paywall" role="dialog" aria-modal="true" aria-labelledby="rs-paywall-title">
      <h1 id="rs-paywall-title">Оформите подписку</h1>
      <p className="rs-lead">
        Подписка открывает доступ ко всему каталогу RestaurantSecret и регулярным обновлениям.
      </p>

      <div className="rs-cards">
        {/* Месяц */}
        <article className="rs-card">
          <div className="rs-card-body">
            <div className="rs-term">1 месяц</div>
            <div className="rs-price">
              <span className="rs-price-value">99</span>
              <span className="rs-price-rub">руб.</span>
            </div>
            <Link className="rs-btn" to="/account/subscription">
              Оформить подписку
            </Link>
          </div>
        </article>

        {/* Год */}
        <article className="rs-card rs-card--accent">
          <div className="rs-ribbon">Самая выгодная цена</div>
          <div className="rs-card-body">
            <div className="rs-term">1 год</div>
            <div className="rs-price">
              <span className="rs-price-value">999</span>
              <span className="rs-price-rub">руб.</span>
            </div>
            <div className="rs-save">Выгоднее на 16&nbsp;%</div>
            <Link className="rs-btn" to="/account/subscription">
              Оформить подписку
            </Link>
          </div>
        </article>
      </div>

      <p className="rs-hint">
        После оплаты вернитесь в приложение и нажмите «Проверить доступ».
      </p>

      <div className="rs-actions">
        <button className="rs-link" onClick={onRefresh}>Проверить доступ</button>
      </div>
    </section>
  )
}
