import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ledger_reduced_motion'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null) return saved === 'true'
      return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === null) setReduced(e.matches)
      } catch {}
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}

export function setReducedMotion(value: boolean) {
  localStorage.setItem(STORAGE_KEY, String(value))
  document.documentElement.classList.toggle('reduced-motion', value)
}
