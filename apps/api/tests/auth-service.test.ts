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

  it('should return requires2FA if user has TOTP credentials but no code provided', async () => {
    const user = { id: 'user-1' }
    mockDb.where.mockResolvedValueOnce([{ count: 1 }]) // Count check
    
    const result = await authService.verify2FA(user)
    expect(result).toEqual({ requires2FA: true })
  })

  it('should verify valid TOTP code', async () => {
    const user = { id: 'user-1' }
    const totpCode = '123456'
    
    mockDb.where.mockResolvedValueOnce([{ count: 1 }]) // Count check
    mockDb.where.mockResolvedValueOnce([{ id: 'totp-1', secret: '[VAULTED]' }]) // Fetch secrets
    mockGetSecret.mockResolvedValue('real-secret')
    vi.mocked(authUtils.verifyTOTP).mockResolvedValue(true)

    const result = await authService.verify2FA(user, totpCode)
    expect(result).toEqual({ requires2FA: false })
    expect(authUtils.verifyTOTP).toHaveBeenCalledWith('real-secret', totpCode)
  })

  it('should fallback to backup code if TOTP fails', async () => {
    const user = { id: 'user-1' }
    const backupCode = 'ABCDEFGH' // 8 chars
    
    mockDb.where.mockResolvedValueOnce([{ count: 1 }]) // Count check
    mockDb.where.mockResolvedValueOnce([{ id: 'totp-1', secret: '[VAULTED]' }]) // Fetch secrets
    mockGetSecret.mockResolvedValue(null)
    vi.mocked(authUtils.verifyTOTP).mockResolvedValue(false)
    
    // Mock verifyBackupCode
    const verifyBackupCodeSpy = vi.spyOn(authService, 'verifyBackupCode').mockResolvedValue(true)

    const result = await authService.verify2FA(user, backupCode)
    expect(result).toEqual({ requires2FA: false })
    expect(verifyBackupCodeSpy).toHaveBeenCalledWith(user.id, backupCode)
  })

  it('should throw 401 if both TOTP and backup code fail', async () => {
    const user = { id: 'user-1' }
    const invalidCode = 'INVALID1'
    
    mockDb.where.mockResolvedValueOnce([{ count: 1 }]) // Count check
    mockDb.where.mockResolvedValueOnce([{ id: 'totp-1', secret: '[VAULTED]' }]) // Fetch secrets
    mockGetSecret.mockResolvedValue(null)
    vi.mocked(authUtils.verifyTOTP).mockResolvedValue(false)
    
    vi.spyOn(authService, 'verifyBackupCode').mockResolvedValue(false)

    try {
      await authService.verify2FA(user, invalidCode)
      expect(true).toBe(false) // Should not reach here
    } catch (e: any) {
      expect(e.message).toBe('Invalid 2FA code')
      expect(e.status).toBe(401)
    }
  })
})
