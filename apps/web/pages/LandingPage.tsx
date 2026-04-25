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

const GithubIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LandingPage: React.FC = () => {
  const { theme } = useTheme()

  const mainFeatures = [
    {
      title: 'AI Liquidity Intelligence',
      description: 'Predictive forecasting and intelligent categorization powered by localized AI analysis of spending patterns.',
      icon: <Cpu className="text-primary" size={32} />,
    },
    {
      title: 'Multi-Cloud Redundancy',
      description: 'Encrypted state synchronization across Google Drive, Dropbox, and Microsoft OneDrive for total Data Ownership.',
      icon: <Cloud className="text-secondary" size={32} />,
    },
    {
      title: 'Security Audit Logs',
      description: 'Every state change is cryptographically logged and auditable, ensuring immutable financial integrity.',
      icon: <Shield className="text-emerald-500" size={32} />,
    },
    {
      title: 'Self-Hosted Freedom',
      description: 'Deploy on your own infrastructure with our official Docker and Docker-Compose distributions.',
      icon: <Terminal className="text-blue-500" size={32} />,
    }
  ]

  const exhaustiveFeatures = [
    { name: 'AI Forecasts', icon: <Activity className="text-primary" />, desc: 'Predictive cash-flow modeling' },
    { name: 'Biometric Check', icon: <Fingerprint className="text-secondary" />, desc: 'Passwordless FIDO2 security' },
    { name: 'Multi-Household', icon: <Users className="text-emerald-500" />, desc: 'Secure family member isolation' },
    { name: 'PWA Offline', icon: <Zap className="text-amber-500" />, desc: 'Native app feel on every device' },
    { name: 'Luxury UI', icon: <Layout className="text-purple-500" />, desc: 'Professional custom skin engine' },
    { name: 'Multi-Currency', icon: <Wallet className="text-pink-500" />, desc: 'Global financial tracking' },
    { name: 'Docker Ready', icon: <Server className="text-blue-400" />, desc: 'Official containerized builds' },
    { name: 'Audit Timelines', icon: <Layers className="text-slate-400" />, desc: 'Historical integrity tracking' },
    { name: 'Cloud Sync', icon: <HardDrive className="text-cyan-400" />, desc: 'Google Drive, Dropbox, OneDrive' },
    { name: 'Discord Identity', icon: <FileCode className="text-indigo-400" />, desc: 'Integrated identity service' }
  ]

  const integrations = [
    { name: 'Google Drive', logo: 'https://cdn.simpleicons.org/googledrive/white' },
    { name: 'Dropbox', logo: 'https://cdn.simpleicons.org/dropbox/white' },
    { name: 'OneDrive', logo: 'https://flaticons.net/icon.php?slug_category=brand-identity&slug_icon=onedrive&color=ffffff' },
    { name: 'Docker', logo: 'https://cdn.simpleicons.org/docker/white' }
  ]

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-primary/30 font-inter pb-20">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={theme.logoUrl} alt="Logo" className="h-10 w-10" />
            <span className="text-xl font-black tracking-tighter italic uppercase">LEDGER</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="https://github.com/GameProductions/ledger" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
              <GithubIcon size={16} /> GitHub
            </a>
            <a href="#/login" className="px-6 py-2.5 bg-primary rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-all">
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
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Open Secure Service</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.85]">
              Financial Data Ownership. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-secondary">Decoupled.</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto mb-12 leading-relaxed opacity-80">
              A high-integrity security ledger built for total data ownership, AI forecasting, and multi-cloud redundancy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a href="#/login" className="group px-12 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 hover:scale-105 transition-all shadow-xl">
                Enter Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="https://github.com/GameProductions/ledger" target="_blank" rel="noopener noreferrer" className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-all flex items-center gap-3">
                <GithubIcon size={18} /> Source Code
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainFeatures.map((feature, idx) => (
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
              <h3 className="text-lg font-black uppercase tracking-tight mb-4 italic leading-none">{feature.title}</h3>
              <p className="text-sm text-slate-400 font-bold leading-relaxed opacity-70">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Integration Showcase (Google Drive/Dropbox/OneDrive) */}
      <section className="py-32 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 italic uppercase">Identity & Backup Connection</h2>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Trusted services for secure status check</p>
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
                <span className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 group-hover:text-primary transition-colors">{int.name}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="p-10 bg-[#020617] rounded-[3rem] border border-white/5">
               <h4 className="text-xl font-black italic uppercase mb-4">Privacy & Data Ownership</h4>
               <p className="text-sm text-slate-400 font-medium leading-relaxed opacity-80">
                 We connect to your Google Drive, Dropbox, and OneDrive to ensure your data never lives on our servers. Your financial snapshots are encrypted and synced directly to your personal cloud, giving you 100% ownership and portability.
               </p>
            </div>
            <div className="p-10 bg-[#020617] rounded-[3rem] border border-white/5 relative overflow-hidden group">
               <div className="relative z-10">
                 <h4 className="text-xl font-black italic uppercase mb-4">Docker Self-Hosting</h4>
                 <p className="text-sm text-slate-400 font-medium leading-relaxed opacity-80 mb-6">
                   Run the entire LEDGER ecosystem on your own hardware. Available as containerized distributions on Docker Hub for total control over your financial stack.
                 </p>
                 <a href="https://hub.docker.com/r/morenicano/ledger" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">
                   View Docker Hub <ArrowRight size={12} />
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
          <h2 className="text-4xl font-black tracking-tighter mb-4 italic uppercase">Status</h2>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Complete feature audit of the service engine</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {exhaustiveFeatures.map((f, i) => (
            <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center group hover:bg-white/[0.05] transition-all">
               <div className="mb-4 flex justify-center">{f.icon}</div>
               <div className="text-xs font-black uppercase tracking-widest mb-2">{f.name}</div>
               <div className="text-xs text-slate-500 font-bold leading-tight">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Pillars */}
      <section className="py-40 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.5em] text-primary mb-8">Hardened Security Design</div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-12 italic leading-[0.9]">Encrypted. <br/> Resilient. <br/> Private.</h2>
            <p className="text-slate-400 font-medium mb-12 leading-relaxed opacity-80">
              LEDGER utilizes military-grade AES-256-GCM encryption for all client-side state. Your session is protected by FIDO2/WebAuthn biometrics and secure OAuth isolation.
            </p>
            <div className="flex gap-10">
               <div>
                  <div className="text-3xl font-black italic mb-1">256</div>
                  <div className="text-xs uppercase font-black tracking-widest text-slate-500">AES Bit-Depth</div>
               </div>
               <div>
                  <div className="text-3xl font-black italic mb-1">0%</div>
                  <div className="text-xs uppercase font-black tracking-widest text-slate-500">Centralized Storage</div>
               </div>
               <div>
                  <div className="text-3xl font-black italic mb-1">100%</div>
                  <div className="text-xs uppercase font-black tracking-widest text-slate-500">Self-Hostable</div>
               </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-[5rem] border border-white/10 p-1 relative overflow-hidden">
             <div className="aspect-square bg-[#020617] rounded-[4.9rem] flex items-center justify-center">
                <div className="text-center p-12">
                   <Fingerprint size={80} className="text-primary mx-auto mb-8 animate-pulse" />
                   <h3 className="text-2xl font-black uppercase italic mb-4">Biometric Identity</h3>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Biometric Identity Protocol</p>
                </div>
             </div>
          </div>
        </div>
      </section>


    </div>
  )
}

export default LandingPage
