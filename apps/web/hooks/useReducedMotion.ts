import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ledger_reduced_motion'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === null) setReduced(e.matches)
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
