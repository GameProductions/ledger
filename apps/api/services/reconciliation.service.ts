import { Bindings } from '../types'
import { transactions, reconciliationProposals } from '#/schema'
import { eq, and, inArray } from 'drizzle-orm'

export class ReconciliationService {
  constructor(private db: any, private env: Bindings) {}

  async applyRules(householdId: string, transactionIds: string[]) {
    if (transactionIds.length === 0) return
    console.log(`[ReconService] Delegating rule application to RuleAgent for ${householdId}`)
    const id = this.env.RULE_AGENT.idFromName(householdId)
    const agent = this.env.RULE_AGENT.get(id)
    await agent.applyRules(householdId, transactionIds)
  }

  async generateProposals(householdId: string) {
    console.log(`[ReconService] Delegating proposal generation to ReconciliationAgent for ${householdId}`)
    const id = this.env.RECONCILIATION_AGENT.idFromName(householdId)
    const agent = this.env.RECONCILIATION_AGENT.get(id)
    const result = (await agent.reconcile(householdId) as any)
    return result.proposalsGenerated || 0
  }

  async handleBulkProposals(householdId: string, proposalIds: string[], action: 'approve' | 'reject', userId?: string) {
    if (proposalIds.length === 0) return
    const now = new Date().toISOString()

    if (action === 'reject') {
      await this.db.update(reconciliationProposals)
        .set({ status: 'rejected', updatedAt: now })
        .where(and(eq(reconciliationProposals.householdId, householdId), inArray(reconciliationProposals.id, proposalIds)))
      return
    }

    const proposals = (await this.db.select().from(reconciliationProposals).where(
      and(
        eq(reconciliationProposals.householdId, householdId),
        inArray(reconciliationProposals.id, proposalIds)
      )
    ) as any)

    const batches = proposals.map((p: any) => {
      const updateTx1 = this.db.update(transactions)
        .set({ linkedTransactionId: p.suggestedTransactionId, reconciliationStatus: 'reconciled' })
        .where(eq(transactions.id, p.primaryTransactionId))

      const updateTx2 = this.db.update(transactions)
        .set({ linkedTransactionId: p.primaryTransactionId, reconciliationStatus: 'reconciled' })
        .where(eq(transactions.id, p.suggestedTransactionId))

      const updateProposal = this.db.update(reconciliationProposals)
        .set({ status: 'approved', updatedAt: now, approvedBy: userId || null, approvedAt: now })
        .where(eq(reconciliationProposals.id, p.id))

      return [updateTx1, updateTx2, updateProposal]
    })

    for (const batch of batches) {
      await this.db.batch(batch)
    }
  }

  async handleIndividualAction(householdId: string, proposalId: string, action: 'approve' | 'reject', userId?: string) {
    const now = new Date().toISOString()

    const proposal = (await this.db.select().from(reconciliationProposals).where(
      and(
        eq(reconciliationProposals.id, proposalId),
        eq(reconciliationProposals.householdId, householdId)
      )
    ).limit(1).then((res: any[]) => res[0]) as any)

    if (!proposal) throw new Error('Proposal not found')
    if (proposal.status !== 'pending') throw new Error('Proposal already processed')

    if (action === 'reject') {
      await this.db.update(reconciliationProposals)
        .set({ status: 'rejected', updatedAt: now })
        .where(eq(reconciliationProposals.id, proposalId))
      return { action: 'rejected', proposal }
    }

    await this.db.batch([
      this.db.update(transactions)
        .set({ linkedTransactionId: proposal.suggestedTransactionId, reconciliationStatus: 'reconciled' })
        .where(eq(transactions.id, proposal.primaryTransactionId)),
      this.db.update(transactions)
        .set({ linkedTransactionId: proposal.primaryTransactionId, reconciliationStatus: 'reconciled' })
        .where(eq(transactions.id, proposal.suggestedTransactionId)),
      this.db.update(reconciliationProposals)
        .set({ status: 'approved', updatedAt: now, approvedBy: userId || null, approvedAt: now })
        .where(eq(reconciliationProposals.id, proposalId)),
    ])

    return { action: 'approved', proposal }
  }

  async undoApproval(householdId: string, proposalId: string) {
    const now = new Date().toISOString()

    const proposal = (await this.db.select().from(reconciliationProposals).where(
      and(
        eq(reconciliationProposals.id, proposalId),
        eq(reconciliationProposals.householdId, householdId)
      )
    ).limit(1).then((res: any[]) => res[0]) as any)

    if (!proposal) throw new Error('Proposal not found')
    if (proposal.status !== 'approved') throw new Error('Only approved proposals can be undone')

    await this.db.batch([
      this.db.update(transactions)
        .set({ linkedTransactionId: null, reconciliationStatus: 'unreconciled' })
        .where(eq(transactions.id, proposal.primaryTransactionId)),
      this.db.update(transactions)
        .set({ linkedTransactionId: null, reconciliationStatus: 'unreconciled' })
        .where(eq(transactions.id, proposal.suggestedTransactionId)),
      this.db.update(reconciliationProposals)
        .set({ status: 'pending', updatedAt: now, approvedBy: null, approvedAt: null })
        .where(eq(reconciliationProposals.id, proposalId)),
    ])

    return { action: 'undone', proposal }
  }
}
