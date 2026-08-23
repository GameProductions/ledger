/**
 * Offline Sync Manager with Optimistic Queueing and Auto-Replay
 */

export interface QueuedAction {
  id: string
  url: string
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: any
  label: string
  timestamp: number
  retries: number
}

const QUEUE_STORAGE_KEY = 'ledger_offline_queue'

type QueueListener = (queue: QueuedAction[], isSyncing: boolean) => void
const listeners = new Set<QueueListener>()
let isSyncing = false

export function getOfflineQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveOfflineQueue(queue: QueuedAction[]) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
    notifyListeners()
  } catch (err) {
    console.error('[OfflineSync] Failed to save offline queue', err)
  }
}

export function subscribeToOfflineSync(listener: QueueListener): () => void {
  listeners.add(listener)
  listener(getOfflineQueue(), isSyncing)
  return () => {
    listeners.delete(listener)
  }
}

function notifyListeners() {
  const queue = getOfflineQueue()
  listeners.forEach(fn => fn(queue, isSyncing))
}

export function enqueueOfflineAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): QueuedAction {
  const queue = getOfflineQueue()
  const newAction: QueuedAction = {
    ...action,
    id: crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    retries: 0
  }
  queue.push(newAction)
  saveOfflineQueue(queue)
  return newAction
}

export function removeOfflineAction(id: string) {
  const queue = getOfflineQueue().filter(a => a.id !== id)
  saveOfflineQueue(queue)
}

export async function processOfflineQueue(token: string | null): Promise<{ successCount: number; failureCount: number }> {
  if (isSyncing || !navigator.onLine || !token) {
    return { successCount: 0, failureCount: 0 }
  }

  const queue = getOfflineQueue()
  if (queue.length === 0) {
    return { successCount: 0, failureCount: 0 }
  }

  isSyncing = true
  notifyListeners()

  let successCount = 0
  let failureCount = 0
  const remainingQueue: QueuedAction[] = []

  for (const item of queue) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: item.body ? JSON.stringify(item.body) : undefined
      })

      if (res.ok) {
        successCount++
      } else if (res.status >= 400 && res.status < 500) {
        // Client error / conflict -> discard to prevent poison pills
        console.warn(`[OfflineSync] Action rejected (${res.status}): ${item.label}`)
        failureCount++
      } else {
        // Server error -> retry later
        item.retries++
        remainingQueue.push(item)
        failureCount++
      }
    } catch (networkErr) {
      console.warn(`[OfflineSync] Network error during sync of: ${item.label}`, networkErr)
      item.retries++
      remainingQueue.push(item)
      failureCount++
      break // network down again, stop loop
    }
  }

  isSyncing = false
  saveOfflineQueue(remainingQueue)
  return { successCount, failureCount }
}

// Auto-listen for online status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const token = localStorage.getItem('ledger_token')
    if (token) {
      processOfflineQueue(token).then(({ successCount }) => {
        if (successCount > 0) {
          console.info(`[OfflineSync] Synced ${successCount} queued offline action(s).`)
        }
      })
    }
  })
}
