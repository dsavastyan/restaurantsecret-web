import React, { useState } from 'react'

const plans = [
  {
    key: 'monthly',
    title: 'Ежемесячная подписка',
    description: 'Доступ к каталогу и обновлениям с помесячной оплатой.'
  },
  {
    key: 'annual',
    title: 'Годовая подписка',
    description: 'Экономия при оплате сразу за год и непрерывный доступ.'
  }
]

async function startCheckout(plan, setLoadingPlan, setError) {
  setLoadingPlan(plan)
  setError('')
  try {
    const user = (typeof window !== 'undefined' && window.localStorage.getItem('rs_tg_user_id')) || '176483490'
    const response = await fetch('https://api.restaurantsecret.ru/subscribe/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user}`
      },
      body: JSON.stringify({ plan })
    })

    const payload = await response.json()
    const { ok, redirect_url: redirectUrl } = payload ?? {}
    if (ok && redirectUrl) {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(redirectUrl)
      } else if (typeof window !== 'undefined') {
        const opened = window.open(redirectUrl, '_blank', 'noopener')
        if (!opened) {
          window.location.href = redirectUrl
        }
      }
    } else {
      throw new Error('Не удалось создать платёж. Попробуйте позже.')
    }
  } catch (err) {
    console.error('Failed to start checkout', err)
    setError('Не удалось создать платёж. Попробуйте позже.')
    alert('Не удалось создать платёж. Попробуйте позже.')
  } finally {
    setLoadingPlan(null)
  }
}

export default function Paywall() {
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState('')

  return (
    <div className="paywall-overlay" role="dialog" aria-modal="true">
      <div className="paywall-dialog">
        <h2>Оформите подписку</h2>
        <p>Подписка открывает доступ ко всему каталогу RestaurantSecret и регулярным обновлениям.</p>
        <div className="paywall-plans">
          {plans.map(plan => (
            <div key={plan.key} className="paywall-plan">
              <div>
                <p className="paywall-plan-title">{plan.title}</p>
                <p className="paywall-plan-desc">{plan.description}</p>
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => startCheckout(plan.key, setLoadingPlan, setError)}
                disabled={loadingPlan === plan.key}
              >
                {loadingPlan === plan.key ? 'Подготовка…' : 'Оформить подписку'}
              </button>
            </div>
          ))}
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <p className="paywall-note">После оплаты вернитесь в приложение и нажмите «Проверить доступ».</p>
      </div>
    </div>
  )
}
