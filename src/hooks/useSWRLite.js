// Minimal alternative to the SWR data fetching hook. It keeps the API surface
// tiny but still covers loading/error states and dedupes re-fetches by key.
import { useEffect, useState } from 'react'

export function useSWRLite(key, fetcher, { initialData = null, enabled = true } = {}) {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(enabled ? !initialData : false)

  useEffect(() => {
    if (!enabled || key === null || key === undefined) {
      setLoading(false)
      return undefined
    }

    let cancelled = false
    // Resolve the promise chain asynchronously so errors are caught and state
    // updates happen in the correct order.
    setLoading(true)
    setError(null)

    Promise.resolve()
      .then(() => fetcher())
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [key, enabled])

  // Expose a mutate setter so callers can optimistically update the cache.
  return { data, error, loading, mutate: setData }
}
