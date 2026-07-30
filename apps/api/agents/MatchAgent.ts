import { Agent } from 'agents';
import { getDb } from '#/index';
import * as schema from '#/schema';
import { eq, and, sql, ne, lte, gte, or, inArray } from 'drizzle-orm';
import { Bindings } from '../types';

export class MatchAgent extends Agent<any> {
  async findMatches(householdId: string) {
    const db = getDb(this.env);

    const unreconciled = (await db.select().from(schema.transactions).where(
      and(
        eq(schema.transactions.householdId, householdId),
        eq(schema.transactions.reconciliationStatus, 'unreconciled')
      )
    ) as any);

    let proposalsCount = 0;
    const CHUNK_SIZE = 50;

    for (let i = 0; i < unreconciled.length; i += CHUNK_SIZE) {
      const chunk = unreconciled.slice(i, i + CHUNK_SIZE);

      for (const tx of chunk) {
        const candidates = await this.findCandidates(db, householdId, tx);
        for (const match of candidates) {
          const sortedIds = [tx.id, match.id].sort();
          const primaryId = sortedIds[0];
          const suggestedId = sortedIds[1];

          const existing = (await db.select().from(schema.reconciliationProposals).where(
            and(
              eq(schema.reconciliationProposals.primaryTransactionId, primaryId),
              eq(schema.reconciliationProposals.suggestedTransactionId, suggestedId)
            )
          ).limit(1).then(res => res[0]) as any);

          if (!existing) {
            const confidence = this.calculateConfidence(tx, match);
            const reason = this.buildMatchReason(tx, match);

            await db.insert(schema.reconciliationProposals).values({
              id: crypto.randomUUID(),
              householdId,
              primaryTransactionId: primaryId,
              suggestedTransactionId: suggestedId,
              confidenceScore: confidence,
              matchReason: reason,
              status: 'pending'
            });
            proposalsCount++;
          }
        }
      }
    }

    return { proposalsGenerated: proposalsCount };
  }

  private async findCandidates(db: any, householdId: string, tx: any): Promise<any[]> {
    const conditions: any[] = [
      eq(schema.transactions.householdId, householdId),
      ne(schema.transactions.id, tx.id),
      eq(schema.transactions.reconciliationStatus, 'unreconciled'),
    ];

    const dateWindow = sql`ABS(CAST(${schema.transactions.transactionDate} AS date) - CAST(${tx.transactionDate} AS date)) <= 7`;

    const amountConditions: any[] = [
      eq(schema.transactions.amountCents, -tx.amountCents),
      eq(schema.transactions.amountCents, tx.amountCents),
    ];

    if (tx.providerId) {
      amountConditions.push(
        and(
          eq(schema.transactions.providerId, tx.providerId),
          sql`ABS(CAST(${schema.transactions.transactionDate} AS date) - CAST(${tx.transactionDate} AS date)) <= 14`
        )
      );
    }

    const descriptionWords = (tx.description || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    if (descriptionWords.length >= 2) {
      const descPatterns = descriptionWords.slice(0, 3).map((w: string) => sql`LOWER(${schema.transactions.description}) LIKE ${'%' + w + '%'}`);
      const descCondition = or(
        eq(schema.transactions.amountCents, -tx.amountCents),
        eq(schema.transactions.amountCents, tx.amountCents)
      );
      amountConditions.push(
        and(
          descCondition,
          or(...descPatterns),
          dateWindow
        )
      );
    }

    conditions.push(or(...amountConditions), dateWindow);

    return (await db.select().from(schema.transactions).where(and(...conditions)).limit(20) as any);
  }

  private calculateConfidence(tx: any, match: any): number {
    let score = 0;

    if (tx.amountCents === -match.amountCents) score += 50;
    else if (tx.amountCents === match.amountCents) score += 30;

    if (tx.providerId && match.providerId && tx.providerId === match.providerId) score += 30;

    const dateDiff = Math.abs(new Date(tx.transactionDate).getTime() - new Date(match.transactionDate).getTime()) / (1000 * 60 * 60 * 24);
    if (dateDiff <= 1) score += 15;
    else if (dateDiff <= 3) score += 10;
    else if (dateDiff <= 7) score += 5;

    const descSim = this.descriptionSimilarity(tx.description || '', match.description || '');
    if (descSim > 0.7) score += 20;
    else if (descSim > 0.4) score += 10;

    return Math.min(score, 99);
  }

  private descriptionSimilarity(a: string, b: string): number {
    const wa = a.toLowerCase().split(/\s+/).filter(Boolean);
    const wb = b.toLowerCase().split(/\s+/).filter(Boolean);
    if (wa.length === 0 || wb.length === 0) return 0;

    const setB = new Set(wb);
    const common = wa.filter(w => setB.has(w)).length;
    return common / Math.max(wa.length, wb.length);
  }

  private buildMatchReason(tx: any, match: any): string {
    const reasons: string[] = [];
    const amount = Math.abs(tx.amountCents / 100).toFixed(2);

    if (tx.amountCents === -match.amountCents) {
      reasons.push(`Opposite amount $${amount}`);
    } else if (tx.amountCents === match.amountCents) {
      reasons.push(`Same amount $${amount}`);
    }

    if (tx.providerId && match.providerId && tx.providerId === match.providerId) {
      reasons.push('Same provider');
    }

    const descSim = this.descriptionSimilarity(tx.description || '', match.description || '');
    if (descSim > 0.5) {
      reasons.push('Similar description');
    }

    reasons.push('Within 7 days');

    return reasons.join(', ') + '.';
  }
}
