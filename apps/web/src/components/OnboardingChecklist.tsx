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
  const { completedSteps, isCompleted, startTour, skipTour } = useOnboarding()

  if (isCompleted && completedSteps.length >= checklistItems.length) return null

  const progress = Math.round((completedSteps.length / checklistItems.length) * 100)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-6 reveal"
      style={{ borderLeft: '4px solid var(--primary)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">Setup Progress</h3>
        </div>
        <div className="flex items-center gap-3">
          <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              style={{ height: '100%', background: 'var(--primary)' }}
            />
          </div>
          <span className="text-xs font-mono text-primary">{progress}%</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {checklistItems.map((item) => {
          const isDone = completedSteps.includes(item.id)
          return (
            <div 
              key={item.id} 
              className="flex items-center gap-3 p-2 rounded-lg transition-colors"
              style={{ background: isDone ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex-center" style={{ width: '24px', height: '24px' }}>
                {isDone ? (
                  <CheckCircle size={18} className="text-primary" />
                ) : (
                  <Circle size={18} className="text-secondary opacity-40" />
                )}
              </div>
              <span className={`text-sm ${isDone ? 'text-secondary line-through' : 'text-main'}`} style={{ opacity: isDone ? 0.6 : 1 }}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center">
        {progress === 100 ? (
          <div className="flex items-center gap-2 text-primary text-sm font-bold">
            <Trophy size={18} />
            <span>Deployment Successful: LEDGER Fully Operational</span>
          </div>
        ) : (
          <button 
            onClick={startTour}
            className="primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
          >
            {completedSteps.length === 0 ? 'Launch Guided Setup' : 'Continue Setup'}
          </button>
        )}
        <button 
          onClick={skipTour} 
          className="text-xs text-secondary hover:text-white transition-colors"
          style={{ background: 'none', border: 'none' }}
        >
          Dismiss Checklist
        </button>
      </div>
    </motion.div>
  )
}
