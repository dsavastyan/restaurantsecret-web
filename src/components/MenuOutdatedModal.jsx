import { useState } from 'react'
import { createPortal } from 'react-dom'

import { postSuggest } from '@/lib/api'
import { toast } from '@/lib/toast'

const root = typeof document !== 'undefined' ? document.body : null

export function MenuOutdatedModal({ restaurantName, isOpen, onClose }) {
  const [reason, setReason] = useState('missing_dishes')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !root) return null

  const handleClose = () => {
    onClose?.()
    setReason('missing_dishes')
    setComment('')
    setError('')
  }

  const requireComment = reason === 'missing_dishes' || reason === 'other'

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedComment = comment.trim()
    if (requireComment && !trimmedComment) {
      setError('Заполните комментарий')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await postSuggest({
        kind: 'menu_outdated',
        reason,
        restaurant_name: restaurantName,
        comment: trimmedComment || undefined,
      })
      toast.success('Спасибо, мы проверим')
      handleClose()
    } catch (err) {
      console.error('Failed to submit outdated menu', err)
      toast.error('Не удалось отправить сообщение. Попробуйте позже.')
    } finally {
      setSubmitting(false)
    }
  }

  const commentPlaceholder =
    reason === 'missing_dishes'
      ? 'Укажите названия блюд'
      : 'Опишите проблему'

  const content = (
    <div
      className="feedback-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Меню устарело"
      onClick={handleClose}
    >
      <div className="feedback-modal" onClick={(event) => event.stopPropagation()}>
        <div className="feedback-modal__header">
          <h4 className="feedback-modal__title">Меню устарело</h4>
          <button
            type="button"
            className="feedback-modal__close"
            aria-label="Закрыть"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <form className="feedback-modal__form" onSubmit={handleSubmit}>
          <fieldset className="feedback-modal__fieldset">
            <legend className="feedback-modal__legend">Причина</legend>
            <label className="feedback-modal__option">
              <input
                type="radio"
                name="menu-outdated-reason"
                value="missing_dishes"
                checked={reason === 'missing_dishes'}
                onChange={() => setReason('missing_dishes')}
              />
              <span>Не хватает блюда</span>
            </label>
            <label className="feedback-modal__option">
              <input
                type="radio"
                name="menu-outdated-reason"
                value="seasonal_menu"
                checked={reason === 'seasonal_menu'}
                onChange={() => setReason('seasonal_menu')}
              />
              <span>Новое сезонное меню</span>
            </label>
            <label className="feedback-modal__option">
              <input
                type="radio"
                name="menu-outdated-reason"
                value="restaurant_closed"
                checked={reason === 'restaurant_closed'}
                onChange={() => setReason('restaurant_closed')}
              />
              <span>Ресторан больше не работает</span>
            </label>
            <label className="feedback-modal__option">
              <input
                type="radio"
                name="menu-outdated-reason"
                value="other"
                checked={reason === 'other'}
                onChange={() => setReason('other')}
              />
              <span>Другое</span>
            </label>
          </fieldset>

          {(reason === 'missing_dishes' || reason === 'other') && (
            <label className="feedback-modal__field">
              <span>{reason === 'missing_dishes' ? 'Укажите название(я) блюда(блюд)' : 'Комментарий'}</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={commentPlaceholder}
                rows={3}
                required={requireComment}
              />
            </label>
          )}

          {error && (
            <p className="feedback-modal__error" role="status">
              {error}
            </p>
          )}

          <div className="feedback-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={handleClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Отправляем…' : 'Отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(content, root)
}

