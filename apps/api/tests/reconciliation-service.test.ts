import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReconciliationService } from '../services/reconciliation.service'
import * as index from '#/index'

vi.mock('#/index')

describe('ReconciliationService', () => {
  let reconService: ReconciliationService
  let mockDb: any
  let mockEnv: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      batch: vi.fn().mockResolvedValue([]),
    }
    mockEnv = { DB: {} }
    reconService = new ReconciliationService(mockDb, mockEnv)
  })

  describe('applyRules', () => {
    it('should categorize transaction based on rule pattern', async () => {
      const householdId = 'h-1'
      const txId = 'tx-1'
      const categoryId = 'cat-1'
      
      mockDb.where.mockResolvedValueOnce([{ id: txId, description: 'Netflix Subscription', categoryId: null }])
      mockDb.where.mockResolvedValueOnce([{ id: 'rule-1', pattern: 'netflix', targetCategoryId: categoryId, visibility: 'private' }])
      
      await reconService.applyRules(householdId, [txId])
      
      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ categoryId }))
    })

    it('should auto-confirm if rule says so', async () => {
      const householdId = 'h-1'
      const txId = 'tx-1'
      
      mockDb.where.mockResolvedValueOnce([{ id: txId, description: 'Rent Payment', categoryId: null }])
      mockDb.where.mockResolvedValueOnce([{ id: 'rule-2', pattern: 'rent', autoConfirm: true, visibility: 'private' }])
      
      await reconService.applyRules(householdId, [txId])
      
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ reconciliationStatus: 'reconciled' }))
    })
  })

  describe('generateProposals', () => {
    it('should delegate to ReconciliationAgent', async () => {
      const householdId = 'h-1'
      const mockAgentStub = {
        reconcile: vi.fn().mockResolvedValue({ status: 'success', proposalsGenerated: 1 })
      }
      mockEnv.RECONCILIATION_AGENT = {
        idFromName: vi.fn().mockReturnValue('mock-id'),
        get: vi.fn().mockReturnValue(mockAgentStub)
      }
      
      const count = await reconService.generateProposals(householdId)
      
      expect(count).toBe(1)
      expect(mockEnv.RECONCILIATION_AGENT.get).toHaveBeenCalled()
      expect(mockAgentStub.reconcile).toHaveBeenCalledWith(householdId)
    })
  })
})
