import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { OnboardingProvider } from './context/OnboardingContext'
import { ToastProvider } from './context/ToastContext'
import LoginPage from './pages/auth/LoginPage'
import ClaimInvitePage from './pages/auth/ClaimInvitePage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import PreferencesPage from './pages/PreferencesPage'
import PrivacyPolicy from './components/PrivacyPolicy'
import TermsOfService from './components/TermsOfService'
import PCCDashboard from './pages/pcc/PCCDashboard'
import PCCConfig from './pages/pcc/PCCConfig'
import PCCRegistry from './pages/pcc/PCCRegistry'
import PCCUsers from './pages/pcc/PCCUsers'
import PCCSearch from './pages/pcc/PCCSearch'
import PCCAudit from './pages/pcc/PCCAudit'

const AppContent: React.FC = () => {
  const { user, globalRole } = useAuth()
  const [currentHash, setCurrentHash] = useState(window.location.hash)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // 1. Public Routes (No session required)
  if (currentHash === '#/privacy') return <PrivacyPolicy />
  if (currentHash === '#/terms') return <TermsOfService />
  if (currentHash.startsWith('#/claim')) return <ClaimInvitePage />

  // 2. Auth Guard
  if (!user) return <LoginPage />

  // 3. System-Wide Portal (PCC) Super-Admin Only
  if (currentHash.startsWith('#/system-pcc')) {
    if (globalRole !== 'super_admin') return <DashboardPage view={view} setView={setView} />
    if (currentHash === '#/system-pcc/dashboard') return <PCCDashboard />
    if (currentHash === '#/system-pcc/config') return <PCCConfig />
    if (currentHash === '#/system-pcc/registry') return <PCCRegistry />
    if (currentHash === '#/system-pcc/users') return <PCCUsers />
    if (currentHash === '#/system-pcc/search') return <PCCSearch />
    if (currentHash === '#/system-pcc/audit') return <PCCAudit />
    return <PCCDashboard />
  }

  // 4. Authenticated Component Routes
  if (currentHash === '#/settings') return <SettingsPage />
  if (currentHash === '#/preferences') return <PreferencesPage />

  // 5. Default Route: Dashboard
  return <DashboardPage view={view} setView={setView} />
}

const App: React.FC = () => (
  <AuthProvider>
    <ToastProvider>
      <OnboardingProvider>
        <AppContent />
      </OnboardingProvider>
    </ToastProvider>
  </AuthProvider>
)

export default App
