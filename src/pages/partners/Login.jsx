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
    } catch {
      // Backend always answers generically — a thrown error here means the
      // request itself failed (network/infra), not "email not found".
      setErr('Не получилось отправить ссылку. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="partners partners--centered">
      <div className="partners-card partners-login">
        <h1 className="partners-login__title">Кабинет ресторана</h1>
        <p className="partners-login__subtitle">RestaurantSecret</p>

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
      </div>
    </div>
  )
}
