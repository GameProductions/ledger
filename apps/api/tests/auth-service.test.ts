import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../services/auth.service'
import * as authUtils from '../auth-utils'
import * as index from '#/index'

// Mock VaultService class properly for vitest
const mockGetSecret = vi.fn();
vi.mock('../utils/vault.service', () => {
  return {
    VaultService: vi.fn().mockImplementation(function() {
      return {
        getSecret: mockGetSecret
      }
    })
  }
})

// Mock dependencies
vi.mock('#/index')
vi.mock('../auth-utils')

describe('AuthService - verify2FA', () => {
  let authService: AuthService
  let mockEnv: any
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockEnv = {
      ENCRYPTION_KEY: 'test-key',
      DB: {}
    }
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
    vi.mocked(index.getDb).mockReturnValue(mockDb)
    authService = new AuthService(mockEnv)
  })

  it('should verify valid recovery code', async () => {
    const user = { id: 'user-1' }
    const recoveryCode = 'ABCDEFGH'
    
    // Mock verifyBackupCode
    const verifyBackupCodeSpy = vi.spyOn(authService, 'verifyBackupCode').mockResolvedValue(true)

    const result = await authService.verify2FA(user, recoveryCode)
    expect(result).toEqual({ requires2FA: false })
    expect(verifyBackupCodeSpy).toHaveBeenCalledWith(user.id, recoveryCode)
  })

  it('should throw 401 if recovery code is invalid', async () => {
    const user = { id: 'user-1' }
    const invalidCode = 'INVALID1'
    
    vi.spyOn(authService, 'verifyBackupCode').mockResolvedValue(false)

    try {
      await authService.verify2FA(user, invalidCode)
      expect(true).toBe(false) // Should not reach here
    } catch (e: any) {
      expect(e.message).toBe('Invalid recovery code')
      expect(e.status).toBe(401)
    }
  })

  it('should return requires2FA: false if no code provided (legacy support)', async () => {
    const user = { id: 'user-1' }
    const result = await authService.verify2FA(user)
    expect(result).toEqual({ requires2FA: false })
  })
})
