import type { MatchConfidence, MatchResult, EntityGroup } from './types'

export interface ResolvedEntities {
  personMap: Record<string, string>
  providerMap: Record<string, string>
  categoryMap: Record<string, string>
  accountMap: Record<string, string>
}

export function buildFuzzyMatchKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export function suggestEntityMatch<T extends { id: string; name: string }>(
  detectedName: string,
  candidates: T[]
): T | null {
  const key = buildFuzzyMatchKey(detectedName)
  if (!key) return null

  const exact = candidates.find((c) => buildFuzzyMatchKey(c.name) === key)
  if (exact) return exact

  const partial = candidates.find((c) => key.includes(buildFuzzyMatchKey(c.name)) || buildFuzzyMatchKey(c.name).includes(key))
  return partial ?? null
}

export function matchWithConfidence<T extends { id: string; name: string }>(
  detectedName: string,
  candidates: T[]
): { match: T | null; confidence: MatchConfidence } {
  const key = buildFuzzyMatchKey(detectedName)
  if (!key || !candidates.length) return { match: null, confidence: null }

  for (const c of candidates) {
    const cKey = buildFuzzyMatchKey(c.name)
    if (cKey === key) {
      if (c.name === detectedName) return { match: c, confidence: 'exact' }
      return { match: c, confidence: 'high' }
    }
  }

  for (const c of candidates) {
    const cKey = buildFuzzyMatchKey(c.name)
    if (key.includes(cKey) || cKey.includes(key)) {
      return { match: c, confidence: 'medium' }
    }
  }

  const words = key.split(/\s+/).filter(Boolean)
  for (const c of candidates) {
    const cKey = buildFuzzyMatchKey(c.name)
    const matchCount = words.filter((w) => cKey.includes(w)).length
    if (matchCount > 0 && matchCount >= words.length * 0.5) {
      return { match: c, confidence: 'low' }
    }
  }

  return { match: null, confidence: null }
}

export function suggestPersonMatch(
  detectedName: string,
  members: { id: string; displayName: string; username: string }[]
): { id: string; displayName: string } | null {
  const key = buildFuzzyMatchKey(detectedName)
  if (!key) return null

  for (const m of members) {
    const nameKey = buildFuzzyMatchKey(m.displayName || m.username)
    if (nameKey === key) return { id: m.id, displayName: m.displayName || m.username }
  }

  for (const m of members) {
    const nameKey = buildFuzzyMatchKey(m.displayName || m.username)
    if (key.includes(nameKey) || nameKey.includes(key))
      return { id: m.id, displayName: m.displayName || m.username }
  }

  return null
}

export function buildAccountKey(bankName: string, accountType: string): string {
  return buildFuzzyMatchKey(`${bankName}-${accountType}`)
}

export function suggestAccountMatch(
  bankName: string,
  accountType: string,
  accounts: { id: string; name: string; type: string }[]
): { id: string; name: string } | null {
  const key = buildAccountKey(bankName, accountType)

  const exact = accounts.find((a) => buildAccountKey(a.name, a.type) === key)
  if (exact) return { id: exact.id, name: exact.name }

  const typeMatch = accounts.find(
    (a) => a.type === accountType && (buildFuzzyMatchKey(a.name).includes(buildFuzzyMatchKey(bankName)) || buildFuzzyMatchKey(bankName).includes(buildFuzzyMatchKey(a.name)))
  )
  return typeMatch ? { id: typeMatch.id, name: typeMatch.name } : null
}

export function matchAccountsWithConfidence(
  bankName: string,
  accountType: string,
  accounts: { id: string; name: string; type: string }[]
): MatchResult | null {
  const key = buildAccountKey(bankName, accountType)

  for (const a of accounts) {
    const aKey = buildAccountKey(a.name, a.type)
    if (aKey === key) {
      const confidence: MatchConfidence = a.name === bankName ? 'exact' : 'high'
      return { entityId: a.id, entityName: a.name, confidence }
    }
  }

  for (const a of accounts) {
    if (a.type === accountType) {
      const nk = buildFuzzyMatchKey(a.name)
      const bk = buildFuzzyMatchKey(bankName)
      if (nk.includes(bk) || bk.includes(nk)) {
        return { entityId: a.id, entityName: a.name, confidence: 'medium' }
      }
    }
  }

  for (const a of accounts) {
    const nk = buildFuzzyMatchKey(a.name)
    const bk = buildFuzzyMatchKey(bankName)
    if (nk.includes(bk) || bk.includes(nk)) {
      return { entityId: a.id, entityName: a.name, confidence: 'low' }
    }
  }

  return null
}

export function resolveEntityGroup(
  group: EntityGroup,
  importedName: string,
  candidates: { id: string; name: string; type?: string }[],
  context?: { accountType?: string }
): MatchResult | null {
  if (group === 'account' && context?.accountType) {
    return matchAccountsWithConfidence(importedName, context.accountType, candidates as { id: string; name: string; type: string }[])
  }

  const { match, confidence } = matchWithConfidence(importedName, candidates)
  if (!match) return null
  return { entityId: match.id, entityName: match.name, confidence }
}
