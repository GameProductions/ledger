import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useCallback, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL

export const useApi = (path: string, options: { refreshInterval?: number } = {}) => {
  const { token } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [trigger, setTrigger] = useState(0)
  const lastFetchTime = useRef<number>(0)

  const fetcher = useCallback(async () => {
    if (!token) return
    // Pacing: Don't fetch more than once every 2 seconds unless triggered manually
    if (Date.now() - lastFetchTime.current < 2000 && options.refreshInterval) return
    
    // Visibility Check: Don't fetch if tab is hidden
    if (document.visibilityState !== 'visible') return

    try {
      const res = await fetch(`${API_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-household-id': localStorage.getItem('ledger_household_id') || 'household-abc'
        }
      })
      const json = await res.json()
      
      // Only update state if data actually changed (shallow comparison for now)
      if (JSON.stringify(json) !== JSON.stringify(data)) {
        setData(json)
      }
      lastFetchTime.current = Date.now()
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [path, token, data, options.refreshInterval])

  useEffect(() => {
    fetcher()
    if (options.refreshInterval) {
      const interval = setInterval(fetcher, options.refreshInterval)
      // Listen for visibility change to refetch when coming back
      const handleVisible = () => {
         if (document.visibilityState === 'visible') fetcher()
      }
      document.addEventListener('visibilitychange', handleVisible)
      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisible)
      }
    }
  }, [fetcher, trigger, options.refreshInterval])

  const mutate = () => setTrigger(v => v + 1)

  return { data, loading, error, mutate }
}
