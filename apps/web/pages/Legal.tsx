/** @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Eye, ShieldCheck, Heart, ArrowLeft, Terminal, Globe, Scale, Cookie, Sliders } from 'lucide-react';
import { GlassFooter } from '../components/ui/GlassFooter';

export const Legal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('privacy');

  useEffect(() => {
    document.title = 'Trust Center & Legal | Ledger';
    const path = window.location.pathname;
    if (path.includes('terms')) setActiveTab('terms');
    else if (path.includes('security')) setActiveTab('security');
    else if (path.includes('safety')) setActiveTab('safety');
    else if (path.includes('cookie')) setActiveTab('cookies');
    else setActiveTab('privacy');
  }, []);

  const tabs = [
    { id: 'privacy', label: 'Privacy Policy', icon: Eye },
    { id: 'terms', label: 'Terms of Service', icon: Scale },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'safety', label: 'Safety & Trust', icon: Heart },
    { id: 'cookies', label: 'Cookie Policy', icon: Cookie },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      
      {/* Cinematic Background Field */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-cyan-500/5 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-emerald-600/5 blur-[160px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center space-x-2 text-slate-500 hover:text-cyan-400 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Back to Ledger</span>
            </button>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
              Trust Center
            </h1>
            <p className="text-slate-500 font-medium tracking-tight">How we protect you and your financial information across the GameProductions network.</p>
          </div>

          <div className="flex flex-wrap bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-1 rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.history.pushState({}, '', `/legal/${tab.id}`);
                }}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label === 'Security Protocol' ? 'Security' : tab.label === 'Safety & Trust' ? 'Safety' : tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 rounded-[3rem] p-8 md:p-16 shadow-2xl"
          >
            {activeTab === 'privacy' && (
              <div className="space-y-12">
                <header className="space-y-4">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                    <Eye className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Privacy Policy</h2>
                  <p className="text-slate-400 font-medium">Last Updated: August 21, 2026</p>
                </header>

                <div className="prose prose-invert max-w-none space-y-8 text-slate-400 font-medium leading-relaxed">
                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">1. You Own Your Financial Data</h3>
                    <p>
                      At GameProductions, we believe your financial history and household bookkeeping belong exclusively to you. Ledger is built on zero-knowledge encryption principles to ensure financial logs, expense categories, loan amortizations, and balance figures remain private. We never sell, monetize, or disclose your financial records to third parties.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">2. Passkey Sign-in & Device Biometrics</h3>
                    <p>
                      We support FIDO2 / WebAuthn passkeys so you can authenticate securely via Touch ID, Face ID, Windows Hello, or hardware security keys (YubiKey). <strong>We never see, transmit, or store biometric markers.</strong> Verification happens strictly on your physical device with cryptographic token confirmation sent to our edge workers.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">3. Household Segregation & Zero-Trust Access</h3>
                    <p>
                      Ledger strictly isolates records using database-level household memberships and cryptographically signed session tokens. Shared budgets and expense allocations are accessible solely by authorized members within that specific household container.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">4. Backup Integrity & Local Offloading</h3>
                    <p>
                      Encrypted database backups and CSV/Excel exports can be saved to your local machine or synced via personal cloud storage providers. All keys generated for backup protection are encrypted at the browser level.
                    </p>
                  </section>

                  <div className="p-8 bg-slate-950 rounded-[2rem] border border-white/5 flex items-start space-x-6">
                    <Scale className="w-6 h-6 text-cyan-400 shrink-0 mt-1" />
                    <div className="space-y-2">
                      <h4 className="text-white font-black uppercase tracking-widest text-[10px]">Data Retention & Purge Guarantee</h4>
                      <p className="text-xs">
                        When you delete a household or terminate an account, data enters a soft 14-day recovery buffer before being permanently scrubbed from Neon Postgres and all edge replica caches.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-12">
                <header className="space-y-4">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                    <Scale className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Terms of Service</h2>
                  <p className="text-slate-400 font-medium">Last Updated: August 21, 2026</p>
                </header>

                <div className="prose prose-invert max-w-none space-y-8 text-slate-400 font-medium leading-relaxed">
                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">1. Agreement to Terms</h3>
                    <p>
                      By accessing or using Ledger and related GameProductions financial management APIs, you agree to comply with these Terms of Service and applicable privacy disclosures.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">2. Responsible Financial Management</h3>
                    <p>
                      Ledger is designed for personal, household, and organizational budgeting and expense analysis. It does not provide certified tax, legal, or investment advice. Users remain responsible for the accuracy of their entries.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">3. Security & Account Safeguards</h3>
                    <p>
                      You are responsible for maintaining the confidentiality of your session passkeys, backup keys, and household invitation codes. Any activity occurring under your authenticated credentials is your responsibility.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">4. System Availability & Edge Operations</h3>
                    <p>
                      Ledger operates globally across Cloudflare Workers and Neon serverless databases. Scheduled maintenance is broadcasted with live health polling and fallback offline mode capabilities.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-12">
                <header className="space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Security & Zero-Trust Architecture</h2>
                  <p className="text-slate-400 font-medium">Zero-Trust Fleet Shield & Distributed Database Safeguards</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[
                    { icon: Lock, title: 'Zero-Trust Authentication', text: 'Every API mutation validates cryptographic tokens, passkey step-up signatures, and household role boundaries.' },
                    { icon: Terminal, title: 'Forensic Audit Trails', text: 'Administrative and financial mutations dispatch tamper-resistant audit logs with strict PII masking.' },
                    { icon: Globe, title: 'End-to-End Encryption', text: 'Data in transit is protected via TLS 1.3 with strict CSP nonces, HSTS, and 1Password-vaulted infrastructure secrets.' },
                    { icon: Shield, title: 'Automated Shielding', text: 'Probe shielding and multi-tiered rate limiting automatically drop unauthorized vulnerability scanners at the network edge.' }
                  ].map((item, i) => (
                    <div key={i} className="p-8 bg-slate-950 rounded-3xl border border-white/5 space-y-4 hover:border-emerald-500/20 transition-colors">
                       <item.icon className="w-6 h-6 text-emerald-400" />
                       <h3 className="text-white font-black uppercase tracking-widest text-[10px]">{item.title}</h3>
                       <p className="text-slate-500 text-sm font-medium leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem]">
                  <p className="text-sm text-emerald-400/80 font-medium leading-relaxed italic">
                    "Financial tracking demands absolute privacy and cryptographic security. Ledger is built from the ground up to keep your financial life secure."
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'safety' && (
              <div className="space-y-12">
                <header className="space-y-4">
                  <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                    <Heart className="w-6 h-6 text-rose-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Safety & Trust</h2>
                  <p className="text-slate-400 font-medium">Protecting Households and Shared Finances</p>
                </header>

                <div className="prose prose-invert max-w-none space-y-12 text-slate-400 font-medium leading-relaxed">
                  <section className="space-y-6">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">Household Integrity</h3>
                    <p>
                      Ledger is designed for collaborative budgeting. To ensure transparency:
                    </p>
                    <ul className="list-disc list-inside space-y-3">
                      <li>Only designated household owners and managers can add or remove members.</li>
                      <li>Transaction modifications leave immutable audit logs visible to household administrators.</li>
                      <li>Impersonation mode requires high-privilege administrative audit reasons and emits alert logs.</li>
                    </ul>
                  </section>

                  <section className="space-y-6">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">Reporting & Support</h3>
                    <p>
                      If you notice any unexpected access or need security assistance, visit our Support Portal or reach out to the GameProductions security team directly.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'cookies' && (
              <div className="space-y-12">
                <header className="space-y-4">
                  <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                    <Cookie className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Cookie Policy & Consent Management</h2>
                  <p className="text-slate-400 font-medium">Clear breakdown of browser cookies and granular opt-in / opt-out controls.</p>
                </header>

                <div className="prose prose-invert max-w-none space-y-8 text-slate-400 font-medium leading-relaxed">
                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">1. How Ledger Uses Cookies & Storage</h3>
                    <p>
                      Cookies and local storage in Ledger are strictly functional. They store encrypted session tokens, household identifiers, and user interface preferences (such as selected color themes and reduced motion toggles).
                    </p>
                  </section>

                  {/* Cookie Breakdown Table */}
                  <div className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">2. Classification of Cookies</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 not-prose">
                      <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Strictly Essential</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Required</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Includes <code>ledger_token</code> and CSRF protections. Vital for authenticating API requests and verifying household permissions.
                        </p>
                      </div>

                      <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Functional</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Opt-In / Out</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Includes <code>ledger_householdId</code> and theme selectors to persist your chosen workspace and UI appearance.
                        </p>
                      </div>

                      <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Telemetry</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Opt-In / Out</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Anonymized performance diagnostics ensuring database latency and edge compute remain responsive.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Opt-In / Opt-Out Interactive Control Box */}
                  <div className="p-8 bg-slate-950/80 rounded-[2rem] border border-cyan-500/30 space-y-6 not-prose">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-cyan-400" />
                          Granular Opt-In / Opt-Out Controls
                        </h4>
                        <p className="text-xs text-slate-400">
                          You can customize your non-essential cookie and tracking settings at any time.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('gp-open-cookie-preferences'))}
                        className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 active:scale-95 shrink-0 cursor-pointer"
                      >
                        Open Preferences Manager
                      </button>
                    </div>
                  </div>

                  <section className="space-y-4">
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">3. No Advertising Trackers</h3>
                    <p>
                      Ledger has <strong>zero third-party advertising cookies or cross-site tracking pixels</strong>. Your browsing and financial activity are never shared across ad networks.
                    </p>
                  </section>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-24">
          <GlassFooter />
        </div>
      </div>
    </div>
  );
};
