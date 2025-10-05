import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Paywall({ onRefresh, returnTo = '/' }) {
  const nav = useNavigate()

  async function grantAccess(months = 1) {
    const expires = new Date()
    expires.setMonth(expires.getMonth() + months)
    const detail = {
      ok: true,
      isActive: true,
      expiresAt: expires.toISOString(),
    }

    try {
      window.localStorage.setItem('rs_access_state', JSON.stringify(detail))
    } catch {}

    window.dispatchEvent(new CustomEvent('rs-access-update', { detail }))

    if (returnTo && window.location.pathname !== returnTo) {
      nav(returnTo, { replace: true })
    }
  }

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
            <button className="rs-btn" onClick={() => grantAccess(1)}>
              Оформить подписку
            </button>
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
            <button className="rs-btn" onClick={() => grantAccess(12)}>
              Оформить подписку
            </button>
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

/* Оставляем старый helper закомментированным — пригодится, когда включишь YooKassa
async function startCheckout(plan) {
  const uid = localStorage.getItem('rs_tg_user_id') || '176483490'
  const r = await fetch('https://api.restaurantsecret.ru/subscribe/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${uid}` },
    body: JSON.stringify({ plan })
  })
  const { ok, redirect_url: redirectUrl } = await r.json()
  if (ok && redirectUrl) {
    window.Telegram?.WebApp?.openLink(redirectUrl)
  } else {
    alert('Не удалось создать платеж. Попробуйте позже.')
  }
}
*/
