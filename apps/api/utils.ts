import { Context } from 'hono'
import { Bindings, Variables } from './types'
import { getDb } from '#/index'
import { auditLogs, adminAuditLogs } from '#/schema'
import { encryptData, decryptData, hashToken as securityHashToken } from './utils/security'

export { logAudit } from './utils/audit'

export const encrypt = async (text: string, key: string) => {
  return await encryptData(text, key)
}

export const decrypt = async (encryptedData: string, key: string) => {
  try {
    return await decryptData(encryptedData, key)
  } catch (e) {
    return 'DECRYPTION_FAILED'
  }
}

export const hashToken = async (token: string) => {
  return await securityHashToken(token)
}


export const apiError = (
  c: Context, 
  error: string, 
  code: string, 
  message: string, 
  status: number = 400, 
  details: any = null
) => {
  const isDev = c.env.ENVIRONMENT === 'development' || c.env.DEV === true || (c.env as any).isDev
  const traceId = crypto.randomUUID()

  // FORENSIC LOGGING: Always log the full error details to the console/logs
  if (status >= 500) {
    console.error(`[CRITICAL_ERROR] [${traceId}] ${code}: ${message}`, { error, details })
  } else {
    console.warn(`[API_ERROR] [${traceId}] ${code}: ${message}`, { details })
  }

  // PRODUCTION MASKING: Don't leak raw internal error objects to clients
  const sanitizedDetails = isDev ? details : (status >= 500 ? { traceId: traceId, note: 'Detailed logs available in management portal.' } : details)

  return c.json({
    success: false,
    error,
    code,
    message: isDev ? message : (status >= 500 ? 'An internal system error occurred.' : message),
    details: sanitizedDetails,
    traceId: traceId
  }, status as any)
}
