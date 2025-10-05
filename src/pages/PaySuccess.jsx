import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const queryErrors = {
  no_id: 'Платёж не найден. Попробуйте оформить подписку ещё раз.',
  mock_error: 'Не удалось подтвердить оплату. Попробуйте проверить доступ немного позже.'
}

function formatDate(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch (err) {
    console.warn('Failed to format date', err)
    return value
  }
}

export default function PaySuccess({ onAccessUpdate, access = {} }) {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [expiresAt, setExpiresAt] = useState(access?.expiresAt ?? null)

  useEffect(() => {
    setExpiresAt(access?.expiresAt ?? null)
  }, [access?.expiresAt])

  const queryMessage = useMemo(() => {
    const code = searchParams.get('e')
    if (!code) return ''
    return queryErrors[code] ?? 'Не удалось обработать параметры платежа. Пожалуйста, проверьте подписку.'
  }, [searchParams])

  const refreshAccess = async () => {
    setLoading(true)
    setStatus('loading')
    setMessage('')
    try {
      const user = (typeof window !== 'undefined' && window.localStorage.getItem('rs_tg_user_id')) || '176483490'
      const response = await fetch('https://api.restaurantsecret.ru/me', {
        headers: {
          'Authorization': `Bearer ${user}`
        }
      })

      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}. Попробуйте позже.`)
      }

      const me = await response.json()
      const detail = {
        ok: me?.ok ?? true,
        isActive: Boolean(me?.isActive),
        expiresAt: me?.expiresAt ?? null
      }

      onAccessUpdate?.(detail)

      if (!detail.ok && !detail.isActive) {
        setStatus('error')
        setMessage('Не удалось подтвердить подписку. Попробуйте позже.')
        setExpiresAt(detail.expiresAt)
        return
      }

      if (detail.isActive) {
        setStatus('success')
        setExpiresAt(detail.expiresAt)
        setMessage('Доступ подтверждён.')
      } else {
        setStatus('inactive')
        setExpiresAt(detail.expiresAt)
        setMessage('Подписка пока не активна. Попробуйте повторить проверку позже.')
      }
    } catch (err) {
      console.error('Failed to refresh access', err)
      setStatus('error')
      setMessage(err?.message ?? 'Не удалось проверить доступ. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h1>Оплата прошла успешно</h1>
      <p>Если вы уже завершили оплату, подтвердите подписку, чтобы снять ограничения и получить доступ к каталогу.</p>
      {queryMessage && <p className="err" role="alert">{queryMessage}</p>}
      {message && (
        <p className={status === 'error' ? 'err' : 'muted'} role={status === 'error' ? 'alert' : undefined}>
          {message}
        </p>
      )}
      {expiresAt && status === 'success' && (
        <p className="muted">Доступ активен до {formatDate(expiresAt)}.</p>
      )}
      <div className="actions">
        <button type="button" className="primary" onClick={refreshAccess} disabled={loading}>
          {loading ? 'Проверяем…' : 'Проверить доступ'}
        </button>
        <Link to="/" className="link">Вернуться на главную</Link>
      </div>
    </div>
  )
}
