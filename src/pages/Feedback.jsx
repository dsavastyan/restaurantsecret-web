import React, { useState } from 'react'
import { useAuth } from '@/store/auth'
import { postFeedback } from '@/lib/api'
import { toast } from '@/lib/toast'

const feedbackTypes = [
    { value: 'suggestion', label: 'Предложение' },
    { value: 'problem', label: 'Проблема' },
    { value: 'question', label: 'Вопрос' },
    { value: 'other', label: 'Другое' },
]

export default function Feedback() {
    const accessToken = useAuth((state) => state.accessToken)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [feedbackType, setFeedbackType] = useState('suggestion')
    const [message, setMessage] = useState('')
    const [validationError, setValidationError] = useState('')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(event) {
        event.preventDefault()

        const trimmedMessage = message.trim()
        if (!trimmedMessage) {
            setValidationError('Пожалуйста, введите сообщение')
            return
        }

        if (trimmedMessage.length < 10) {
            setValidationError('Сообщение должно содержать минимум 10 символов')
            return
        }

        setValidationError('')
        setSubmitting(true)

        try {
            await postFeedback(
                {
                    name: name.trim() || null,
                    email: email.trim() || null,
                    feedback_type: feedbackType,
                    message: trimmedMessage,
                },
                accessToken || undefined
            )

            toast.success('Спасибо за ваш отзыв! Мы обязательно его рассмотрим.')

            // Reset form
            setName('')
            setEmail('')
            setFeedbackType('suggestion')
            setMessage('')
        } catch (error) {
            console.error('Failed to submit feedback', error)
            toast.error('Не удалось отправить отзыв. Попробуйте ещё раз.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <main className="contact-page contact-page--feedback">
            <div className="container contact-layout">
                <section className="contact-card contact-card--accent">
                    <header className="contact-card__header">
                        <p className="contact-card__eyebrow">Мы ценим ваше мнение</p>
                        <h1 className="contact-card__title">Оставить отзыв</h1>
                        <p className="contact-card__hint">
                            Расскажите нам, что можно улучшить, или поделитесь своими идеями.
                            Мы внимательно читаем каждое сообщение.
                        </p>
                    </header>

                    <form className="feedback-form" onSubmit={handleSubmit} noValidate>
                        <div className="feedback-form__row">
                            <label className="feedback-form__field">
                                <span className="feedback-form__label">Ваше имя</span>
                                <input
                                    type="text"
                                    className="feedback-form__input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Как к вам обращаться?"
                                />
                            </label>

                            <label className="feedback-form__field">
                                <span className="feedback-form__label">Email для связи</span>
                                <input
                                    type="email"
                                    className="feedback-form__input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    inputMode="email"
                                />
                            </label>
                        </div>

                        <label className="feedback-form__field">
                            <span className="feedback-form__label">Тип обращения *</span>
                            <select
                                className="feedback-form__select"
                                value={feedbackType}
                                onChange={(e) => setFeedbackType(e.target.value)}
                                required
                            >
                                {feedbackTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="feedback-form__field">
                            <span className="feedback-form__label">Ваше сообщение *</span>
                            <textarea
                                className={`feedback-form__textarea ${validationError ? 'is-invalid' : ''}`}
                                value={message}
                                onChange={(e) => {
                                    setMessage(e.target.value)
                                    if (validationError) setValidationError('')
                                }}
                                placeholder="Расскажите подробнее..."
                                rows={6}
                                required
                            />
                        </label>

                        {validationError && (
                            <p className="hint hint--error" role="status">
                                {validationError}
                            </p>
                        )}

                        <button
                            className="btn btn--primary feedback-form__submit"
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting ? 'Отправляем…' : 'Отправить отзыв'}
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

                    <ul className="contact-list" aria-label="Каналы связи">
                        <li className="contact-list__item">
                            <div className="contact-list__body">
                                <p className="contact-list__label">Техподдержка</p>
                                <a
                                    className="contact-list__value"
                                    href="mailto:support@restaurantsecret.ru"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    support@restaurantsecret.ru
                                </a>
                            </div>
                        </li>
                        <li className="contact-list__item">
                            <div className="contact-list__body">
                                <p className="contact-list__label">Поддержка в Telegram</p>
                                <a
                                    className="contact-list__value"
                                    href="http://t.me/RestSecretSupport_bot"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    @RestSecretSupport_bot
                                </a>
                            </div>
                            <a
                                className="contact-list__cta"
                                href="http://t.me/RestSecretSupport_bot"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Написать
                            </a>
                        </li>
                    </ul>
                </section>
            </div>
        </main>
    )
}
