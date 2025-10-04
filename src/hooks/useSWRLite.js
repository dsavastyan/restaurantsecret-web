import { useEffect, useRef, useState } from 'react'

export function useSWRLite(key, fetcher, { initialData=null } = {}) {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(!initialData)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    setLoading(true)
    setError(null)
    fetcher()
      .then(d => mounted.current && setData(d))
      .catch(e => mounted.current && setError(e))
      .finally(() => mounted.current && setLoading(false))
    return () => { mounted.current = false }
  }, [key])

  return { data, error, loading, mutate: setData }
}
