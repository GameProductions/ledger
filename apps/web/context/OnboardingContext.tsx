import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getApiUrl } from '../utils/api'
import { CURRENT_VERSION } from '@shared/constants'

interface OnboardingContextType {
  completedSteps: string[]
  isCompleted: boolean
  activeStep: string | null
  isLoading: boolean
  updates: any[]
  currentVersion: string
  completeStep: (step: string, isLast?: boolean, version?: string) => Promise<void>
  startTour: () => void
  skipTour: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth()
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [updates, setUpdates] = useState<any[]>([])
  const [currentVersion, setCurrentVersion] = useState(CURRENT_VERSION)

  const apiUrl = getApiUrl()

  useEffect(() => {
    if (token) {
      fetchOnboardingStatus()
    } else {
      setIsLoading(false)
    }
  }, [token])

  const fetchOnboardingStatus = async () => {
    try {
      const res = (await fetch(`${apiUrl}/api/user/onboarding`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }) as any)
      if (res.ok) {
        const envelope = (await res.json() as any)
        if (envelope.success && envelope.data) {
          const data = envelope.data
          setCompletedSteps(data.completedSteps || [])
          setIsCompleted(data.isCompleted || false)
          setUpdates(data.updates || [])
          setCurrentVersion(data.currentVersion || CURRENT_VERSION)
          
          if ((data.updates?.length || 0) > 0) {
            setActiveStep('welcome')
          } else if (!data.isCompleted && Array.isArray(data.completedSteps) && data.completedSteps.length === 0) {
            setActiveStep('welcome')
          }
        }
      }
    } catch (error: any) {
      console.error('[DIAGNOSTIC_FAILURE] Failed to fetch onboarding status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const completeStep = async (step: string, isLast?: boolean, version?: string) => {
    try {
      const res = (await fetch(`${apiUrl}/api/user/onboarding/step`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ step, isLast, version })
            }) as any)
      if (res.ok) {
        const envelope = (await res.json() as any)
        if (envelope.success) {
          setCompletedSteps(envelope.completedSteps || [])
          setIsCompleted(envelope.isCompleted || false)
          if (isLast) setActiveStep(null)
        }
      }
    } catch (error: any) {
      console.error('[DIAGNOSTIC_FAILURE] Failed to update onboarding step:', error)
    }
  }

  const startTour = () => setActiveStep('welcome')
  const skipTour = () => {
    setIsCompleted(true)
    setActiveStep(null)
    completeStep('skip', true, currentVersion)
  }

  return (
    <OnboardingContext.Provider value={{
      completedSteps,
      isCompleted,
      activeStep,
      isLoading,
      updates,
      currentVersion,
      completeStep,
      startTour,
      skipTour
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) throw new Error('useOnboarding must be used within an OnboardingProvider')
  return context
}
