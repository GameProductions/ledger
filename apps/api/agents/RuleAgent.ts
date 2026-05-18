// @ts-nocheck
import { Agent } from 'agents';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '#/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { Bindings } from '../types';

export class RuleAgent extends Agent<Bindings> {
  /**
   * Applies pairing rules to a list of transactions.
   */
  async applyRules(householdId: string, transactionIds: string[]) {
    const db = drizzle(this.env.DB, { schema });
    
    // 1. Fetch transactions
    const txs = (await db.select().from(schema.transactions).where(
          and(
            eq(schema.transactions.householdId, householdId),
            inArray(schema.transactions.id, transactionIds)
          )
        ) as any);

    // 2. Fetch rules
    const rules = (await db.select().from(schema.transactionPairingRules).where(
          or(
            eq(schema.transactionPairingRules.householdId, householdId),
            eq(schema.transactionPairingRules.visibility, 'public')
          )
        ) as any);

    let appliedCount = 0;

    for (const tx of txs) {
      let updates: any = {};
      for (const rule of rules) {
        try {
          const pattern = new RegExp(rule.pattern, 'i');
          const matches = pattern.test(tx.description || '') || pattern.test(tx.rawDescription || '');

          if (matches) {
            if (rule.targetCategoryId && !tx.categoryId && !updates.categoryId) {
              updates.categoryId = rule.targetCategoryId;
            }
            if (rule.targetProviderId && !tx.providerId && !updates.providerId) {
              updates.providerId = rule.targetProviderId;
            }
            if (rule.autoConfirm && !updates.reconciliationStatus) {
              updates.reconciliationStatus = 'reconciled';
            }
          }
        } catch (e: any) {
          console.error(`[RuleAgent] Invalid pattern ${rule.pattern}:`, e);
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.update(schema.transactions).set(updates).where(eq(schema.transactions.id, tx.id));
        appliedCount++;
      }
    }

    return { appliedCount };
  }
}
