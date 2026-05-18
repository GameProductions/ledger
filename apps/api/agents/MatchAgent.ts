import { Agent } from 'agents';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '#/schema';
import { eq, and, sql, ne, lte, gte, or } from 'drizzle-orm';
import { Bindings } from '../types';

export class MatchAgent extends Agent<any> {
  /**
   * Scans unreconciled transactions and generates pairing proposals.
   */
  async findMatches(householdId: string) {
    const db = drizzle(this.env.DB, { schema });
    
    // 1. Fetch unreconciled transactions
    const unreconciled = (await db.select().from(schema.transactions).where(
          and(
            eq(schema.transactions.householdId, householdId),
            eq(schema.transactions.reconciliationStatus, 'unreconciled')
          )
        ) as any);

    let proposalsCount = 0;

    for (const tx of unreconciled) {
      // Find potential counterparts: same amount (opposite sign) or exact same amount for transfers
      // We look for +/- 7 days
      const potentialMatches = (await db.select().from(schema.transactions).where(
              and(
                eq(schema.transactions.householdId, householdId),
                ne(schema.transactions.id, tx.id),
                eq(schema.transactions.reconciliationStatus, 'unreconciled'),
                or(
                  eq(schema.transactions.amountCents, -tx.amountCents),
                  eq(schema.transactions.amountCents, tx.amountCents)
                ),
                sql`ABS(julianday(${schema.transactions.transactionDate}) - julianday(${tx.transactionDate})) <= 7`
              )
            ) as any);

      for (const match of potentialMatches) {
        const sortedIds = [tx.id, match.id].sort();
        const primaryId = sortedIds[0];
        const suggestedId = sortedIds[1];

        // Check if proposal already exists
        const existing = (await db.select().from(schema.reconciliationProposals).where(
                  and(
                    eq(schema.reconciliationProposals.primaryTransactionId, primaryId),
                    eq(schema.reconciliationProposals.suggestedTransactionId, suggestedId)
                  )
                ).limit(1).then(res => res[0]) as any);

        if (!existing) {
          await db.insert(schema.reconciliationProposals).values({
            id: crypto.randomUUID(),
            householdId,
            primaryTransactionId: primaryId,
            suggestedTransactionId: suggestedId,
            confidenceScore: tx.amountCents === -match.amountCents ? 90 : 70,
            matchReason: `Matching amount $${Math.abs(tx.amountCents / 100).toFixed(2)} within 7 days.`,
            status: 'pending'
          });
          proposalsCount++;
        }
      }
    }

    return { proposalsGenerated: proposalsCount };
  }
}
