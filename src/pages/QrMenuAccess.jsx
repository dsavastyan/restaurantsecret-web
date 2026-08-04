// Resolves a restaurant's personal QR token to its menu, grants a temporary
// session-only "free access" pass, then replaces the URL so the token never
// sits in browser history or gets shared onward.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '@/lib/requests'
import { startQrMenuSession } from '@/lib/qrMenuAccess'

export default function QrMenuAccess() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    ;(async () => {
      try {
        const data = await apiGet(`/menu-qr/${encodeURIComponent(token)}`)
        const slug = data?.restaurant?.slug
        if (!data?.ok || !slug) throw new Error('menu_qr_not_found')
        startQrMenuSession(slug)
        navigate(`/restaurants/${encodeURIComponent(slug)}/menu/`, { replace: true })
      } catch {
        setError(true)
      }
    })()
  }, [navigate, token])

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '80px 24px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {error ? (
        <>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
            Ссылка недействительна
          </h1>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
            Попробуйте отсканировать QR-код ещё раз.
          </p>
        </>
      ) : (
        <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>Открываем меню…</p>
      )}
    </main>
  )
}
