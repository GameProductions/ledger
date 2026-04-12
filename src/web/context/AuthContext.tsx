import React, { createContext, useContext, useState } from 'react'

interface AuthContextType {
  user: any
  token: string | null
  householdId: string | null
  globalRole: string | null
  privacyMode: boolean
  isImpersonating: boolean
  login: (token: string, user: any) => void
  logout: () => void
  setHouseholdId: (id: string) => void
  setPrivacyMode: (active: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDev = import.meta.env.DEV;
  const [token, setToken] = useState<string | null>(localStorage.getItem('ledger_token') || (isDev ? 'dummy-token' : null))
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('ledger_user') || (isDev ? '{"id":"user-123","display_name":"Administrator","email":"admin@example.com"}' : 'null')))
  const [householdId, setHouseholdId] = useState<string | null>(localStorage.getItem('ledger_household_id') || (isDev ? 'household-abc' : null))
  const [privacyMode, setPrivacyMode] = useState<boolean>(localStorage.getItem('ledger_privacy_mode') === 'true')
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false)

  // Audit Phase 3: Zero-Trust Identity Verification
  React.useEffect(() => {
    if (token) {
      const verifySession = async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
            const data = await res.json()
            setGlobalRole(data.globalRole)
            setIsImpersonating(data.isImpersonating)
            localStorage.setItem('ledger_global_role', data.globalRole)
          } else if (res.status === 401) {
            logout()
          }
        } catch (err) {
          console.error('[Auth] Verification failed', err)
        }
      }
      verifySession()
    }
  }, [token])

  const login = (newToken: string, newUser: any) => {
    (window as any)._ledger_is_logging_out = false
    setToken(newToken)
    setUser(newUser)
    setGlobalRole(newUser.globalRole || 'user')
    localStorage.setItem('ledger_token', newToken)
    localStorage.setItem('ledger_user', JSON.stringify(newUser))
    localStorage.setItem('ledger_global_role', newUser.globalRole || 'user')
    
    // Clear impersonation on fresh login
    setIsImpersonating(false)
    localStorage.removeItem('ledger_impersonation_active')

    const hId = newUser.householdId || 'ledger-main-001'
    setHouseholdId(hId)
    localStorage.setItem('ledger_household_id', hId)
  }

  const logout = () => {
    (window as any)._ledger_is_logging_out = true
    setToken(null)
    setUser(null)
    setHouseholdId(null)
    setGlobalRole(null)
    setPrivacyMode(false)
    setIsImpersonating(false)
    localStorage.removeItem('ledger_token')
    localStorage.removeItem('ledger_user')
    localStorage.removeItem('ledger_household_id')
    localStorage.removeItem('ledger_global_role')
    localStorage.removeItem('ledger_privacy_mode')
    localStorage.removeItem('ledger_impersonation_active')
  }

  const handleSetPrivacyMode = (active: boolean) => {
    setPrivacyMode(active)
    localStorage.setItem('ledger_privacy_mode', active ? 'true' : 'false')
  }

  const handleSetHouseholdId = (id: string) => {
    setHouseholdId(id)
    localStorage.setItem('ledger_household_id', id)
    window.location.reload() // Force reload to refresh all useApi hooks
  }

  return (
    <AuthContext.Provider value={{ 
      user, token, householdId, globalRole, privacyMode, isImpersonating,
      login, logout, setHouseholdId: handleSetHouseholdId, setPrivacyMode: handleSetPrivacyMode 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
