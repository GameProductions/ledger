import React from 'react';
import PCCPortal from './PCCPortal';
import { BookOpen, Shield, Fingerprint, Lock, Activity, Zap, Info, AlertTriangle, Terminal, Key, RefreshCw } from 'lucide-react';

const PCCGuide: React.FC = () => {
  const sections = [
    {
      title: 'Biometric Governance',
      icon: Fingerprint,
      color: 'text-primary',
      content: 'Administrators possess high-level clearance to manage user biometric registries. This includes the ability to rename passkeys for organizational clarity and remove compromised or obsolete biometric nodes. Note: Passive biometric data remains encrypted; administrators can only manage the metadata and access states.'
    },
    {
      title: 'Forensic Credential Overrides',
      icon: Shield,
      color: 'text-emerald-500',
      content: 'In emergency lockout scenarios, the PCC allows for manual credential injection. You can establish a new password for any identity node and optionally set it as a "Temporary Credential," forcing the user to re-establish their security baseline upon their next session initialization.'
    },
    {
      title: 'Identity Synchronization',
      icon: RefreshCw,
      color: 'text-blue-500',
      content: 'Cross-platform identity sync allows users to propagate assets (Display Names, Avatars) from linked Google or Discord nodes. During unlinking protocols, the "Asset Persistence" flag determines if these synced attributes should be retained or reverted to system defaults.'
    },
    {
      title: 'Audit & Forensic Intelligence',
      icon: Activity,
      color: 'text-purple-500',
      content: 'Every action within the PCC and User Settings is recorded in the Forensic Trace. Use the "Directory Pulse" and "Audit Trail" modules to review high-fidelity history logs, providing full lineage auditing for security compliance and incident response.'
    }
  ];

  return (
    <PCCPortal activePath="#/system-pcc/guide">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">
            Forensic <span className="text-emerald-500">Codex</span>
          </h2>
          <p className="text-sm text-slate-500 uppercase tracking-[0.3em] font-bold">Universal Operational Directives v2.4.0</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {sections.map((section) => (
             <div key={section.title} className="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-6 group relative overflow-hidden">
                <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-opacity bg-current ${section.color}`} />
                <div className={`w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center ${section.color} border border-white/5 shadow-2xl`}>
                   <section.icon size={24} />
                </div>
                <div className="space-y-3">
                   <h3 className="text-xl font-black tracking-tight text-white uppercase italic">{section.title}</h3>
                   <p className="text-sm text-slate-400 leading-relaxed font-medium">
                      {section.content}
                   </p>
                </div>
             </div>
           ))}
        </div>

        <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-500/10 via-transparent to-emerald-500/10 border border-white/5 space-y-8 relative overflow-hidden">
            <div className="flex items-center gap-4 text-emerald-500">
               <Zap size={24} className="animate-pulse" />
               <h3 className="text-2xl font-black tracking-tighter uppercase italic">Emergency Protocols</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol 01</div>
                  <h4 className="text-sm font-bold text-white uppercase">System-Wide Lockout</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">In the event of a detected breach, use the "Global Maintenance Mode" in the Dashboard to sever all external API interfaces.</p>
               </div>
               <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol 02</div>
                  <h4 className="text-sm font-bold text-white uppercase">Identity Purge</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Permanently destroying an identity node removes all historical audit association. Use with extreme caution as this action is forensically irreversible.</p>
               </div>
            </div>
        </div>

        <div className="flex items-center justify-center py-12 gap-8 opacity-20 grayscale">
            <Shield size={48} />
            <Terminal size={48} />
            <Key size={48} />
            <Lock size={48} />
        </div>
      </div>
    </PCCPortal>
  );
};

export default PCCGuide;
