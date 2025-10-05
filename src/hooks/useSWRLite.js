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
    setLoading(true)
    setError(null)

    Promise.resolve()
      .then(() => fetcher())
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [key, enabled])

  return { data, error, loading, mutate: setData }
}
