// Helper page that simulates a YooKassa webhook when testing payments locally.
import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_BASE } from '@/config/api'

export default function PayMockSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paymentId = searchParams.get('payment_id')

  useEffect(() => {
    if (!paymentId) {
      navigate('/pay/success?e=no_id', { replace: true })
      return
    }

    let cancelled = false

    // Send a fake webhook call to the backend so the mock payment can mark the
    // subscription as paid. On failure we redirect to the success page with an
    // explanatory error code.
    const confirmMock = async () => {
      try {
        const res = await fetch(`${API_BASE}/pay/webhook/yookassa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'payment.succeeded', object: { id: paymentId } })
        })
        if (!res.ok) {
          throw new Error(`Webhook responded with ${res.status}`)
        }
      } catch (err) {
        console.error('Failed to notify mock webhook', err)
        if (!cancelled) {
          navigate('/pay/success?e=mock_error', { replace: true })
          return
        }
      }

      if (!cancelled) {
        navigate('/pay/success', { replace: true })
      }
    }

    confirmMock()

    return () => {
      cancelled = true
    }
  }, [navigate, paymentId])

  return (
    <div className="page">
      <h1>Подтверждаем оплату…</h1>
      <p>Пожалуйста, подождите. Мы проверяем платёж и перенаправим вас автоматически.</p>
    </div>
  )
}
