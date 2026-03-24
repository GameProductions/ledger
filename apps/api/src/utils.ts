import { Context } from 'hono'
import { Bindings, Variables } from './types'

export const logAudit = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>, 
  tableName: string, 
  recordId: string, 
  action: string, 
  oldData: any, 
  newData: any
) => {
  const actorId = c.get('userId') || 'system'
  const householdId = c.get('householdId') || 'h-1'
  const id = crypto.randomUUID()
  
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
    newData ? JSON.stringify(newData) : null
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
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`
}

export const decrypt = async (encryptedData: string, key: string) => {
  try {
    const [ivBase64, contentBase64] = encryptedData.split('.')
    const encoder = new TextEncoder()
    const encodedKey = await crypto.subtle.importKey(
      'raw', encoder.encode(key), { name: 'AES-GCM' }, false, ['decrypt']
    )
    const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)))
    const content = new Uint8Array(atob(contentBase64).split('').map(c => c.charCodeAt(0)))
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, encodedKey, content
    )
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    return 'DECRYPTION_FAILED'
  }
}
