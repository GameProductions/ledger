import { useAuth } from '../context/AuthContext'
import { useApi, globalMutate } from './useApi'
import { getApiUrl } from '../utils/api'
import { DASHBOARD_TABS, toggleWidgetInLayout, getAllWidgets } from '../lib/dashboardWidgets'

export function useDashboardWidgets() {
  const { token, householdId } = useAuth()
  const { data: profile } = useApi('/api/user/profile') as any
  const settings = JSON.parse(profile?.settingsJson || '{}')

  const toggleWidget = async (widgetId: string) => {
    if (!token) return
    const apiUrl = getApiUrl()
    const newLayout = toggleWidgetInLayout(settings.dashboardLayout, widgetId)
    const newSettings = { ...settings, dashboardLayout: newLayout }
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

  const isWidgetVisible = (widgetId: string): boolean => {
    const layout = settings.dashboardLayout
    if (!layout) return true
    for (const tab of DASHBOARD_TABS) {
      const tabWidgets = layout[tab.tabId]
      if (tabWidgets) {
        const w = tabWidgets.find((w: any) => w.id === widgetId)
        if (w) return w.visible !== false
      }
    }
    return true
  }

  return { DASHBOARD_TABS, getAllWidgets, toggleWidget, isWidgetVisible }
}
