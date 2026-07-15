import React from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  Cpu, 
  Cloud, 
  ArrowRight, 
  Activity,
  Zap,
  Layers,
  Terminal,
  Server,
  Fingerprint,
  Wallet,
  Users,
  Layout,
  FileCode,
  HardDrive
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useReducedMotion } from '../hooks/useReducedMotion'

const GithubIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LandingPage: React.FC = () => {
  const { theme } = useTheme()
  const reduced = useReducedMotion()

  const mainFeatures = [
    {
      title: 'Smart Expense Insights',
      description: 'See where your money goes with automatic categorization and simple forecasts of your future bills and spending.',
      icon: <Cpu className="text-primary" size={32} />,
    },
    {
      title: 'Your Own Cloud Sync',
      description: 'Keep your data synced across your devices using your personal Google Drive, Dropbox, or Microsoft OneDrive account.',
      icon: <Cloud className="text-secondary" size={32} />,
    },
    {
      title: 'Complete Privacy',
      description: 'Every transaction is encrypted directly on your device. Your financial logs are locked so only you can see them.',
      icon: <Shield className="text-emerald-500" size={32} />,
    },
    {
      title: 'Fully Offline Option',
      description: 'No internet? No problem. Run the application locally on your own computer to keep your financial life 100% private.',
      icon: <Terminal className="text-blue-500" size={32} />,
    }
  ]

  const exhaustiveFeatures = [
    { name: 'Future Forecasts', icon: <Activity className="text-primary" />, desc: 'Simple cash-flow projections' },
    { name: 'Secure Sign-In', icon: <Fingerprint className="text-secondary" />, desc: 'Log in safely with your fingerprint' },
    { name: 'Family Budgets', icon: <Users className="text-emerald-500" />, desc: 'Manage shared household expenses' },
    { name: 'Works Offline', icon: <Zap className="text-amber-500" />, desc: 'Access your budget without internet' },
    { name: 'Beautiful Design', icon: <Layout className="text-purple-500" />, desc: 'Customize with your favorite colors' },
    { name: 'Any Currency', icon: <Wallet className="text-pink-500" />, desc: 'Track your money in any currency' },
    { name: 'Local Install', icon: <Server className="text-blue-400" />, desc: 'Run locally on your own machine' },
    { name: 'Change History', icon: <Layers className="text-slate-400" />, desc: 'Trace changes to your transactions' },
    { name: 'Cloud Backup', icon: <HardDrive className="text-cyan-400" />, desc: 'Backup to Google Drive, Dropbox, OneDrive' },
    { name: 'Secure Vault', icon: <Shield className="text-blue-400" />, desc: 'Securely store credentials' },
    { name: 'Fast Load Times', icon: <Cloud className="text-orange-400" />, desc: 'Lightweight app that opens instantly' },
    { name: 'Social Login', icon: <FileCode className="text-indigo-400" />, desc: 'Optional sign-in with your online account' }
  ]

  const integrations = [
    { name: 'Google Drive', logo: 'https://cdn.simpleicons.org/googledrive/white' },
    { name: 'Dropbox', logo: 'https://cdn.simpleicons.org/dropbox/white' },
    { name: 'OneDrive', logo: 'https://flaticons.net/icon.php?slug_category=brand-identity&slug_icon=onedrive&color=ffffff' },
    { name: '1Password', logo: 'https://cdn.simpleicons.org/1password/white' },
    { name: 'Cloudflare', logo: 'https://cdn.simpleicons.org/cloudflare/white' },
    { name: 'Docker', logo: 'https://cdn.simpleicons.org/docker/white' }
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-primary/30 font-inter pb-20">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={theme.logoUrl} alt="Logo" className="h-10 w-10" />
            <span className="text-xl font-black tracking-tighter italic">Ledger</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://github.com/GameProductions/ledger" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-2 text-sm font-bold tracking-widest text-slate-400 hover:text-white transition-colors">
              <GithubIcon size={16} /> GitHub
            </a>
            <a href="#/login" className="px-6 py-2.5 bg-primary rounded-xl font-black tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-all">
              Sign In
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-20">
           <div className="absolute top-20 left-10 w-[40rem] h-[40rem] bg-primary/30 rounded-full blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-20 right-10 w-[40rem] h-[40rem] bg-secondary/30 rounded-full blur-[120px] animate-pulse-slow"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {reduced ? (
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="text-xs font-black tracking-[0.2em] text-slate-300">Secure Personal Budgeting</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.85]">
                Your Money. Your Budget. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-secondary">Fully Private.</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto mb-12 leading-relaxed opacity-80">
                A simple, secure, and private tool to track your personal expenses, manage budgets, and plan your family finances—with no third-party companies owning your data.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a href="#/login" className="group px-12 py-5 bg-white text-black rounded-2xl font-black tracking-widest text-sm flex items-center gap-3 hover:scale-105 transition-all shadow-xl">
                  Enter Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="https://github.com/GameProductions/ledger" target="_blank" rel="noopener noreferrer" className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black tracking-widest text-sm hover:bg-white/10 transition-all flex items-center gap-3">
                  <GithubIcon size={18} /> Source Code
                </a>
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="text-xs font-black tracking-[0.2em] text-slate-300">Secure Personal Budgeting</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.85]">
                Your Money. Your Budget. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-secondary">Fully Private.</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto mb-12 leading-relaxed opacity-80">
                A simple, secure, and private tool to track your personal expenses, manage budgets, and plan your family finances—with no third-party companies owning your data.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a href="#/login" className="group px-12 py-5 bg-white text-black rounded-2xl font-black tracking-widest text-sm flex items-center gap-3 hover:scale-105 transition-all shadow-xl">
                  Enter Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <a href="https://github.com/GameProductions/ledger" target="_blank" rel="noopener noreferrer" className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black tracking-widest text-sm hover:bg-white/10 transition-all flex items-center gap-3">
                  <GithubIcon size={18} /> Source Code
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Main Features */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainFeatures.map((feature, idx) =>
            reduced ? (
              <div
                key={idx}
                className="p-8 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] hover:border-primary/20 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black tracking-tight mb-4 italic leading-none">{feature.title}</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed opacity-70">
                  {feature.description}
                </p>
              </div>
            ) : (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] hover:border-primary/20 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black tracking-tight mb-4 italic leading-none">{feature.title}</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed opacity-70">
                  {feature.description}
                </p>
              </motion.div>
            )
          )}
        </div>
      </section>

      {/* Integration Showcase (Google Drive/Dropbox/OneDrive) */}
      <section className="py-32 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 italic">Your Personal Cloud Connections</h2>
            <p className="text-xs font-black tracking-[0.3em] text-slate-500">Pick where your private data is stored</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center justify-items-center mb-32">
            {integrations.map((int, i) => (
              <div key={i} className="flex flex-col items-center gap-6 group">
                <div className="p-10 bg-[#0f172a]/50 rounded-[3rem] border border-white/5 group-hover:border-primary/40 transition-all group-hover:-translate-y-2 backdrop-blur-2xl">
                  <img 
                    src={int.logo} 
                    alt={int.name} 
                    className="h-16 w-16 object-contain"
                  />
                </div>
                <span className="text-xs font-black tracking-[0.4em] text-slate-500 group-hover:text-primary transition-colors">{int.name}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="p-10 bg-[#020617] rounded-[3rem] border border-white/5">
               <h4 className="text-xl font-black italic mb-4">Complete Data Ownership</h4>
               <p className="text-sm text-slate-400 font-medium leading-relaxed opacity-80">
                 We connect directly to your Google Drive, Dropbox, or OneDrive so your data never lives on our servers. Your budgets and transactions are encrypted and stored in your own personal cloud, giving you 100% control over your files.
               </p>
            </div>
            <div className="p-10 bg-[#020617] rounded-[3rem] border border-white/5 relative overflow-hidden group">
               <div className="relative z-10">
                 <h4 className="text-xl font-black italic mb-4">Run Offline locally</h4>
                 <p className="text-sm text-slate-400 font-medium leading-relaxed opacity-80 mb-6">
                   Prefer to keep your finances completely offline? You can run the entire app locally on your own computer. You don't need any complex infrastructure to get started.
                 </p>
                 <a href="https://github.com/GameProductions/ledger" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-primary hover:text-white transition-colors">
                   View Source Code <ArrowRight size={12} />
                 </a>
               </div>
               <Server className="absolute -bottom-6 -right-6 text-white/[0.03] w-32 h-32" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-4xl font-black tracking-tighter mb-4 italic">Simple & Powerful Features</h2>
          <p className="text-xs font-black tracking-[0.3em] text-slate-500">Everything you need to manage your personal finances</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {exhaustiveFeatures.map((f, i) => (
            <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center group hover:bg-white/[0.05] transition-all">
               <div className="mb-4 flex justify-center">{f.icon}</div>
               <div className="text-xs font-black tracking-widest mb-2">{f.name}</div>
               <div className="text-xs text-slate-500 font-bold leading-tight">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Pillars */}
      <section className="py-40 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div>
            <div className="text-xs font-black tracking-[0.5em] text-primary mb-8">Built with Privacy First</div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-12 italic leading-[0.9]">Safe. <br/> Private. <br/> Yours.</h2>
            <p className="text-slate-400 font-medium mb-12 leading-relaxed opacity-80">
              LEDGER uses secure, device-level encryption to safeguard all your budget files. Your transactions, account balances, and personal details remain entirely private.
            </p>
            <div className="flex gap-10">
               <div>
                  <div className="text-3xl font-black italic mb-1">Secure</div>
                  <div className="text-xs font-black tracking-widest text-slate-500">Encryption</div>
               </div>
               <div>
                  <div className="text-3xl font-black italic mb-1">0%</div>
                  <div className="text-xs font-black tracking-widest text-slate-500">Third-party Servers</div>
               </div>
               <div>
                  <div className="text-3xl font-black italic mb-1">100%</div>
                  <div className="text-xs font-black tracking-widest text-slate-500">Private Data</div>
               </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-[5rem] border border-white/10 p-1 relative overflow-hidden">
             <div className="aspect-square bg-[#020617] rounded-[4.9rem] flex items-center justify-center">
                <div className="text-center p-12">
                   <Fingerprint size={80} className="text-primary mx-auto mb-8 animate-pulse" />
                   <h3 className="text-2xl font-black italic mb-4">Secure Sign-In</h3>
                   <p className="text-xs text-slate-500 font-bold tracking-widest">Biometric Login Ready</p>
                </div>
             </div>
          </div>
        </div>
      </section>


    </div>
  )
}

export default LandingPage
