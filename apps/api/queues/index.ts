import { Bindings } from '../types'
import { getDb } from '#/index'

/**
 * Queue Handler
 * Orchestrates background tasks to prevent 'CPU Limit Exceeded' (1102) 
 * on the primary API worker.
 */
export const handleQueue = async (batch: any, env: Bindings): Promise<void> => {
  const db = getDb(env)

  for (const message of batch.messages) {
    try {
      const task = message.body
      console.log(`[Queue] Processing task: ${task.type}`, { id: message.id })

      switch (task.type) {
        case 'HEAVY_CSV_IMPORT':
          // offload CSV processing logic here
          break
        case 'GLOBAL_RECONCILIATION':
          // offload complex math/aggregation here
          break
        default:
          console.warn(`[Queue] Unknown task type: ${task.type}`)
      }

      message.ack()
    } catch (e) {
      console.error(`[Queue Error] Task Failed: ${message.id}`, e)
      // Message will be retried based on queue config
    }
  }
}
