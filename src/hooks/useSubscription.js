import { useEffect, useState } from 'react'
import { API_BASE } from '@/config/api'

export function useSubscription() {
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let aborted = false

    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/me`, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!res.ok) throw new Error('NO_ME')
        const data = await res.json().catch(() => ({}))
        if (!aborted) setIsActive(Boolean(data?.isActive))
      } catch (err) {
        if (!aborted) setIsActive(false)
      } finally {
        if (!aborted) setLoading(false)
      }
    }

    load()
    return () => {
      aborted = true
    }
  }, [])

  return { loading, isActive }
}
