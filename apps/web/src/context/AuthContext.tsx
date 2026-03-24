import React, { createContext, useContext, useState } from 'react'

interface AuthContextType {
  user: any
  token: string | null
  householdId: string | null
  globalRole: string | null
  login: (token: string, user: any) => void
  logout: () => void
  setHouseholdId: (id: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ledger_token'))
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('ledger_user') || 'null'))
  const [householdId, setHouseholdId] = useState<string | null>(localStorage.getItem('ledger_household_id'))
  const [globalRole, setGlobalRole] = useState<string | null>(localStorage.getItem('ledger_global_role') || 'user')

  const login = (newToken: string, newUser: any) => {
    setToken(newToken)
    setUser(newUser)
    setGlobalRole(newUser.globalRole || 'user')
    localStorage.setItem('ledger_token', newToken)
    localStorage.setItem('ledger_user', JSON.stringify(newUser))
    localStorage.setItem('ledger_global_role', newUser.globalRole || 'user')
    const hId = newUser.householdId || 'ledger-main-001'
    setHouseholdId(hId)
    localStorage.setItem('ledger_household_id', hId)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setHouseholdId(null)
    setGlobalRole(null)
    localStorage.removeItem('ledger_token')
    localStorage.removeItem('ledger_user')
    localStorage.removeItem('ledger_household_id')
    localStorage.removeItem('ledger_global_role')
  }

  const handleSetHouseholdId = (id: string) => {
    setHouseholdId(id)
    localStorage.setItem('ledger_household_id', id)
    window.location.reload() // Force reload to refresh all useApi hooks
  }

  return (
    <AuthContext.Provider value={{ user, token, householdId, globalRole, login, logout, setHouseholdId: handleSetHouseholdId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
