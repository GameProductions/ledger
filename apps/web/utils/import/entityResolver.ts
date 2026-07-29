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
