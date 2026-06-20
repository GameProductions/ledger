import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface MaskedProps {
  children: React.ReactNode;
  forceShow?: boolean;
}

/**
 * Masked Component
 * High-fidelity privacy masking for sensitive data.
 * Applies a CSS blur filter when privacyMode is active.
 */
export const Masked: React.FC<MaskedProps> = ({ children, forceShow = false }) => {
  const { privacyMode } = useAuth();
  const shouldMask = privacyMode && !forceShow;
  const reduced = useReducedMotion();

  return (
    <div className="relative inline-block group/masked">
      {reduced ? (
        <div className={shouldMask ? 'select-none pointer-events-none' : ''}>
          {shouldMask ? (
            <span className="font-mono tracking-widest text-emerald-500/80">••••••</span>
          ) : (
            children
          )}
        </div>
      ) : (
        <motion.div
          animate={{ filter: shouldMask ? 'blur(2px)' : 'blur(0px)' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={shouldMask ? 'select-none pointer-events-none' : ''}
        >
          {shouldMask ? (
            <span className="font-mono tracking-widest text-emerald-500/80">••••••</span>
          ) : (
            children
          )}
        </motion.div>
      )}

      {shouldMask && (
        reduced ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 shadow-xl border border-white/10 rounded-full p-1.5 backdrop-blur-md">
              <EyeOff size={12} className="text-emerald-500" />
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/60 shadow-xl border border-white/10 rounded-full p-1.5 backdrop-blur-md">
              <EyeOff size={12} className="text-emerald-500" />
            </div>
          </motion.div>
        )
      )}
    </div>
  );
};
