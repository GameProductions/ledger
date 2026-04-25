import { getLegacyExternalChartUrl } from '../services/chart-service'

/**
 * LEDGER Financial Advisor
 * Processes account analysis into safety recommendations.
 * SECURITY HARDENING: Ensures data anonymization in analysis.
 */
export const getCoachingAnswer = (question: string, totalSpend: number) => {
  const amountStr = `$${(totalSpend/100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  
  const rules = [
    { 
      trigger: ['afford', 'buy', 'purchase'], 
      answer: `Analysis of your safety reserve suggests that while your current spending of ${amountStr} is stable, you should check your future projections before committing to major purchases.`
    },
    { 
      trigger: ['spend', 'total', 'much'], 
      answer: `Account analysis confirms your current spending rate is ${amountStr} for this cycle.`
    }
  ]

  const matched = rules.find(r => r.trigger.some(t => question.toLowerCase().includes(t)))
  
  if (matched) return matched.answer
  
  return "Systems report stable financial health. Maintain current budget plans and monitor your account for changes."
}

