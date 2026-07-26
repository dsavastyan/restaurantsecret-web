// src/pages/partners/Login.jsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { restaurantPortalApi } from '@/api/restaurantPortal'

export default function PartnersLogin() {
  const [searchParams] = useSearchParams()
  const expired = searchParams.get('error') === 'expired'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    setErr(null)
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErr('Укажите корректный email.')
      return
    }
    setLoading(true)
    try {
      await restaurantPortalApi.requestLoginLink(email.trim().toLowerCase())
      setSent(true)
    } catch (requestError) {
      // Unknown emails still receive the same generic success response; an
      // explicit provider failure means the message could not be delivered.
      setErr(requestError.code === 'email_delivery_failed'
        ? 'Не удалось отправить письмо. Попробуйте ещё раз позже или проверьте адрес отправителя.'
        : 'Не получилось отправить ссылку. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="partners partners--centered">
      <div className="partners-login-layout">
        <div className="partners-login__intro">
          <div className="partners-login__brand">
            <img className="partners-login__logo" src="/assets/logo.png" alt="RestaurantSecret" />
            <span>RestaurantSecret</span>
          </div>
          <h1 className="partners-login__title">Ваш ресторан<br /><em>в центре внимания</em></h1>
        </div>
        <div className="partners-card partners-login">
          <div className="partners-login__card-head">
            <span className="partners-login__eyebrow">Вход для партнёров</span>
            <span className="partners-login__lock" aria-hidden="true">⌁</span>
          </div>
          <h2 className="partners-login__card-title">Добро пожаловать</h2>
          <p className="partners-login__subtitle">Войдите по ссылке из email — пароль не нужен.</p>

        {expired && (
          <div className="partners__notice partners__notice--warning">
            Ссылка для входа устарела или уже использована. Запросите новую.
          </div>
        )}

        {sent ? (
          <div className="partners__notice partners__notice--success">
            Если такой email зарегистрирован, мы отправили на него ссылку для входа. Проверьте почту (и папку «Спам»).
          </div>
        ) : (
          <form className="partners-login__form" onSubmit={submit}>
            <label className="partners-login__label" htmlFor="partner-email">Email</label>
            <input
              id="partner-email"
              type="email"
              className="partners-login__input"
              placeholder="you@restaurant.ru"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
            {err && <div className="partners__notice partners__notice--error">{err}</div>}
            <button className="partners__btn partners__btn--primary" type="submit" disabled={loading}>
              {loading ? 'Отправляем…' : 'Получить ссылку для входа'}
            </button>
          </form>
        )}
        <p className="partners-login__privacy">Ссылка действительна 15 минут и используется только один раз.</p>
        </div>
      </div>
    </div>
  )
}
