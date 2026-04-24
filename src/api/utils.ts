import { Context } from 'hono'
import { Bindings, Variables } from './types'
import { getDb } from './db'
import { auditLogs } from './db/schema'

export const logAudit = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>, 
  targetType: string, 
  recordId: string, 
  action: string, 
  oldValues: any = null, 
  newValues: any = null,
  metadata: any = null
) => {
  const householdId = c.get('householdId') || 'ledger-main-001'
  const actorId = c.get('userId') || 'system'
  const impersonatorId = c.get('impersonatorId')
  
  // Request Logging: Extracting metadata for audit trails
  const ipAddress = c.req.header('cf-connecting-ip') || 
                    c.req.header('CF-Connecting-IP') || 
                    c.req.header('x-forwarded-for') || 
                    c.req.header('x-real-ip') || 
                    '0.0.0.0';
  
  const userAgent = c.req.header('user-agent') || 
                    c.req.header('User-Agent') || 
                    'Unknown-UA';
  
  const finalNewValues = newValues ? { ...newValues } : {}
  if (impersonatorId) {
    (finalNewValues as any)._impersonator_id = impersonatorId
  }

  const db = getDb(c.env)
  await db.insert(auditLogs).values({
    householdId,
    actorId,
    ipAddress,
    userAgent,
    action,
    severity: action.includes('CRITICAL') || action.includes('ADMIN') || action.includes('DELETE') ? 'CRITICAL' : 'INFO',
    targetType,
    recordId,
    oldValuesJson: oldValues ? JSON.stringify(oldValues) : '{}',
    newValuesJson: Object.keys(finalNewValues).length > 0 ? JSON.stringify(finalNewValues) : '{}',
    metadataJson: metadata ? JSON.stringify(metadata) : '{}',
  }).catch(e => console.error('[AUDIT_FAILURE]', e));
}

export const encrypt = async (text: string, key: string) => {
  const encoder = new TextEncoder()
  
  // FORENSIC HARDENING: Derive a strong key from the secret using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(key), 'PBKDF2', false, ['deriveKey']
  )
  const pbkdf2Key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('ledger-crypto-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, pbkdf2Key, encoder.encode(text)
  )
  return `${Buffer.from(iv).toString('base64')}.${Buffer.from(new Uint8Array(encrypted)).toString('base64')}`
}

export const decrypt = async (encryptedData: string, key: string) => {
  try {
    const [ivBase64, contentBase64] = encryptedData.split('.')
    const encoder = new TextEncoder()
    
    // FORENSIC HARDENING: Derive the same key from the secret using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(key), 'PBKDF2', false, ['deriveKey']
    )
    const pbkdf2Key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: encoder.encode('ledger-crypto-v1'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    const iv = Buffer.from(ivBase64, 'base64')
    const content = Buffer.from(contentBase64, 'base64')
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, pbkdf2Key, content
    )
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    return 'DECRYPTION_FAILED'
  }
}


export const hashToken = async (token: string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
