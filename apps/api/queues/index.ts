import { Bindings } from '../types'
import { LedgerImportConsumer } from './import-consumer'

/**
 * Queue Handler
 * Orchestrates background tasks to prevent 'CPU Limit Exceeded' (1102) 
 * on the primary API worker.
 */
export const handleQueue = async (batch: any, env: Bindings): Promise<void> => {
  if (batch.queue === 'ledger-import-queue') {
    await LedgerImportConsumer.processBatch(batch, env);
    return;
  }

  for (const message of batch.messages) {
    try {
      const task = message.body
      console.log(`[Queue] Processing task: ${task.type}`, { id: message.id })

      switch (task.type) {
        case 'HEAVY_CSV_IMPORT':
        case 'EXCEL_WORKBOOK_IMPORT':
          if (task.rows) {
            await LedgerImportConsumer.processBatch({
              queue: 'ledger-import-queue',
              messages: [{ id: message.id, body: task, ack: () => message.ack(), retry: () => message.retry() }]
            } as any, env);
          }
          break
        case 'GLOBAL_RECONCILIATION':
          // offload complex math/aggregation here
          break
        default:
          console.warn(`[Queue] Unknown task type: ${task.type}`)
      }

      message.ack()
    } catch (e: any) {
      console.error(`[Queue Error] Task Failed: ${message.id}`, e)
      message.retry();
    }
  }
}

