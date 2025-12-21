// Hook for checking if the current user has an active subscription. It performs
// the fetch on mount and exposes loading + boolean state.
import { useEffect, useState } from 'react'
import { PD_API_BASE } from '@/config/api'

export function useSubscription() {
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let aborted = false

    // Fire once on mount and ignore updates if the component unmounts.
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(`${PD_API_BASE}/me`, {
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

  // Consumers only need to know if we are still loading and whether access is
  // active, so keep the API deliberately small.
  return { loading, isActive }
}
