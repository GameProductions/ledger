import React, { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, Loader2, ShieldAlert } from 'lucide-react';

interface PasskeyChallengeProps {
  onSuccess: () => void;
  appName?: string;
  children?: React.ReactNode;
}

export function PasskeyChallenge({ onSuccess, appName, children }: PasskeyChallengeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'auth' | 'register'>('auth');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!verified) {
      initiateChallenge();
    }
  }, [mode]);

  const initiateChallenge = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'auth') {
        const resp = await fetch('/api/admin/webauthn/generate-auth', { method: 'POST' });
        if (resp.status === 404) {
          // No passkeys registered, switch to registration mode if authorized
          setMode('register');
          return;
        }
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({ error: `Server error ${resp.status}` }));
          throw new Error((data as any).error || 'Failed to generate auth challenge');
        }
        const options = await resp.json() as any;
        const asseResp = await startAuthentication({ optionsJSON: options });
        
        const verificationResp = await fetch('/api/admin/webauthn/verify-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(asseResp),
        });
        
        if (verificationResp.ok) {
          setVerified(true);
          onSuccess();
        } else {
          const data = await verificationResp.json().catch(() => ({ error: 'Verification failed' }));
          setError((data as any).error || 'Verification failed');
        }
      } else {
        const resp = await fetch('/api/admin/webauthn/generate-registration', { method: 'POST' });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({ error: `Server error ${resp.status}` }));
          throw new Error((data as any).error || 'Failed to generate registration challenge');
        }
        const options = await resp.json() as any;
        
        const attResp = await startRegistration({ optionsJSON: options });
        
        const verificationResp = await fetch('/api/admin/webauthn/verify-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attResp),
        });
        
        if (verificationResp.ok) {
          setVerified(true);
          onSuccess();
        } else {
          const data = await verificationResp.json().catch(() => ({ error: 'Registration failed' }));
          setError((data as any).error || 'Registration failed');
        }
      }
    } catch (err: any) {
      console.error('[PasskeyChallenge]', err);
      setError(err.message || 'Cryptographic challenge failed or cancelled');
    } finally {
      setLoading(false);
    }
  };

  if (verified && children) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6 ring-4 ring-white dark:ring-zinc-900 border border-indigo-200 dark:border-indigo-800/50">
            <Fingerprint className="w-8 h-8 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
          </div>
          
          <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2 font-display tracking-tight">
            Verification Required
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-[260px] leading-relaxed">
            {mode === 'auth' 
              ? `Verify your identity using a passkey to access ${appName || 'Super Admin Mode'}.` 
              : 'Enable secure access by registering your passkey.'}
          </p>

          {error && (
            <div className="w-full bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-3 flex items-start gap-3 mb-6 text-left">
              <ShieldAlert className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">Authentication Failed<br/><span className="text-xs opacity-80 break-words">{error}</span></p>
            </div>
          )}

          <button
            onClick={initiateChallenge}
            disabled={loading}
            className="w-full h-11 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 dark:focus:ring-white dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Verify with Passkey
                <Fingerprint className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </button>

          <button 
            type="button"
            onClick={() => window.history.back()}
            className="mt-4 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            Cancel and Return
          </button>
        </div>
      </div>
    </div>
  );
}
