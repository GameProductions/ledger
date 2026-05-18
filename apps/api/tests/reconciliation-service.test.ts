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
    mockEnv = { 
      DB: {},
      RULE_AGENT: {
        idFromName: vi.fn().mockReturnValue('mock-rule-id'),
        get: vi.fn().mockReturnValue({
          applyRules: vi.fn().mockResolvedValue(undefined)
        })
      },
      RECONCILIATION_AGENT: {
        idFromName: vi.fn().mockReturnValue('mock-recon-id'),
        get: vi.fn().mockReturnValue({
          reconcile: vi.fn().mockResolvedValue({ proposalsGenerated: 0 })
        })
      }
    }
    reconService = new ReconciliationService(mockDb, mockEnv)
  })

  describe('applyRules', () => {
    it('should delegate to RuleAgent', async () => {
      const householdId = 'h-1'
      const txIds = ['tx-1', 'tx-2']
      
      const agent = mockEnv.RULE_AGENT.get('mock-rule-id')
      
      await reconService.applyRules(householdId, txIds)
      
      expect(mockEnv.RULE_AGENT.idFromName).toHaveBeenCalledWith(householdId)
      expect(agent.applyRules).toHaveBeenCalledWith(householdId, txIds)
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
      
      const count = (await reconService.generateProposals(householdId) as any)
      
      expect(count).toBe(1)
      expect(mockEnv.RECONCILIATION_AGENT.get).toHaveBeenCalled()
      expect(mockAgentStub.reconcile).toHaveBeenCalledWith(householdId)
    })
  })
})
