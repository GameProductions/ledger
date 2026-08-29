/**
 * ⚡ Ledger Asynchronous Importer Submission API
 * Enqueues large statement, CSV, and Excel datasets into Cloudflare Queues for background batching.
 */

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middlewares/auth-middleware';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

export const importQueueRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const importBatchSchema = z.object({
  source: z.enum(['csv', 'excel_legacy', 'bank_statement']).default('csv'),
  rows: z.array(z.object({
    date: z.string(),
    amountCents: z.number(),
    description: z.string(),
    categoryName: z.string().optional(),
    accountName: z.string().optional(),
    providerName: z.string().optional(),
    notes: z.string().optional(),
    isIncome: z.boolean().optional(),
  })).min(1).max(2000),
});

/**
 * POST /api/financials/import/queue
 * Asynchronously offload transaction batches to Cloudflare Queues
 */
importQueueRouter.post(
  '/',
  authMiddleware,
  zValidator('json', importBatchSchema),
  async (c) => {
    const { source, rows } = c.req.valid('json');
    const householdId = c.get('householdId');
    const userId = c.get('userId');

    if (!householdId || !userId) {
      return c.json({ error: 'Household context required' }, 400);
    }

    const jobId = crypto.randomUUID();

    // 1. If Cloudflare Queues producer is bound, dispatch to background queue
    if (c.env.LEDGER_IMPORT_QUEUE) {
      try {
        await c.env.LEDGER_IMPORT_QUEUE.send({
          jobId,
          householdId,
          userId,
          source,
          rows,
        });

        return c.json({
          success: true,
          jobId,
          status: 'queued',
          message: `Successfully enqueued ${rows.length} rows for background processing`,
        });
      } catch (err: any) {
        console.error('[Import Queue Producer Error]', err);
      }
    }

    // 2. Fallback: Direct processing if queue binding is not active in local emulator
    const { LedgerImportConsumer } = await import('../queues/import-consumer');
    await LedgerImportConsumer.processBatch({
      queue: 'ledger-import-queue',
      messages: [{
        id: jobId,
        body: { jobId, householdId, userId, source, rows },
        ack: () => {},
        retry: () => {},
      }],
    } as any, c.env);

    return c.json({
      success: true,
      jobId,
      status: 'completed',
      message: `Processed ${rows.length} rows directly`,
    });
  }
);
