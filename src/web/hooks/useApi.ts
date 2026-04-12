import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useCallback, useRef } from 'react'

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL = rawApiUrl === 'undefined' || !rawApiUrl ? '' : rawApiUrl;

export const useApi = <T = any>(path: string, options: { refreshInterval?: number } = {}) => {
  const { token, logout, householdId } = useAuth()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [trigger, setTrigger] = useState(0)
  const lastFetchTime = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetcher = useCallback(async () => {
    if (!token) return
    
    // Cancel any existing request for this hook instance
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // Pacing: Don't fetch more than once every 2 seconds unless triggered manually
    if (Date.now() - lastFetchTime.current < 2000) return
    
    // Visibility Check: Don't fetch if tab is hidden
    if (document.visibilityState !== 'visible') return

    try {
      const res = await fetch(`${API_URL}${path}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          'x-household-id': householdId || (window.localStorage.getItem('ledger_household_id') || 'household-abc')
        }
      })
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Check if we are already logging out to prevent spam
          const isLoggingOut = (window as any)._ledger_is_logging_out;
          if (!isLoggingOut) {
            (window as any)._ledger_is_logging_out = true;
            console.error(`Auth Error (${res.status}) on ${path}. Initiating global logout.`);
            logout();
          }
          return; // Stop processing this failed request
        }
        throw new Error(`API Error: ${res.status}`);
      }

      const json = await res.json()
      
      // Only update state if data actually changed
      setData((prevData) => {
        if (JSON.stringify(json) !== JSON.stringify(prevData)) {
          return json;
        }
        return prevData;
      });
      lastFetchTime.current = Date.now()
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Ignore cancellations
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [path, token, householdId, options.refreshInterval, logout])

  useEffect(() => {
    fetcher()
    
    let interval: any;
    if (options.refreshInterval) {
      interval = setInterval(fetcher, options.refreshInterval)
    }

    const handleVisible = () => {
       if (document.visibilityState === 'visible') fetcher()
    }
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisible)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetcher, trigger, options.refreshInterval])

  const mutate = () => setTrigger(v => v + 1)

  return { data, loading, error, mutate }
}
