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
  const [token, setToken] = useState<string | null>(localStorage.getItem('cash_token'))
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('cash_user') || 'null'))
  const [householdId, setHouseholdId] = useState<string | null>(localStorage.getItem('cash_household_id') || 'household-abc')
  const [globalRole, setGlobalRole] = useState<string | null>(localStorage.getItem('cash_global_role') || 'user')

  const login = (newToken: string, newUser: any) => {
    setToken(newToken)
    setUser(newUser)
    setGlobalRole(newUser.globalRole || 'user')
    localStorage.setItem('cash_token', newToken)
    localStorage.setItem('cash_user', JSON.stringify(newUser))
    localStorage.setItem('cash_global_role', newUser.globalRole || 'user')
    // Default household on login if not set
    if (!householdId) {
      setHouseholdId('household-abc')
      localStorage.setItem('cash_household_id', 'household-abc')
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setHouseholdId(null)
    setGlobalRole(null)
    localStorage.removeItem('cash_token')
    localStorage.removeItem('cash_user')
    localStorage.removeItem('cash_household_id')
    localStorage.removeItem('cash_global_role')
  }

  const handleSetHouseholdId = (id: string) => {
    setHouseholdId(id)
    localStorage.setItem('cash_household_id', id)
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
