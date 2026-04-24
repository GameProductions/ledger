import { useState, useEffect, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { getApiUrl } from './utils/api'
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
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminConfig = lazy(() => import('./pages/admin/AdminConfig'))
const AdminData = lazy(() => import('./pages/admin/AdminData'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminHouseholds = lazy(() => import('./pages/admin/AdminHouseholds'))
const AdminSearch = lazy(() => import('./pages/admin/AdminSearch'))
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'))
const AdminProviders = lazy(() => import('./pages/admin/AdminProviders'))
const AdminProcessors = lazy(() => import('./pages/admin/AdminProcessors'))
const AdminBroadcast = lazy(() => import('./pages/admin/AdminBroadcast'))
const AdminGuide = lazy(() => import('./pages/admin/AdminGuide'))
const PaymentCentralPage = lazy(() => import('./pages/PaymentCentralPage'))
const JoinHouseholdPage = lazy(() => import('./pages/JoinHouseholdPage'))
const LoanManagerPage = lazy(() => import('./pages/LoanManagerPage'))
const InvestmentPortfolioPage = lazy(() => import('./pages/InvestmentPortfolioPage'))
const PasskeyChallenge = lazy(() => import('./components/PasskeyChallenge'))
import { MaintenanceView } from './components/MaintenanceView'
import { AlertTriangle, WifiOff, ExternalLink } from 'lucide-react'

const AppContent: React.FC = () => {
  const { user, globalRole } = useAuth()
  const [currentHash, setCurrentHash] = useState(window.location.hash)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [retryAttempt, setRetryAttempt] = useState(0)

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Maintenance & System Config Engine with Resilience (3 Attempts)
  useEffect(() => {
    const fetchWithRetry = async (attempt: number = 1): Promise<void> => {
      setRetryAttempt(attempt > 1 ? attempt : 0)
      try {
        const apiUrl = getApiUrl()
        const res = await fetch(`${apiUrl}/api/config`)
        
        if (res.status === 503) {
          setIsMaintenance(true)
          setIsError(false)
          setIsLoadingConfig(false)
          setRetryAttempt(0)
          return
        }

        if (!res.ok) {
           // Handle rate limits (429) specifically
           if (res.status === 429 && attempt < 3) {
              const retryAfter = parseInt(res.headers.get('Retry-After') || '2')
              await new Promise(r => setTimeout(r, retryAfter * 1000))
              return fetchWithRetry(attempt + 1)
           }
           throw new Error(`Connection Error: ${res.status}`)
        }

        const config = await res.json()
        setIsMaintenance(config.MAINTENANCE_MODE === 'true' || config.MAINTENANCE_MODE === true)
        setIsError(false)
        setRetryAttempt(0)
      } catch (e) {
        if (attempt < 3) {
          // Linear backoff for standard errors
          await new Promise(r => setTimeout(r, 2000 * attempt))
          return fetchWithRetry(attempt + 1)
        }
        console.error('[System Config Error]', e)
        setIsError(true)
        setRetryAttempt(0)
      } finally {
        setIsLoadingConfig(false)
      }
    }

    fetchWithRetry()
    // Poll for status changes every 60s
    const pollId = setInterval(() => fetchWithRetry(1), 60000)
    return () => clearInterval(pollId)
  }, [])

  // Helper to render the actual component
  const renderView = () => {
    const path = currentHash.split('?')[0]

    // Connection Error View (3rd attempt failure)
    if (isError && !isMaintenance) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center bg-slate-950/50 backdrop-blur-xl rounded-2xl border border-white/5">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <WifiOff className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connection Check Failure</h2>
          <p className="max-w-md text-slate-400 mb-8 leading-relaxed">
            The platform encountered repeated errors while checking security status. Three connection attempts were unsuccessful.
          </p>
          
          <div className="w-full max-w-sm rounded-xl bg-white/5 p-6 text-left border border-white/10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Manual Instructions</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <span className="text-blue-400 font-bold">1.</span>
                <span>Check your internet connection and DNS settings.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 font-bold">2.</span>
                <span>Wait 30 seconds and click <strong>Retry Connection</strong> below.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400 font-bold">3.</span>
                <span>If the issue persists, contact the <strong>GP Service Support</strong> Discord.</span>
              </li>
            </ul>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="mt-8 flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      )
    }

    // Maintenance Gate: Only allow Super Admins into the /admin namespace
    const isAdminPath = path.startsWith('#/admin')
    if (isMaintenance && !isAdminPath) {
       return <MaintenanceView />
    }

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

    // 3. Super Admin Portal - Super-Admin Only
    if (isAdminPath) {
      if (globalRole !== 'super_admin' && localStorage.getItem('ledger_globalRole') !== 'super_admin') return <DashboardPage view={view} setView={setView} />
      
      const renderAdmin = () => {
        if (path === '#/admin/dashboard') return <AdminDashboard />
        if (path === '#/admin/config') return <AdminConfig />
        if (path === '#/admin/registry') return <AdminData />
        if (path === '#/admin/users') return <AdminUsers />
        if (path === '#/admin/households') return <AdminHouseholds />
        if (path === '#/admin/search') return <AdminSearch />
        if (path === '#/admin/audit') return <AdminAudit />
        if (path === '#/admin/providers') return <AdminProviders />
        if (path === '#/admin/processors') return <AdminProcessors />
        if (path === '#/admin/broadcast') return <AdminBroadcast />
        if (path === '#/admin/guide') return <AdminGuide />
        return <AdminDashboard />
      }

      return (
        <PasskeyChallenge onSuccess={() => {}} appName="LEDGER Secure Center">
          {renderAdmin()}
        </PasskeyChallenge>
      )
    }

    // 4. Authenticated Component Routes
    if (path === '#/settings') return <SettingsPage />
    if (path === '#/preferences') return <PreferencesPage />
    if (path === '#/reports') return <ReportsPage />
    if (path === '#/payments') return <PaymentCentralPage />
    if (path === '#/data') return <DataCenterPage />
    if (path === '#/loans') return <LoanManagerPage />
    if (path === '#/investments') return <InvestmentPortfolioPage />
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

  if (isLoadingConfig && isMaintenance) return <MaintenanceView />;

  return (
    <GlobalLayout>
      <IdentityHead 
        appName="Ledger" 
        appDescription="Secure financial privacy & data ownership and multi-household budget management." 
        appLogo={logo} 
      />
      <Suspense fallback={null}>
        <div className="relative animate-in fade-in duration-500">
          {renderView()}
        </div>
      </Suspense>
      <Toaster position="bottom-right" />
      
      {/* Synchronization Telemetry (Fleet Stable Rule) */}
      <AnimatePresence>
        {retryAttempt > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-6 z-[100] flex items-center gap-3 px-4 py-2 bg-blue-600 rounded-full shadow-lg border border-blue-400/30"
          >
            <div className="flex h-4 w-4 shrink-0 items-center justify-center">
              <div className="h-full w-full animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-widest leading-none">
              Checking System Status (Attempt {retryAttempt}/3)
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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
