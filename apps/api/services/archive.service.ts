import { Bindings } from '../types'

/**
 * Archive Service
 * Handles the migration of high-volume data (Audit Logs, Old Transactions) 
 * to Cloudflare R2 to keep the D1 database lean.
 */
export class ArchiveService {
  constructor(private env: Bindings) {}

  /**
   * Archive a record to R2
   * @param namespace The category (e.g., 'audit_logs')
   * @param id The unique identifier
   * @param data The JSON-serializable data
   */
  async archive(namespace: string, id: string, data: any) {
    if (!this.env.STORAGE_BUCKET) {
      console.warn('[Archive] STORAGE_BUCKET not bound. Archive skipped.')
      return
    }

    const key = `${namespace}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${id}.json`
    const body = JSON.stringify(data)

    try {
      await this.env.STORAGE_BUCKET.put(key, body, {
        httpMetadata: { contentType: 'application/json' },
        customMetadata: { archivedAt: new Date().toISOString() }
      })
      return key
    } catch (e) {
      console.error(`[Archive Failure] ${key}`, e)
      throw e
    }
  }

  /**
   * Retrieve an archived record from R2
   */
  async get(key: string) {
    if (!this.env.STORAGE_BUCKET) return null
    const obj = await this.env.STORAGE_BUCKET.get(key)
    if (!obj) return null
    return await obj.json()
  }
}
