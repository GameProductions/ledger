import { useAuth } from '../context/AuthContext'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

export const useApi = <T = any>(path: string, options: { refreshInterval?: number } = {}) => {
  const { token, logout, householdId } = useAuth()
  const [data, setData] = useState<T | undefined>(undefined)
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
          'x-household-id': householdId || ''
        }
      })
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          const isLoggingOut = (window as any)._ledger_is_logging_out;
          if (!isLoggingOut) {
            (window as any)._ledger_is_logging_out = true;
            console.error(`Auth Error (${res.status}) on ${path}. Initiating global logout.`);
            logout();
          }
          return;
        }
        throw new Error(`API Error: ${res.status}`);
      }

      const envelope = await res.json()
      
      // Zero-Trust Validation: Every response MUST follow the { success: true, data: T } envelope
      if (envelope.success !== true || envelope.data === undefined) {
        console.error(`[DIAGNOSTIC_FAILURE] Malformed response envelope from ${path}`, envelope);
        throw new Error(`API System Error: Strict envelope missing for ${path}`);
      }

      setData((prevData) => {
        if (JSON.stringify(envelope.data) !== JSON.stringify(prevData)) {
          return envelope.data;
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

  const lastPathRef = useRef<string>(path);
  const lastHouseholdIdRef = useRef<string | null>(householdId);

  useEffect(() => {
    // ONLY reset state if the resource path or context (household) actually changed
    // This prevents infinite loops and flickering on simple re-renders or manual mutations
    if (path !== lastPathRef.current || householdId !== lastHouseholdIdRef.current) {
      setData(undefined)
      setLoading(true)
      setError(null)
      lastPathRef.current = path
      lastHouseholdIdRef.current = householdId
    }
    
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
  }, [fetcher, trigger, options.refreshInterval, path, householdId])

  const mutate = () => setTrigger(v => v + 1)

  return { data, loading, error, mutate }
}
