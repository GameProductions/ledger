import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X, CheckCircle, Trophy } from 'lucide-react'
import { useOnboarding } from '../context/OnboardingContext'

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to LEDGER',
    content: 'Live Evaluation of Daily Gains & Expense Records. Let’s get you set up for financial success.',
    target: null
  },
  {
    id: 'security',
    title: 'Harden Your Security',
    content: 'Set up PBKDF2 password protection and 2FA to keep your financial life bulletproof.',
    target: '#user-profile-button'
  },
  {
    id: 'vault',
    title: 'Initialize Vault',
    content: 'Secure your PII with end-to-end encryption.',
    target: '#vault-init-button'
  },
  {
    id: 'accounts',
    title: 'Connect Accounts',
    content: 'Add your first bank or wallet.',
    target: '#add-account-button'
  },
  {
    id: 'budget',
    title: 'Set Your Budgets',
    content: 'Define monthly limits for categories like Dining, Groceries, and Entertainment.',
    target: '#budget-section'
  },
  {
    id: 'subscriptions',
    title: 'Audit Subscriptions',
    content: 'Add your recurring bills and subscriptions to see your future cash flow.',
    target: '#subscription-section'
  }
]

export const GuidedTour: React.FC = () => {
  const { activeStep, completeStep, skipTour, updates, currentVersion } = useOnboarding()
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-modal flex items-center justify-center bg-overlay backdrop-blur p-4"
      >
        <motion.div
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
              <div className="mb-6 flex flex-column gap-3 bg-white/5 p-4 rounded-lg border border-white/10">
                {updates.map(u => (
                  <div key={u.version}>
                    <div className="text-xs font-bold text-primary mb-1">{u.title} ({u.version})</div>
                    <div className="text-xs text-secondary">{u.description}</div>
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

              <span className="text-xs text-secondary font-mono">
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
