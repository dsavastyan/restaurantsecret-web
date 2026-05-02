import React, { useState } from 'react'
import { postFeedback } from '@/lib/api'
import { toast } from '@/lib/toast'
import { useMeta } from '@/lib/useMeta'
import { useAuth } from '@/store/auth'

const initialForm = {
  name: '',
  email: '',
  feedback_type: 'suggestion',
  message: '',
}

export default function Feedback() {
  useMeta({
    title: 'Оставить отзыв — RestaurantSecret',
    description: 'Поделитесь идеей, вопросом или проблемой по работе RestaurantSecret.',
    canonical: 'https://restaurantsecret.ru/feedback',
  })

  const accessToken = useAuth((state) => state.accessToken)
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function updateField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }))
      if (validationError) setValidationError('')
      if (submitted) setSubmitted(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedMessage = form.message.trim()
    if (trimmedMessage.length < 10) {
      setValidationError('Напишите, пожалуйста, минимум 10 символов.')
      return
    }

    setSubmitting(true)
    setValidationError('')

    try {
      await postFeedback(
        {
          name: form.name.trim() || null,
          email: form.email.trim() || null,
          feedback_type: form.feedback_type,
          message: trimmedMessage,
        },
        accessToken || undefined,
      )
      setForm(initialForm)
      setSubmitted(true)
      toast.success('Спасибо, отзыв отправлен')
    } catch (error) {
      console.error('Failed to submit feedback', error)
      toast.error('Не удалось отправить отзыв. Попробуйте еще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="contact-page contact-page--feedback">
      <section className="feedback-hero" aria-labelledby="feedback-title">
        <p className="feedback-hero__eyebrow">Обратная связь</p>
        <h1 className="feedback-hero__title" id="feedback-title">Мы ценим ваше мнение</h1>
        <p className="feedback-hero__subtitle">
          Расскажите нам, что можно улучшить, или поделитесь своими идеями.
          <span>Мы внимательно читаем каждое сообщение.</span>
        </p>
      </section>

      <div className="container contact-layout">
        <section className="contact-card contact-card--accent">
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="feedback-form__row">
              <label className="feedback-form__field">
                <span className="feedback-form__label">Ваше имя</span>
                <input
                  className="feedback-form__input"
                  type="text"
                  value={form.name}
                  onChange={updateField('name')}
                  placeholder="Как к вам обращаться"
                  autoComplete="name"
                />
              </label>

              <label className="feedback-form__field">
                <span className="feedback-form__label">Email для связи</span>
                <input
                  className="feedback-form__input"
                  type="email"
                  value={form.email}
                  onChange={updateField('email')}
                  placeholder="name@example.com"
                  autoComplete="email"
                  inputMode="email"
                />
              </label>
            </div>

            <label className="feedback-form__field">
              <span className="feedback-form__label">Тип обращения *</span>
              <select
                className="feedback-form__select"
                value={form.feedback_type}
                onChange={updateField('feedback_type')}
              >
                <option value="suggestion">Предложение</option>
                <option value="problem">Проблема</option>
                <option value="question">Вопрос</option>
                <option value="other">Другое</option>
              </select>
            </label>

            <label className="feedback-form__field">
              <span className="feedback-form__label">Ваше сообщение *</span>
              <textarea
                className={`feedback-form__textarea${validationError ? ' is-invalid' : ''}`}
                value={form.message}
                onChange={updateField('message')}
                placeholder="Расскажите подробнее..."
                required
                minLength={10}
              />
            </label>

            {validationError ? (
              <p className="feedback-form__status feedback-form__status--error" role="status">
                {validationError}
              </p>
            ) : null}

            {submitted ? (
              <p className="feedback-form__status feedback-form__status--success" role="status">
                Спасибо. Мы получили сообщение и посмотрим его в ближайшее время.
              </p>
            ) : null}

            <button className="btn btn--primary feedback-form__submit" type="submit" disabled={submitting}>
              {submitting ? 'Отправляем...' : 'Отправить отзыв'}
            </button>
          </form>
        </section>

        <section className="contact-card">
          <header className="contact-card__header">
            <p className="contact-card__eyebrow">Другие способы связи</p>
            <h2 className="contact-card__title">Нужна срочная помощь?</h2>
            <p className="contact-card__hint">
              Для срочных вопросов используйте прямые каналы связи
            </p>
          </header>

          <ul className="contact-list" aria-label="Каналы обратной связи">
            <li className="contact-list__item contact-list__item--telegram">
              <span className="contact-list__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M4 6h16v12H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="m5 7 7 6 7-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="contact-list__body">
                <p className="contact-list__label">Техподдержка</p>
                <a className="contact-list__value" href="mailto:support@restaurantsecret.ru">
                  support@restaurantsecret.ru
                </a>
              </div>
            </li>
            <li className="contact-list__item">
              <span className="contact-list__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M20.6 4.5 3.8 11.2c-.9.4-.9 1.6.1 1.9l4.3 1.3 1.6 4.9c.3.9 1.5 1 1.9.2l2.2-3.5 4.1 3c.7.5 1.6.1 1.8-.7l2.2-12.2c.2-1-.6-1.9-1.4-1.6Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                  <path d="m8.4 14.4 7.2-5.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
              <div className="contact-list__body">
                <p className="contact-list__label">Поддержка в Telegram</p>
                <a className="contact-list__value contact-list__value--telegram" href="http://t.me/RestSecretSupport_bot" target="_blank" rel="noreferrer">
                  @RestSecretSupport_bot
                </a>
              </div>
              <a className="contact-list__cta" href="http://t.me/RestSecretSupport_bot" target="_blank" rel="noreferrer">
                Написать
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
