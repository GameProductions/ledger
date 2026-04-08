import { useState, useEffect, Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { OnboardingProvider } from './context/OnboardingContext'
import { ToastProvider } from './context/ToastContext'
import { GlobalLayout } from './components/layout/GlobalLayout'
import { Toaster } from './components/foundation/common/Toaster'
import { IdentityHead } from './components/foundation/common/IdentityHead'
import { OnboardingTour } from './components/foundation/help/OnboardingTour'
import { HelpCenter as FoundationHelp } from './components/foundation/help/HelpCenter'
import { UserManager } from './components/foundation/admin/UserManager'
import logo from './assets/logo.svg'

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const ClaimInvitePage = lazy(() => import('./pages/auth/ClaimInvitePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PreferencesPage = lazy(() => import('./pages/PreferencesPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const DataCenterPage = lazy(() => import('./pages/DataCenterPage'))
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
const PCCData = lazy(() => import('./pages/pcc/PCCData'))
const PCCUsers = lazy(() => import('./pages/pcc/PCCUsers'))
const PCCHouseholds = lazy(() => import('./pages/pcc/PCCHouseholds'))
const PCCSearch = lazy(() => import('./pages/pcc/PCCSearch'))
const PCCAudit = lazy(() => import('./pages/pcc/PCCAudit'))
const PCCProviders = lazy(() => import('./pages/pcc/PCCProviders'))
const PCCProcessors = lazy(() => import('./pages/pcc/PCCProcessors'))
const PCCGuide = lazy(() => import('./pages/pcc/PCCGuide'))
const PaymentCentralPage = lazy(() => import('./pages/PaymentCentralPage'))
const JoinHouseholdPage = lazy(() => import('./pages/JoinHouseholdPage'))
import { PasskeyChallenge } from './components/PasskeyChallenge'

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
    const path = currentHash.split('?')[0]
    // 1. Root / Landing Page
    if (path === '' || path === '#/') {
      if (user) return <DashboardPage view={view} setView={setView} />
      return <LandingPage />
    }

    // 2. Public Routes (No session required)
    if (path === '#/privacy') return <PrivacyPolicy />
    if (path === '#/terms') return <TermsOfService />
    if (path === '#/login') {
      if (user) return <DashboardPage view={view} setView={setView} />
      return <LoginPage />
    }
    if (path.startsWith('#/claim')) return <ClaimInvitePage />
    if (path.startsWith('#/households/join')) return <JoinHouseholdPage />

    // 3. Auth Guard
    if (!user) return <LoginPage />

    // 3. Platform Command Center (PCC) - Super-Admin Only
    if (path.startsWith('#/system-pcc')) {
      if (globalRole !== 'super_admin') return <DashboardPage view={view} setView={setView} />
      
      const renderPCC = () => {
        if (path === '#/system-pcc/dashboard') return <PCCDashboard />
        if (path === '#/system-pcc/config') return <PCCConfig />
        if (path === '#/system-pcc/registry') return <PCCData />
        if (path === '#/system-pcc/users') return <PCCUsers />
        if (path === '#/system-pcc/households') return <PCCHouseholds />
        if (path === '#/system-pcc/search') return <PCCSearch />
        if (path === '#/system-pcc/audit') return <PCCAudit />
        if (path === '#/system-pcc/providers') return <PCCProviders />
        if (path === '#/system-pcc/processors') return <PCCProcessors />
        if (path === '#/system-pcc/guide') return <PCCGuide />
        return <PCCDashboard />
      }

      return (
        <PasskeyChallenge onSuccess={() => {}} appName="LEDGER Systems">
          {renderPCC()}
        </PasskeyChallenge>
      )
    }

    // 4. Authenticated Component Routes
    if (path === '#/settings') return <SettingsPage />
    if (path === '#/preferences') return <PreferencesPage />
    if (path === '#/reports') return <ReportsPage />
    if (path === '#/payments') return <PaymentCentralPage />
    if (path === '#/data') return <DataCenterPage />
    if (path.startsWith('#/snapshot/')) return <SnapshotViewer />
    if (path === '#/backup') return <BackupHub />
    if (path === '#/help') return <HelpCenter />
    if (path === '#/help/guides') return <GuidesPage />
    if (path === '#/help/faq') return <FAQPage />
    if (path === '#/help/support') return <SupportPortal />
    if (path === '#/help/tours') return <ToursPage />

    // 5. Default Route: Dashboard
    return <DashboardPage view={view} setView={setView} />
  }

  return (
    <GlobalLayout>
      <IdentityHead 
        appName="Ledger" 
        appDescription="Forensic financial privacy & data ownership and multi-household budget management." 
        appLogo={logo} 
      />
      <Suspense fallback={null}>
        {renderView()}
      </Suspense>
      <Toaster position="bottom-right" />
      <OnboardingTour appId="ledger" />
      <FoundationHelp appId="ledger" />
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
