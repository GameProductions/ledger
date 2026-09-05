import React, { createContext, useContext, useState } from 'react'
import { getApiUrl } from '../utils/api'


interface AuthContextType {
  user: any
  token: string | null
  householdId: string | null
  globalRole: string | null
  privacyMode: boolean
  isImpersonating: boolean
  isAdminVerified: boolean
  setAdminVerified: (verified: boolean) => void
  login: (token: string, user: any) => void
  logout: () => void
  setHouseholdId: (id: string) => void
  setPrivacyMode: (active: boolean) => void
  secureFetch: (input: string, init?: RequestInit) => Promise<Response>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('ledger_token') : null)
  const [user, setUser] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem('ledger_user') || 'null');
    } catch {
      return null;
    }
  })
  const [householdId, setRawHouseholdId] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('ledger_householdId') : null)
  const [globalRole, setGlobalRole] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('ledger_globalRole') || 'user' : 'user')
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => typeof window !== 'undefined' ? localStorage.getItem('ledger_privacy_mode') === 'true' : false)
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false)
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false)

  const logout = React.useCallback(() => {
    // Clear memory state before storage for immediate UI lockout
    (window as any)._ledger_is_logging_out = true
    setToken(null)
    setUser(null)
    setRawHouseholdId(null)
    setGlobalRole(null)
    setPrivacyMode(false)
    setIsImpersonating(false)
    setIsAdminVerified(false)
    
    // Clear storage
    localStorage.removeItem('ledger_token')
    localStorage.removeItem('ledger_user')
    localStorage.removeItem('ledger_householdId')
    localStorage.removeItem('ledger_globalRole')
    localStorage.removeItem('ledger_privacy_mode')
    localStorage.removeItem('ledger_impersonation_active')
  }, [])

  const login = React.useCallback((newToken: string, newUser: any) => {
    (window as any)._ledger_is_logging_out = false
    setToken(newToken)
    setUser(newUser)
    setGlobalRole(newUser.globalRole || 'user')
    localStorage.setItem('ledger_token', newToken)
    localStorage.setItem('ledger_user', JSON.stringify(newUser))
    localStorage.setItem('ledger_globalRole', newUser.globalRole || 'user')
    
    // Clear impersonation on fresh login
    setIsImpersonating(false)
    localStorage.removeItem('ledger_impersonation_active')

    // FORENSIC PRIORITY: Prioritize the householdId from the profile if available
    const hId = newUser.householdId || null
    setRawHouseholdId(hId)
    localStorage.setItem('ledger_householdId', hId || '')
  }, [])

  // Session Verification & Profile Hydration
  React.useEffect(() => {
    if (token) {
      let isCancelled = false
      const verifySession = async () => {
        try {
          const apiUrl = getApiUrl()
          const res = (await fetch(`${apiUrl}/api/auth/verify`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    }) as any)
          if (isCancelled) return
          if (res.ok) {
            const envelope = (await res.json() as any)
            if (envelope.success && envelope.data) {
              const { globalRole: role, isImpersonating: imp, householdId: verifiedHouseholdId } = envelope.data
              setGlobalRole(role)
              setIsImpersonating(imp)
              localStorage.setItem('ledger_globalRole', role)

              // Sync verified household context to state and local storage
              if (verifiedHouseholdId) {
                setRawHouseholdId(verifiedHouseholdId)
                localStorage.setItem('ledger_householdId', verifiedHouseholdId)
              }

              // Hydrate user profile if not present
              if (!user) {
                const profileRes = await fetch(`${apiUrl}/api/user/profile`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                if (isCancelled) return
                if (profileRes.ok) {
                  const pEnv = (await profileRes.json() as any)
                  if (pEnv.success && pEnv.data) {
                    setUser(pEnv.data)
                    localStorage.setItem('ledger_user', JSON.stringify(pEnv.data))
                  }
                } else if (profileRes.status === 401 || profileRes.status === 403) {
                  logout()
                }
              }
            } else {
              logout()
            }
          } else if (res.status === 401 || res.status === 403) {
            logout()
          }
        } catch (err: any) {
          console.warn('[Auth] Verification check encountered an issue:', err?.message || err)
        }
      }
      verifySession()
      return () => {
        isCancelled = true
      }
    }
  }, [token, user, logout])

  // Listen for storage events (e.g. from LoginDialog saving ledger_token)
  React.useEffect(() => {
    const handleStorage = (e?: StorageEvent) => {
      if (e && e.key && !e.key.startsWith('ledger_')) return
      const savedToken = localStorage.getItem('ledger_token')
      if (savedToken) {
        (window as any)._ledger_is_logging_out = false
        setToken(savedToken)
      } else {
        setToken(null)
      }
      const savedUserStr = localStorage.getItem('ledger_user')
      if (savedUserStr) {
        try {
          setUser(JSON.parse(savedUserStr))
        } catch {}
      } else {
        setUser(null)
      }
      const savedHousehold = localStorage.getItem('ledger_householdId')
      if (savedHousehold) {
        setRawHouseholdId(savedHousehold)
      }
      const savedRole = localStorage.getItem('ledger_globalRole')
      if (savedRole) {
        setGlobalRole(savedRole)
      }
    }

    window.addEventListener('storage', handleStorage)
    // Custom sync event for same-window updates
    window.addEventListener('ledger_auth_sync', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('ledger_auth_sync', handleStorage)
    }
  }, [])

  const handleSetPrivacyMode = React.useCallback((active: boolean) => {
    setPrivacyMode(active)
    localStorage.setItem('ledger_privacy_mode', active ? 'true' : 'false')
  }, [])

  const handleSetHouseholdId = React.useCallback((id: string) => {
    localStorage.setItem('ledger_householdId', id)
    setRawHouseholdId(id)
    window.location.reload()
  }, [])

  const secureFetch = React.useCallback(async (input: string, init?: RequestInit): Promise<Response> => {
    const apiUrl = getApiUrl()
    const url = input.startsWith('http') ? input : `${apiUrl}${input}`
    
    const makeRequest = () => fetch(url, {
      ...init,
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-household-id': householdId || '',
        ...(init?.headers || {})
      }
    })

    const res = (await makeRequest() as any)

    if ((res.status === 401 || res.status === 403)) {
      const isLoggingOut = (window as any)._ledger_is_logging_out;
      if (!isLoggingOut) {
        logout()
      }
    }

    return res
  }, [token, householdId, logout])

  const refreshProfile = React.useCallback(async () => {
    if (!token) return
    try {
      const apiUrl = getApiUrl()
      const res = await fetch(`${apiUrl}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const envelope = (await res.json() as any)
        if (envelope.success && envelope.data) {
          setUser(envelope.data)
          localStorage.setItem('ledger_user', JSON.stringify(envelope.data))
        }
      }
    } catch (err) {
      console.error('[Auth] Failed to refresh profile', err)
    }
  }, [token])

  const authValue = React.useMemo(() => ({ 
    user, token, householdId, globalRole, privacyMode, isImpersonating, isAdminVerified,
    setAdminVerified: setIsAdminVerified,
    login, logout, setHouseholdId: handleSetHouseholdId, setPrivacyMode: handleSetPrivacyMode,
    secureFetch, refreshProfile
  }), [user, token, householdId, globalRole, privacyMode, isImpersonating, isAdminVerified, login, logout, handleSetPrivacyMode, secureFetch, refreshProfile])

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
