import { getDb } from './db'
import { transactionPairingRules, transactions } from './db/schema'
import { eq, like, desc, and } from 'drizzle-orm'

export const inferTransactionDetails = async (db: ReturnType<typeof getDb>, householdId: string, rawDescription: string) => {
  // 1. Check exact explicit rules
  const rules = await db.select()
    .from(transactionPairingRules)
    .where(eq(transactionPairingRules.householdId, householdId))
  
  for (const rule of rules) {
    if (rawDescription.toLowerCase().includes(rule.pattern.toLowerCase())) {
      return {
        matched_rule_id: rule.id,
        category_id: rule.targetCategoryId,
        provider_id: rule.targetProviderId,
        auto_confirm: rule.autoConfirm
      }
    }
  }

  // 2. No explicit rule found, do historical frequency search
  const historyMatches = await db.select({
    categoryId: transactions.categoryId,
    providerId: transactions.providerId
  })
    .from(transactions)
    .where(and(
      eq(transactions.householdId, householdId),
      like(transactions.description, `%${rawDescription.substring(0, 8)}%`) // fuzzy match prefix
    ))
    .orderBy(desc(transactions.transactionDate))
    .limit(10)

  if (historyMatches.length > 0) {
    // Basic heuristics: majority vote
    const categoryCounts: Record<string, number> = {}
    const providerCounts: Record<string, number> = {}

    for (const m of historyMatches) {
      if (m.categoryId) categoryCounts[m.categoryId] = (categoryCounts[m.categoryId] || 0) + 1
      if (m.providerId) providerCounts[m.providerId] = (providerCounts[m.providerId] || 0) + 1
    }

    let topCategory = null
    let maxCatCount = 0
    for (const [cat, count] of Object.entries(categoryCounts)) {
      if (count > maxCatCount) { maxCatCount = count; topCategory = cat }
    }

    let topProvider = null
    let maxProvCount = 0
    for (const [prov, count] of Object.entries(providerCounts)) {
      if (count > maxProvCount) { maxProvCount = count; topProvider = prov }
    }

    // Only suggest if we have some confidence (e.g., > 2 similar past transactions)
    if (maxCatCount > 2 || maxProvCount > 2) {
      return {
        matched_rule_id: null,
        category_id: topCategory,
        provider_id: topProvider,
        auto_confirm: false
      }
    }
  }

  return null
}
