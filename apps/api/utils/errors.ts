import { Context } from 'hono'

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

  if (status >= 500) {
    console.error(`[CRITICAL_ERROR] [${traceId}] ${code}: ${message}`, { error, details })
  } else {
    console.warn(`[API_ERROR] [${traceId}] ${code}: ${message}`, { details })
  }

  const sanitizedDetails = isDev ? details : (status >= 500 ? { trace_id: traceId, note: 'Detailed logs available in management portal.' } : details)

  return c.json({
    success: false,
    error,
    code,
    message: isDev ? message : (status >= 500 ? 'An internal system error occurred.' : message),
    details: sanitizedDetails,
    trace_id: traceId
  }, status as any)
}
