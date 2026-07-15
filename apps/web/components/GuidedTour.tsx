import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, X, CheckCircle, Trophy } from 'lucide-react'
import { useOnboarding } from '../context/OnboardingContext'
import { useReducedMotion } from '../hooks/useReducedMotion'

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to LEDGER',
    content: 'Ledger is a private and secure tool designed to help you track personal expenses, manage budgets, and plan your financial future.',
    target: null
  },
  {
    id: 'dashboard',
    title: 'Your Command Center',
    content: 'Get a clear view of your financial health at a glance. Access your balance charts, monthly forecasts, and category budgets all in one place.',
    target: '#dashboard-tabs'
  },
  {
    id: 'calendar',
    title: 'Financial Calendar',
    content: 'Plan your bills and paydays visually. Tap on any date to log a new charge or paycheck, or review existing upcoming payments.',
    target: '#calendar-card'
  },
  {
    id: 'budgeting',
    title: 'Envelope Budgeting',
    content: 'Allocate your money to categories (like Groceries or Utilities). Track your spending envelopes in real-time to keep your budget balanced.',
    target: '#budget-categories-card'
  },
  {
    id: 'privacy',
    title: '100% Private & Yours',
    content: 'Your financial data is encrypted and synced directly to your personal Google Drive, Dropbox, or OneDrive. No third-party servers ever touch your files.',
    target: null
  }
]

export const GuidedTour: React.FC = () => {
  const { activeStep, completeStep, skipTour, updates, currentVersion } = useOnboarding()
  const reduced = useReducedMotion()
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showConfirmSkip, setShowConfirmSkip] = useState(false)

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
      localStorage.setItem(`ledger_show_tour_${currentVersion}`, 'false')
      completeStep(step.id, true, currentVersion)
    } else {
      completeStep(step.id)
      setCurrentIdx(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentIdx > 0) setCurrentIdx(prev => prev - 1)
  }

  const handleSkipClick = () => {
    setShowConfirmSkip(true)
  }

  const handleConfirmSkipShowAgain = () => {
    localStorage.setItem(`ledger_show_tour_${currentVersion}`, 'true')
    skipTour()
    setShowConfirmSkip(false)
  }

  const handleConfirmSkipNoMore = () => {
    localStorage.setItem(`ledger_show_tour_${currentVersion}`, 'false')
    skipTour()
    setShowConfirmSkip(false)
  }

  if (showConfirmSkip) {
    const confirmContent = (
      <div className="pt-4 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
          <Trophy size={28} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Guided Tour Preference</h2>
        <p className="text-secondary text-sm mb-6 leading-relaxed">
          Would you like to be prompted with the Guided Tour again on future visits? You can always access tours from the Help Center.
        </p>
        <div className="flex flex-col gap-2">
          <button 
            onClick={handleConfirmSkipShowAgain}
            className="w-full py-2.5 bg-primary text-black font-black tracking-widest text-xs rounded-xl hover:brightness-110 transition-all cursor-pointer"
          >
            Yes, prompt me next time
          </button>
          <button 
            onClick={handleConfirmSkipNoMore}
            className="w-full py-2.5 bg-white/10 text-white font-black tracking-widest text-xs rounded-xl hover:bg-white/20 transition-all border border-white/5 cursor-pointer"
          >
            No, don't show this tour again
          </button>
        </div>
      </div>
    );

    if (reduced) {
      return (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-overlay backdrop-blur p-4">
          <div className="card max-w-md w-full relative p-6" style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--primary)' }}>
            {confirmContent}
          </div>
        </div>
      );
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
            className="card max-w-md w-full relative p-6"
            style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--primary)' }}
          >
            {confirmContent}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const content = (
    <>
      <div
        className="fixed inset-0 z-modal flex items-center justify-center bg-overlay backdrop-blur p-4"
        onClick={handleSkipClick}
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
            onClick={handleSkipClick}
            className="absolute top-4 right-4 text-secondary hover:text-white transition-colors cursor-pointer"
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
        onClick={handleSkipClick}
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
            onClick={handleSkipClick}
            className="absolute top-4 right-4 text-secondary hover:text-white transition-colors cursor-pointer"
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
