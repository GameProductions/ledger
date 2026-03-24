import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Trophy } from 'lucide-react'
import { useOnboarding } from '../context/OnboardingContext'

const checklistItems = [
  { id: 'welcome', label: 'Welcome Tour' },
  { id: 'security', label: 'Security Hardening' },
  { id: 'vault', label: 'Vault Initialization' },
  { id: 'accounts', label: 'Add First Account' }
]

export const OnboardingChecklist: React.FC = () => {
  const { completedSteps, isCompleted, startTour } = useOnboarding()

  if (isCompleted && completedSteps.length >= checklistItems.length) return null

  const progress = Math.round((completedSteps.length / checklistItems.length) * 100)

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Onboarding Progress</h3>
        <span className="text-xs font-mono text-primary">{progress}%</span>
      </div>

      <div className="space-y-3 mb-6">
        {checklistItems.map((item) => {
          const isDone = completedSteps.includes(item.id)
          return (
            <div key={item.id} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle size={18} className="text-primary" />
              ) : (
                <Circle size={18} className="text-text-secondary opacity-40" />
              )}
              <span className={`text-sm ${isDone ? 'text-text-secondary line-through' : 'text-text-main'}`}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>

      {progress === 100 ? (
        <div className="flex items-center gap-2 text-primary text-sm font-bold">
          <Trophy size={18} />
          <span>You're a LEDGER Pro!</span>
        </div>
      ) : (
        <button 
          onClick={startTour}
          className="text-xs text-primary hover:underline"
        >
          {completedSteps.length === 0 ? 'Start Guide' : 'Resume Guide'}
        </button>
      )}
    </motion.div>
  )
}
