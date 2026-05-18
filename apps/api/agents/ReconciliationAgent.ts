// @ts-nocheck
import { Agent } from 'agents';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '#/schema';
import { eq, and } from 'drizzle-orm';
import { Bindings } from '../types';
import { MatchAgent } from './MatchAgent';
import { RuleAgent } from './RuleAgent';

export class ReconciliationAgent extends Agent<Bindings> {
  
  /**
   * Orchestrates the reconciliation process for a household.
   * Delegates to specialized sub-agents.
   */
  async reconcile(householdId: string) {
    console.log(`[ReconciliationAgent] Orchestrating reconciliation for household: ${householdId}`);
    
    const db = drizzle(this.env.DB, { schema });

    // 1. Spawn Sub-agents for specialized tasks
    const matcher = this.subAgent(MatchAgent, 'matcher');
    const ruler = this.subAgent(RuleAgent, 'ruler');

    // 2. Fetch unreconciled transactions for rule application
    const unreconciledTxs = (await db.select().from(schema.transactions).where(
          and(
            eq(schema.transactions.householdId, householdId),
            eq(schema.transactions.reconciliationStatus, 'unreconciled')
          )
        ) as any);

    const txIds = unreconciledTxs.map(t => t.id);

    // 3. Execute tasks
    // Matcher scans everything unreconciled
    // Ruler applies to the specific list
    const [matchResult, ruleResult] = (await Promise.all([
          matcher.findMatches(householdId),
          txIds.length > 0 ? ruler.applyRules(householdId, txIds) : Promise.resolve({ appliedCount: 0 })
        ]) as any);

    const result = {
      transactionsProcessed: unreconciledTxs.length,
      proposalsGenerated: matchResult.proposalsGenerated,
      rulesApplied: ruleResult.appliedCount
    };

    // 4. Log orchestration event
    await db.insert(schema.activityLogs).values({
      householdId,
      actorId: 'RECONCILIATION_AGENT',
      actorType: 'AGENT',
      action: 'PROCESS_BATCH',
      severity: 'INFO',
      detailsJson: JSON.stringify(result),
      createdAt: new Date().toISOString()
    });

    return {
      status: 'success',
      proposalsGenerated: matchResult.proposalsGenerated,
      rulesApplied: ruleResult.appliedCount
    };
  }
}
