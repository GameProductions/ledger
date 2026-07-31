import { useState, useEffect, useCallback, useRef } from 'react'
import { secureRequest } from '../api'
import { resolveEntityGroup } from './entityResolver'
import type {
  EntityMatchItem,
  EntityGroup,
  MatchResult,
} from './types'

export interface EntityInput {
  group: EntityGroup
  names: string[]
  context?: Record<string, { accountType?: string }>
}

interface FetchEntityConfig {
  group: EntityGroup
  url: string
}

const FETCH_CONFIGS: FetchEntityConfig[] = [
  { group: 'provider', url: '/api/user/service-providers' },
  { group: 'account', url: '/api/financials/accounts' },
  { group: 'category', url: '/api/financials/categories' },
  { group: 'biller', url: '/api/financials/billers' },
  { group: 'payment-method', url: '/api/user/payment-methods' },
  { group: 'subscription', url: '/api/planning/subscriptions' },
]

interface FetchedEntities {
  [group: string]: { id: string; name: string; type?: string }[]
}

async function fetchEntities(
  groups: EntityGroup[]
): Promise<FetchedEntities> {
  const result: FetchedEntities = {}
  const configs = FETCH_CONFIGS.filter((c) => groups.includes(c.group))
  const results = await Promise.allSettled(
    configs.map(async (cfg) => {
      const res = await secureRequest(cfg.url)
      const json = await res.json()
      const data = Array.isArray(json) ? json : json.data ?? []
      return { group: cfg.group, data }
    })
  )
  for (const r of results) {
    if (r.status === 'fulfilled') {
      result[r.value.group] = r.value.data
    }
  }
  return result
}

function generateId(): string {
  return `match-${crypto.randomUUID().slice(0, 8)}`
}

function buildInitialItems(inputs: EntityInput[], fetched: FetchedEntities): EntityMatchItem[] {
  const items: EntityMatchItem[] = []
  for (const input of inputs) {
    for (const name of input.names) {
      if (!name.trim()) continue
      const candidates = fetched[input.group] ?? []
      const ctx = input.context?.[name]
      const existing = resolveEntityGroup(input.group, name.trim(), candidates, ctx)
      items.push({
        id: generateId(),
        group: input.group,
        importedName: name.trim(),
        existing,
        status: existing ? 'approved' : 'pending',
        manualMatch: null,
        createNew: !existing,
        newName: name.trim(),
      })
    }
  }
  return items
}

export function useEntityMatching(inputs: EntityInput[]) {
  const [items, setItems] = useState<EntityMatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inputsKey = useRef('')

  const groups = Array.from(new Set(inputs.map((i) => i.group)))
  const key = JSON.stringify(inputs)

  useEffect(() => {
    if (inputsKey.current === key) return
    inputsKey.current = key

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const fetched = await fetchEntities(groups)
        if (cancelled) return
        const initial = buildInitialItems(inputs, fetched)
        setItems(initial)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to fetch entities')
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [key, groups])

  const updateItem = useCallback((id: string, updates: Partial<EntityMatchItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  const approveAll = useCallback(
    (group?: EntityGroup) => {
      setItems((prev) =>
        prev.map((item) =>
          (group === undefined || item.group === group)
            ? { ...item, status: 'approved' as const, createNew: false }
            : item
        )
      )
    },
    []
  )

  const rejectAll = useCallback(
    (group?: EntityGroup) => {
      setItems((prev) =>
        prev.map((item) =>
          (group === undefined || item.group === group)
            ? { ...item, status: 'rejected' as const, createNew: true }
            : item
        )
      )
    },
    []
  )

  const setManualMatch = useCallback(
    (id: string, match: MatchResult) => {
      updateItem(id, {
        manualMatch: match,
        status: 'approved',
        createNew: false,
      })
    },
    [updateItem]
  )

  const setCreateNew = useCallback(
    (id: string, createNew: boolean) => {
      updateItem(id, {
        createNew,
        status: createNew ? 'rejected' : 'pending',
      })
    },
    [updateItem]
  )

  const setNewName = useCallback(
    (id: string, name: string) => {
      updateItem(id, { newName: name })
    },
    [updateItem]
  )

  const getApproved = useCallback((): EntityMatchItem[] => {
    return items.filter((i) => i.status === 'approved')
  }, [items])

  const getFinalMapping = useCallback((): {
    providerMap: Record<string, string>
    categoryMap: Record<string, string>
    accountMap: Record<string, string>
    billerMap: Record<string, string>
    paymentMethodMap: Record<string, string>
    subscriptionMap: Record<string, string>
    personMap: Record<string, string>
  } => {
    const mapping = {
      providerMap: {} as Record<string, string>,
      categoryMap: {} as Record<string, string>,
      accountMap: {} as Record<string, string>,
      billerMap: {} as Record<string, string>,
      paymentMethodMap: {} as Record<string, string>,
      subscriptionMap: {} as Record<string, string>,
      personMap: {} as Record<string, string>,
    }

    for (const item of items) {
      if (item.status !== 'approved') continue
      const matchedId = item.manualMatch?.entityId || item.existing?.entityId
      if (!matchedId && !item.createNew) continue

      const mapKey = `${item.group}Map` as keyof typeof mapping
      if (item.createNew || !matchedId) {
        mapping[mapKey][item.importedName] = item.newName
      } else {
        mapping[mapKey][item.importedName] = matchedId
      }
    }

    return mapping
  }, [items])

  const pendingCount = items.filter((i) => i.status === 'pending').length
  const approvedCount = items.filter((i) => i.status === 'approved').length
  const rejectedCount = items.filter((i) => i.status === 'rejected').length

  return {
    items,
    loading,
    error,
    updateItem,
    approveAll,
    rejectAll,
    setManualMatch,
    setCreateNew,
    setNewName,
    getApproved,
    getFinalMapping,
    pendingCount,
    approvedCount,
    rejectedCount,
  }
}
