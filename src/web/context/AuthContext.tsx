import React, { createContext, useContext, useState } from 'react'
import { getApiUrl } from '../utils/api'

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
  const [householdId, setHouseholdId] = useState<string | null>(localStorage.getItem('ledger_householdId') || (isDev ? 'household-abc' : null))
  const [globalRole, setGlobalRole] = useState<string | null>(localStorage.getItem('ledger_globalRole') || 'user')
  const [privacyMode, setPrivacyMode] = useState<boolean>(localStorage.getItem('ledger_privacy_mode') === 'true')
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false)

  // Session Verification
  React.useEffect(() => {
    if (token) {
      const verifySession = async () => {
        try {
          const apiUrl = getApiUrl()
          const res = await fetch(`${apiUrl}/api/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
            const envelope = await res.json()
            if (envelope.success && envelope.data) {
              const { global_role: role, is_impersonating: imp } = envelope.data
              setGlobalRole(role)
              setIsImpersonating(imp)
              localStorage.setItem('ledger_globalRole', role)
            } else {
              console.error('[Verification failed] Malformed verify response', envelope)
              logout()
            }
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

  const login = React.useCallback((newToken: string, newUser: any) => {
    (window as any)._ledger_is_logging_out = false
    setToken(newToken)
    setUser(newUser)
    setGlobalRole(newUser.global_role || 'user')
    localStorage.setItem('ledger_token', newToken)
    localStorage.setItem('ledger_user', JSON.stringify(newUser))
    localStorage.setItem('ledger_globalRole', newUser.global_role || 'user')
    
    // Clear impersonation on fresh login
    setIsImpersonating(false)
    localStorage.removeItem('ledger_impersonation_active')

    // FORENSIC PRIORITY: Prioritize the householdId from the profile if available
    const hId = newUser.household_id || 'ledger-main-001'
    setHouseholdId(hId)
    localStorage.setItem('ledger_householdId', hId)
  }, [])

  const logout = React.useCallback(() => {
    // Clear memory state before storage for immediate UI lockout
    (window as any)._ledger_is_logging_out = true
    setToken(null)
    setUser(null)
    setHouseholdId(null)
    setGlobalRole(null)
    setPrivacyMode(false)
    setIsImpersonating(false)
    
    // Clear storage
    localStorage.removeItem('ledger_token')
    localStorage.removeItem('ledger_user')
    localStorage.removeItem('ledger_householdId')
    localStorage.removeItem('ledger_globalRole')
    localStorage.removeItem('ledger_privacy_mode')
    localStorage.removeItem('ledger_impersonation_active')
  }, [])

  const handleSetPrivacyMode = React.useCallback((active: boolean) => {
    setPrivacyMode(active)
    localStorage.setItem('ledger_privacy_mode', active ? 'true' : 'false')
  }, [])

  const handleSetHouseholdId = React.useCallback((id: string) => {
    setHouseholdId(id)
    localStorage.setItem('ledger_householdId', id)
    // Removed window.location.reload() - useApi will now be reactive
  }, [])

  const authValue = React.useMemo(() => ({ 
    user, token, householdId, globalRole, privacyMode, isImpersonating,
    login, logout, setHouseholdId: handleSetHouseholdId, setPrivacyMode: handleSetPrivacyMode 
  }), [user, token, householdId, globalRole, privacyMode, isImpersonating, login, logout, handleSetHouseholdId, handleSetPrivacyMode])


  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
