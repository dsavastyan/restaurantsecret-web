// src/pages/NotFound.jsx
import { Link } from 'react-router-dom'
import { useMeta } from '@/lib/useMeta'

export default function NotFound() {
  useMeta({ title: 'Страница не найдена — RestaurantSecret' })

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
      <h1 style={{ fontSize: '5rem', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>404</h1>
      <p style={{ fontSize: '1.2rem', color: '#64748b', margin: '0 0 32px' }}>
        Такой страницы не существует
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '12px 28px',
          borderRadius: '12px',
          background: '#0ea5e9',
          color: '#fff',
          fontWeight: 600,
          textDecoration: 'none',
          fontSize: '1rem',
        }}
      >
        На главную
      </Link>
    </main>
  )
}
