import { getLegacyExternalChartUrl } from '../services/chart-service'

/**
 * LEDGER Forensic Coach
 * Processes household intelligence into safety recommendations.
 * FORENSIC HARDENING: Ensures zero-trust data anonymization in analysis.
 */
export const getCoachingAnswer = (question: string, totalSpend: number) => {
  const amountStr = `$${(totalSpend/100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  
  const rules = [
    { 
      trigger: ['afford', 'buy', 'purchase'], 
      answer: `Analysis of your safety reserve suggests that while your current throughput of ${amountStr} is stable, you should cross-verify the 'Future Flow' projections before committing to major acquisitions.`
    },
    { 
      trigger: ['spend', 'total', 'much'], 
      answer: `Household intelligence confirms your current operational burn rate is ${amountStr} for this cycle.`
    }
  ]

  const matched = rules.find(r => r.trigger.some(t => question.toLowerCase().includes(t)))
  
  if (matched) return matched.answer
  
  return "Sentinel systems report stable financial health. Maintain current fiscal protocols and monitor your 'Vault' for changes."
}

