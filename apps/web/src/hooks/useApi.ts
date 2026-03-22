import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'

const API_URL = 'http://localhost:8787'

export const useApi = (path: string) => {
  const { token } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    if (!token) return

    fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-household-id': localStorage.getItem('cash_household_id') || 'household-abc'
      }
    })
    .then(res => res.json())
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false))
  }, [path, token])

  return { data, loading, error }
}
