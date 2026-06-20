import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X, CheckCircle, Trophy } from 'lucide-react'
import { useOnboarding } from '../context/OnboardingContext'
import { useReducedMotion } from '../hooks/useReducedMotion'

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to LEDGER v6.1',
    content: 'The Fleet Security Security update is here. We’ve overhauled our core architecture to ensure your financial data is more secure than ever.',
    target: null
  },
  {
    id: 'security',
    title: 'Fleet Security Security',
    content: 'Legacy TOTP (Authenticator Apps) has been decommissioned. Enroll your biometric Passkeys (TouchID/FaceID) for a passwordless, highly secure experience. If biometrics are unavailable, use your 8-character recovery codes.',
    target: '#user-profile-button'
  },
  {
    id: 'vault',
    title: 'Identity Vault',
    content: 'Your PII and sensitive data are now stored in an encrypted hardware-backed vault. Initialize your vault to enable advanced security features.',
    target: '#vault-init-button'
  },
  {
    id: 'dashboard',
    title: 'Consolidated Command Center',
    content: 'Manage your entire financial fleet from one place. Overview, Activity, and Planning have been unified for a seamless experience.',
    target: '#dashboard-tabs'
  },
  {
    id: 'accounts',
    title: 'Smart Synchronization',
    content: 'Connect your banks or crypto wallets. Our new matching engine automatically categorizes transactions with 99% accuracy.',
    target: '#add-account-button'
  }
]

export const GuidedTour: React.FC = () => {
  const { activeStep, completeStep, skipTour, updates, currentVersion } = useOnboarding()
  const reduced = useReducedMotion()
  const [currentIdx, setCurrentIdx] = useState(0)

  useEffect(() => {
    const idx = steps.findIndex(s => s.id === activeStep)
    if (idx !== -1) setCurrentIdx(idx)
  }, [activeStep])

  if (!activeStep) return null

  const step = steps[currentIdx]
  const isLast = currentIdx === steps.length - 1
  const isWelcome = step.id === 'welcome'

  const handleNext = () => {
    if (isLast) {
      completeStep(step.id, true, currentVersion)
    } else {
      completeStep(step.id)
      setCurrentIdx(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentIdx > 0) setCurrentIdx(prev => prev - 1)
  }

  const content = (
    <>
      <div
        className="fixed inset-0 z-modal flex items-center justify-center bg-overlay backdrop-blur p-4"
        onClick={skipTour}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="card max-w-md w-full relative overflow-hidden"
          style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--primary)' }}
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
            <div
              className="h-full bg-primary"
              style={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }}
            />
          </div>

          <button 
            onClick={skipTour}
            className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
            style={{ background: 'none', border: 'none' }}
          >
            <X size={20} />
          </button>

          <div className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-20 flex items-center justify-center text-primary">
                {isWelcome ? <Trophy size={24} /> : <CheckCircle size={24} />}
              </div>
              <h2 className="text-xl font-bold">{isWelcome && updates.length > 0 ? "What's New" : step.title}</h2>
            </div>

            <p className="text-secondary mb-4 leading-relaxed">
              {step.content}
            </p>

            {isWelcome && updates.length > 0 && (
              <div className="mb-6 flex flex-col gap-3 bg-white/5 p-4 rounded-lg border border-white/10 max-h-[300px] overflow-y-auto custom-scrollbar">
                {updates.map(u => (
                  <div key={u.version} className="mb-2 last:mb-0">
                    <div className="text-sm font-bold text-primary mb-1">{u.title} ({u.version})</div>
                    <div className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">{u.description}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={handleBack}
                  disabled={currentIdx === 0}
                  className="p-2 rounded-full hover:bg-white/5 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={handleNext}
                  className="p-2 rounded-full bg-primary text-white hover:brightness-110 transition-all flex items-center justify-center"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <span className="text-sm text-secondary font-mono">
                STEP {currentIdx + 1} / {steps.length}
              </span>
            </div>
          </div>
        </div>

        {/* Highlight Target Logic would go here if needed, or simply pointing */}
      </div>
    </>
  )

  if (reduced) return content

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-modal flex items-center justify-center bg-overlay backdrop-blur p-4"
        onClick={skipTour}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="card max-w-md w-full relative overflow-hidden"
          style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--primary)' }}
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: '0%' }}
              animate={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }}
            />
          </div>

          <button 
            onClick={skipTour}
            className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
            style={{ background: 'none', border: 'none' }}
          >
            <X size={20} />
          </button>

          <div className="pt-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary-20 flex items-center justify-center text-primary">
                {isWelcome ? <Trophy size={24} /> : <CheckCircle size={24} />}
              </div>
              <h2 className="text-xl font-bold">{isWelcome && updates.length > 0 ? "What's New" : step.title}</h2>
            </div>

            <p className="text-secondary mb-4 leading-relaxed">
              {step.content}
            </p>

            {isWelcome && updates.length > 0 && (
              <div className="mb-6 flex flex-col gap-3 bg-white/5 p-4 rounded-lg border border-white/10 max-h-[300px] overflow-y-auto custom-scrollbar">
                {updates.map(u => (
                  <div key={u.version} className="mb-2 last:mb-0">
                    <div className="text-sm font-bold text-primary mb-1">{u.title} ({u.version})</div>
                    <div className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">{u.description}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={handleBack}
                  disabled={currentIdx === 0}
                  className="p-2 rounded-full hover:bg-white/5 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={handleNext}
                  className="p-2 rounded-full bg-primary text-white hover:brightness-110 transition-all flex items-center justify-center"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              <span className="text-sm text-secondary font-mono">
                STEP {currentIdx + 1} / {steps.length}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Highlight Target Logic would go here if needed, or simply pointing */}
      </motion.div>
    </AnimatePresence>
  )
}
