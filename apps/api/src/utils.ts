import { Context } from 'hono'
import { Bindings, Variables } from './types'

export const logAudit = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>, 
  tableName: string, 
  recordId: string, 
  action: string, 
  oldData: any = null, 
  newData: any = null
) => {
  const id = crypto.randomUUID()
  const householdId = c.get('householdId') || 'ledger-main-001'
  const actorId = c.get('userId') || 'system'
  const impersonatorId = c.get('impersonatorId')
  const newValues = newData ? { ...newData } : {}
  if (impersonatorId) {
    (newValues as any)._impersonator_id = impersonatorId
  }

  await c.env.DB.prepare(
    'INSERT INTO audit_logs (id, household_id, actor_id, table_name, record_id, action, old_values_json, new_values_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, 
    householdId, 
    actorId, 
    tableName, 
    recordId, 
    action, 
    oldData ? JSON.stringify(oldData) : null, 
    Object.keys(newValues).length > 0 ? JSON.stringify(newValues) : null
  ).run()
}

export const encrypt = async (text: string, key: string) => {
  const encoder = new TextEncoder()
  const encodedKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key), { name: 'AES-GCM' }, false, ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, encodedKey, encoder.encode(text)
  )
  return `${Buffer.from(iv).toString('base64')}.${Buffer.from(new Uint8Array(encrypted)).toString('base64')}`
}

export const decrypt = async (encryptedData: string, key: string) => {
  try {
    const [ivBase64, contentBase64] = encryptedData.split('.')
    const encoder = new TextEncoder()
    const encodedKey = await crypto.subtle.importKey(
      'raw', encoder.encode(key), { name: 'AES-GCM' }, false, ['decrypt']
    )
    const iv = Buffer.from(ivBase64, 'base64')
    const content = Buffer.from(contentBase64, 'base64')
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, encodedKey, content
    )
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    return 'DECRYPTION_FAILED'
  }
}
