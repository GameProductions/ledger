import { useAuth } from '../context/AuthContext'
import { useApi, globalMutate } from './useApi'
import { getApiUrl } from '../utils/api'
import type { NavVisibility } from '../lib/navigation'

export function useNavVisibility() {
  const { token, householdId } = useAuth()
  const { data: profile } = useApi('/api/user/profile') as any
  const settings = JSON.parse(profile?.settingsJson || '{}')
  const navVisibility: NavVisibility = settings.navigationVisibility || {}

  const toggleNavItem = async (id: string) => {
    if (!token) return
    const apiUrl = getApiUrl()
    const newVis = { ...navVisibility, [id]: !navVisibility[id] }
    const newSettings = { ...settings, navigationVisibility: newVis }
    await fetch(`${apiUrl}/api/user/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || '',
      },
      body: JSON.stringify({ settingsJson: JSON.stringify(newSettings) }),
    })
    globalMutate()
  }

  const isVisible = (id: string): boolean => navVisibility[id] !== false

  return { navVisibility, toggleNavItem, isVisible }
}
