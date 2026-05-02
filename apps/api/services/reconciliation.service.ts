import { Bindings } from '../types'
import { transactions, reconciliationProposals } from '#/schema'
import { eq, and, inArray } from 'drizzle-orm'

export class ReconciliationService {
  constructor(private db: any, private env: Bindings) {}

  /**
   * Delegates rule application to the RuleAgent swarm member.
   */
  async applyRules(householdId: string, transactionIds: string[]) {
    if (transactionIds.length === 0) return
    
    console.log(`[ReconService] Delegating rule application to RuleAgent for ${householdId}`);
    const id = this.env.RULE_AGENT.idFromName(householdId);
    const agent = this.env.RULE_AGENT.get(id);
    
    await agent.applyRules(householdId, transactionIds);
  }

  /**
   * Delegates matching to the ReconciliationAgent orchestrator.
   */
  async generateProposals(householdId: string) {
    console.log(`[ReconService] Delegating proposal generation to ReconciliationAgent for ${householdId}`);
    
    const id = this.env.RECONCILIATION_AGENT.idFromName(householdId);
    const agent = this.env.RECONCILIATION_AGENT.get(id);
    
    const result = await agent.reconcile(householdId);
    return result.proposalsGenerated || 0;
  }

  /**
   * Bulk Action: Approve or Reject proposals
   */
  async handleBulkProposals(householdId: string, proposalIds: string[], action: 'approve' | 'reject') {
    if (proposalIds.length === 0) return

    if (action === 'reject') {
      await this.db.update(reconciliationProposals)
        .set({ status: 'rejected' })
        .where(and(eq(reconciliationProposals.householdId, householdId), inArray(reconciliationProposals.id, proposalIds)))
      return
    }

    const proposals = await this.db.select().from(reconciliationProposals).where(
      and(
        eq(reconciliationProposals.householdId, householdId),
        inArray(reconciliationProposals.id, proposalIds)
      )
    )

    for (const p of proposals) {
      const b1 = this.db.update(transactions)
        .set({ linkedTransactionId: p.suggestedTransactionId, reconciliationStatus: 'reconciled' })
        .where(eq(transactions.id, p.primaryTransactionId))
      
      const b2 = this.db.update(transactions)
        .set({ linkedTransactionId: p.primaryTransactionId, reconciliationStatus: 'reconciled' })
        .where(eq(transactions.id, p.suggestedTransactionId))
      
      const b3 = this.db.update(reconciliationProposals)
        .set({ status: 'approved' })
        .where(eq(reconciliationProposals.id, p.id))

      await this.db.batch([b1, b2, b3])
    }
  }
}
