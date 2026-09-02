/**
 * ⚡ Ledger Asynchronous Importer Queue Consumer
 * Processes batched transaction rows from CSV/Excel uploads, matches categories/accounts/entities,
 * and leverages Cloudflare Workers AI for edge-native fuzzy payee categorization.
 */

import { Bindings } from '../types';
import { getDb } from '#/index';
import { transactions, categories, accounts, serviceProviders } from '#/schema';
import { eq } from 'drizzle-orm';

export interface ImportTaskPayload {
  jobId: string;
  householdId: string;
  userId: string;
  source: 'csv' | 'excel_legacy' | 'bank_statement';
  rows: Array<{
    date: string;
    amountCents: number;
    description: string;
    categoryName?: string;
    accountName?: string;
    providerName?: string;
    notes?: string;
    isIncome?: boolean;
  }>;
}

export class LedgerImportConsumer {
  /**
   * Main Queue consumer handler for batch processing
   */
  static async processBatch(batch: MessageBatch<ImportTaskPayload>, env: Bindings): Promise<void> {
    const db = getDb(env);

    for (const msg of batch.messages) {
      const { jobId, householdId, userId, rows, source } = msg.body;
      console.log(`[Import Queue] Processing Job ${jobId} (${rows.length} rows, source: ${source})`);

      try {
        // 1. Fetch household reference data for entity matching
        const [existingCategories, existingAccounts, existingProviders] = await Promise.all([
          db.select().from(categories).where(eq(categories.householdId, householdId)),
          db.select().from(accounts).where(eq(accounts.householdId, householdId)),
          db.select().from(serviceProviders).where(eq(serviceProviders.householdId, householdId)),
        ]);

        const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));
        const accountMap = new Map(existingAccounts.map(a => [a.name.toLowerCase(), a.id]));
        const providerMap = new Map(existingProviders.map(p => [p.name.toLowerCase(), p.id]));

        const defaultAccountId = existingAccounts[0]?.id || null;
        const defaultCategoryId = existingCategories[0]?.id || null;

        const preparedTransactions: any[] = [];

        // 2. Process and normalize each row
        for (const row of rows) {
          let categoryId = row.categoryName ? categoryMap.get(row.categoryName.toLowerCase()) : null;
          const accountId = (row.accountName ? accountMap.get(row.accountName.toLowerCase()) : null) || defaultAccountId;
          const providerId = row.providerName ? providerMap.get(row.providerName.toLowerCase()) : null;

          // 3. If category is missing and Workers AI is available, run zero-cost AI categorization
          if (!categoryId && env.AI && row.description) {
            try {
              const aiPrompt = `Classify this financial transaction description into a single standard category word (e.g. Groceries, Utilities, Subscriptions, Dining, Transportation, Healthcare, Entertainment, Shopping, Income, Transfer): "${row.description}". Answer with only the category word:`;
              const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                prompt: aiPrompt,
                max_tokens: 10,
              });

              const suggested = (response?.response || '').trim().toLowerCase();
              if (categoryMap.has(suggested)) {
                categoryId = categoryMap.get(suggested);
              }
            } catch (aiErr) {
              // Graceful fallback to default
            }
          }

          preparedTransactions.push({
            id: crypto.randomUUID(),
            householdId,
            userId,
            accountId,
            categoryId: categoryId || defaultCategoryId,
            providerId,
            amountCents: row.amountCents,
            description: row.description,
            date: row.date || new Date().toISOString().split('T')[0],
            notes: row.notes || `Imported via ${source} (Job ${jobId.slice(0, 8)})`,
            isIncome: Boolean(row.isIncome),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        // 4. Batch insert transactions into Neon Postgres
        if (preparedTransactions.length > 0) {
          await db.insert(transactions).values(preparedTransactions);
          console.log(`[Import Queue] ✅ Job ${jobId}: Successfully inserted ${preparedTransactions.length} transactions.`);
        }

        msg.ack();
      } catch (err: any) {
        console.error(`[Import Queue] ❌ Job ${jobId} failed:`, err);
        msg.retry();
      }
    }
  }
}
