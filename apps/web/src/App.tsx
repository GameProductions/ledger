import { useState, useEffect, Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { OnboardingProvider } from './context/OnboardingContext'
import { ToastProvider } from './context/ToastContext'
import { GlobalLayout } from './components/layout/GlobalLayout'

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ClaimInvitePage = lazy(() => import('./pages/auth/ClaimInvitePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PreferencesPage = lazy(() => import('./pages/PreferencesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const DataInteropPage = lazy(() => import('./pages/DataInteropPage'))
const SnapshotViewer = lazy(() => import('./pages/SnapshotViewer'))
const BackupHub = lazy(() => import('./pages/BackupHub'))
const HelpCenter = lazy(() => import('./pages/help/HelpCenter').then(m => ({ default: m.HelpCenter })))
const GuidesPage = lazy(() => import('./pages/help/GuidesPage').then(m => ({ default: m.GuidesPage })))
const FAQPage = lazy(() => import('./pages/help/GuidesPage').then(m => ({ default: m.FAQPage })))
const SupportPortal = lazy(() => import('./pages/help/SupportPortal').then(m => ({ default: m.SupportPortal })))
const ToursPage = lazy(() => import('./pages/help/ToursPage').then(m => ({ default: m.ToursPage })))
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./components/TermsOfService'))
const PCCDashboard = lazy(() => import('./pages/pcc/PCCDashboard'))
const PCCConfig = lazy(() => import('./pages/pcc/PCCConfig'))
const PCCRegistry = lazy(() => import('./pages/pcc/PCCRegistry'))
const PCCUsers = lazy(() => import('./pages/pcc/PCCUsers'))
const PCCSearch = lazy(() => import('./pages/pcc/PCCSearch'))
const PCCAudit = lazy(() => import('./pages/pcc/PCCAudit'))

const AppContent: React.FC = () => {
  const { user, globalRole } = useAuth()
  const [currentHash, setCurrentHash] = useState(window.location.hash)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Helper to render the actual component
  const renderView = () => {
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
    if (currentHash === '#/reports') return <ReportsPage />
    if (currentHash === '#/data') return <DataInteropPage />
    if (currentHash.startsWith('#/snapshot/')) return <SnapshotViewer />
    if (currentHash === '#/backup') return <BackupHub />
    if (currentHash === '#/help') return <HelpCenter />
    if (currentHash === '#/help/guides') return <GuidesPage />
    if (currentHash === '#/help/faq') return <FAQPage />
    if (currentHash === '#/help/support') return <SupportPortal />
    if (currentHash === '#/help/tours') return <ToursPage />

    // 5. Default Route: Dashboard
    return <DashboardPage view={view} setView={setView} />
  }

  return (
    <GlobalLayout>
      <Suspense fallback={null}>
        {renderView()}
      </Suspense>
    </GlobalLayout>
  )
}

const App: React.FC = () => (
  <AuthProvider>
    <ThemeProvider>
      <CurrencyProvider>
        <ToastProvider>
          <OnboardingProvider>
            <AppContent />
          </OnboardingProvider>
        </ToastProvider>
      </CurrencyProvider>
    </ThemeProvider>
  </AuthProvider>
)

export default App
