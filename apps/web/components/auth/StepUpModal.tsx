import React, { useState } from 'react';
import { Shield, Fingerprint, X, Loader2, AlertCircle } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { getApiUrl } from '../../utils/api';

interface StepUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export const StepUpModal: React.FC<StepUpModalProps> = ({ isOpen, onClose, onSuccess, token }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStepUp = async () => {
    setLoading(true);
    setError(null);
    const API_URL = getApiUrl();

    try {
      // 1. Get Authentication Options
      const optionsRes = await fetch(`${API_URL}/api/auth/passkeys/login-options`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const optionsEnvelope = await optionsRes.json();
      
      if (!optionsEnvelope.success) throw new Error(optionsEnvelope.error || 'Failed to get auth options');

      // 2. Start WebAuthn Authentication
      const assertion = await startAuthentication(optionsEnvelope.data);

      // 3. Verify Assertion
      const verifyRes = await fetch(`${API_URL}/api/auth/passkeys/step-up-verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assertion })
      });

      const verifyEnvelope = await verifyRes.json();
      if (verifyEnvelope.success) {
        onSuccess();
      } else {
        throw new Error(verifyEnvelope.error || 'Step-up verification failed');
      }
    } catch (err: any) {
      console.error('[StepUp] Error:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 space-y-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center">
            <Shield className="text-primary w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">Identity Verification</h2>
            <p className="text-slate-400 font-medium">
              You are attempting to access <span className="text-primary font-bold">God Mode</span>. 
              Please verify your identity using your hardware passkey.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm text-left">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleStepUp}
            disabled={loading}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-primary hover:text-white transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Fingerprint size={20} />
                Verify Identity
              </>
            )}
          </button>

          <button 
            onClick={onClose}
            className="text-slate-500 text-xs font-black uppercase tracking-widest hover:text-white transition-colors"
          >
            Cancel and Return
          </button>
        </div>
        
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
      </div>
    </div>
  );
};
