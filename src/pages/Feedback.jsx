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
      <div className="container contact-layout">
        <section className="contact-card contact-card--accent">
          <header className="contact-card__header">
            <p className="contact-card__eyebrow">Обратная связь</p>
            <h1 className="contact-card__title">Расскажите, что улучшить</h1>
            <p className="contact-card__hint">
              Идеи, вопросы и сообщения о проблемах попадают команде RestaurantSecret напрямую.
            </p>
          </header>

          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="feedback-form__row">
              <label className="feedback-form__field">
                <span className="feedback-form__label">Имя</span>
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
                <span className="feedback-form__label">Email</span>
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
              <span className="feedback-form__label">Тип обращения</span>
              <select
                className="feedback-form__select"
                value={form.feedback_type}
                onChange={updateField('feedback_type')}
              >
                <option value="suggestion">Идея или предложение</option>
                <option value="problem">Проблема</option>
                <option value="question">Вопрос</option>
                <option value="other">Другое</option>
              </select>
            </label>

            <label className="feedback-form__field">
              <span className="feedback-form__label">Сообщение</span>
              <textarea
                className={`feedback-form__textarea${validationError ? ' is-invalid' : ''}`}
                value={form.message}
                onChange={updateField('message')}
                placeholder="Например: не хватает ресторана, нашли ошибку в КБЖУ или есть идея для функции"
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
            <p className="contact-card__eyebrow">Другие каналы</p>
            <h2 className="contact-card__title">Можно написать напрямую</h2>
            <p className="contact-card__hint">
              Если удобнее вести диалог вне формы, выберите email или Telegram.
            </p>
          </header>

          <ul className="contact-list" aria-label="Каналы обратной связи">
            <li className="contact-list__item">
              <div className="contact-list__body">
                <p className="contact-list__label">Email</p>
                <a className="contact-list__value" href="mailto:feedback@restaurantsecret.ru">
                  feedback@restaurantsecret.ru
                </a>
              </div>
            </li>
            <li className="contact-list__item">
              <div className="contact-list__body">
                <p className="contact-list__label">Telegram</p>
                <a className="contact-list__value" href="http://t.me/RestSecretSupport_bot" target="_blank" rel="noreferrer">
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
