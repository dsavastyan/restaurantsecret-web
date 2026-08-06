// src/pages/partners/Login.jsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { restaurantPortalApi } from '@/api/restaurantPortal'

const RESEND_COOLDOWN_SECONDS = 60
const SUPPORT_EMAIL = 'partners@restaurantsecret.ru'
const EMAIL_MAX_LENGTH = 254
const EMAIL_DISPLAY_MAX_LENGTH = 96
const EMAIL_PATTERN = /^(?=.{1,254}$)(?=.{1,64}@)[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/

function formatCooldown(seconds) {
  return `00:${String(Math.max(0, seconds - 1)).padStart(2, '0')}`
}

function isValidEmail(address) {
  return EMAIL_PATTERN.test(address)
}

function formatEmailForDisplay(address) {
  if (address.length <= EMAIL_DISPLAY_MAX_LENGTH) return address
  return `${address.slice(0, EMAIL_DISPLAY_MAX_LENGTH)}…`
}

export default function PartnersLogin() {
  const [searchParams, setSearchParams] = useSearchParams()
  const expired = searchParams.get('error') === 'expired'

  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [screen, setScreen] = useState(expired ? 'expired' : 'form')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [cooldown, setCooldown] = useState(0)
  const [resent, setResent] = useState(false)

  useEffect(() => {
    setScreen(expired ? 'expired' : 'form')
  }, [expired])

  useEffect(() => {
    if (screen !== 'sent' || cooldown <= 0) return undefined
    const timer = window.setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [screen, cooldown > 0])

  const requestLink = async (address, { isResend = false } = {}) => {
    setErr(null)
    setLoading(true)
    if (isResend) setResent(false)

    try {
      const data = await restaurantPortalApi.requestLoginLink(address)

      if (data?.registered === false) {
        setScreen('not-found')
        setCooldown(0)
        return
      }

      setScreen('sent')
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setResent(isResend)
    } catch (requestError) {
      setErr(requestError.code === 'email_delivery_failed'
        ? 'Не удалось отправить письмо. Попробуйте ещё раз позже.'
        : 'Не получилось отправить ссылку. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setErr(null)
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setErr('Укажите корректный email.')
      return
    }

    setSubmittedEmail(normalizedEmail)
    await requestLink(normalizedEmail)
  }

  const resend = async () => {
    if (cooldown > 0 || loading) return
    await requestLink(submittedEmail, { isResend: true })
  }

  const showForm = () => {
    setSearchParams({}, { replace: true })
    setScreen('form')
    setErr(null)
    setResent(false)
    setCooldown(0)
  }

  const title = {
    form: 'Вход для партнёров',
    sent: 'Проверьте почту',
    'not-found': (
      <>
        Email{' '}
        <span className="partners-login__email-fragment" title={submittedEmail}>
          {formatEmailForDisplay(submittedEmail)}
        </span>{' '}
        не найден
      </>
    ),
    expired: 'Ссылка больше не действует',
  }[screen]

  return (
    <div className="partners partners--centered">
      <div className="partners-login-layout">
        <div className="partners-login__intro">
          <div className="partners-login__brand">
            <img className="partners-login__logo" src="/assets/logo.png" alt="RestaurantSecret" />
            <span>RestaurantSecret</span>
          </div>
          <h1 className="partners-login__title">Ваш ресторан<br /><em>в центре внимания</em></h1>
          <p className="partners-login__lead">
            Кабинет партнёра RestaurantSecret: публикуйте меню с КБЖУ, обновляйте блюда
            и делитесь ссылкой и QR-кодом с гостями.
          </p>
        </div>

        <div className="partners-card partners-login">
          <div className="partners-login__card-head">
            <span className="partners-login__eyebrow">Кабинет ресторана</span>
            <span className="partners-login__lock" aria-hidden="true"><ShieldCheck size={16} strokeWidth={1.9} /></span>
          </div>

          <h2 className="partners-login__card-title">{title}</h2>

          {screen === 'form' && (
            <>
              <p className="partners-login__subtitle">
                Введите email, указанный при регистрации ресторана. Мы отправим на него одноразовую ссылку для входа.
              </p>
              <form className="partners-login__form" onSubmit={submit} noValidate>
                <label className="partners-login__label" htmlFor="partner-email">Email</label>
                <input
                  id="partner-email"
                  type="email"
                  className="partners-login__input"
                  placeholder="you@restaurant.ru"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  maxLength={EMAIL_MAX_LENGTH}
                  autoFocus
                  disabled={loading}
                />
                {err && <div className="partners__notice partners__notice--error" role="alert">{err}</div>}
                <button className="partners__btn partners__btn--primary" type="submit" disabled={loading}>
                  {loading ? 'Отправляем…' : 'Получить ссылку'}
                </button>
              </form>
            </>
          )}

          {screen === 'sent' && (
            <div className="partners-login__state">
              <p className="partners-login__state-copy">
                Мы отправили ссылку для входа на <strong className="partners-login__email-fragment">{submittedEmail}</strong>.
              </p>
              <p className="partners-login__state-copy">
                Перейдите по ссылке из письма. Она действует 15 минут и может быть использована только один раз.
              </p>
              <p className="partners-login__state-copy partners-login__state-copy--muted">
                Письмо может прийти в течение нескольких минут. Проверьте также папку «Промоакции» и «Спам».
              </p>

              {resent && (
                <div className="partners__notice partners__notice--success partners-login__resend-confirmation" role="status">
                  Новое письмо отправлено на <span className="partners-login__email-fragment">{submittedEmail}</span>.
                </div>
              )}
              {err && <div className="partners__notice partners__notice--error" role="alert">{err}</div>}

              <button
                className="partners__btn partners__btn--primary partners-login__action"
                type="button"
                onClick={resend}
                disabled={loading || cooldown > 0}
              >
                {loading
                  ? 'Отправляем…'
                  : cooldown > 0
                    ? `Отправить повторно через ${formatCooldown(cooldown)}`
                    : 'Отправить письмо ещё раз'}
              </button>
              <button className="partners-login__text-action" type="button" onClick={showForm}>
                Указать другой email
              </button>
            </div>
          )}

          {screen === 'not-found' && (
            <div className="partners-login__state">
              <p className="partners-login__state-copy">
                Этот email не привязан ни к одному ресторану-партнёру. Проверьте введённый адрес или напишите нам на{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
              <p className="partners-login__state-copy partners-login__state-copy--muted">
                Проверьте написание адреса или обратитесь в поддержку.
              </p>
              <button className="partners-login__text-action" type="button" onClick={showForm}>
                Указать другой email
              </button>
            </div>
          )}

          {screen === 'expired' && (
            <div className="partners-login__state">
              <p className="partners-login__state-copy">
                Ссылка для входа устарела или уже была использована.
              </p>
              <button
                className="partners__btn partners__btn--primary partners-login__action"
                type="button"
                onClick={showForm}
              >
                Получить новую ссылку
              </button>
            </div>
          )}

          <div className="partners-login__support">
            <span>Возникли проблемы со входом?</span>
            <span>Напишите нам на <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></span>
          </div>
        </div>
      </div>
    </div>
  )
}
