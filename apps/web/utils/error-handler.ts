export const formatHumanError = (error: any, fallbackStr: string = 'An unexpected system error occurred') => {
  // If it's already a clean string
  if (typeof error === 'string') {
    if (error.includes('SQLITE_CONSTRAINT')) {
      return 'This value is already heavily bound to another record or inherently conflicts.'
    }
    return error
  }

  // Typical structured JSON error object (often { error: 'message' })
  const baseMessage = error?.error || error?.message || error?.name || fallbackStr

  const rawMessage = typeof baseMessage === 'string' ? baseMessage.toLowerCase() : ''

  // Fleet-wide constraint translation
  if (rawMessage.includes('UNIQUE constraint failed') || rawMessage.includes('sqlite_constraint')) {
    return 'This property is already taken by another account. Please select a distinct one.'
  }

  // Rate Limiting
  if (rawMessage.includes('rate limit') || rawMessage.includes('too many')) {
    return "You're taking actions a bit too quickly! Please wait a moment."
  }

  // Network offline or CORS
  if (rawMessage.includes('failed to fetch') || rawMessage.includes('network error')) {
    return "We couldn't reach the servers. Please check your internet connection."
  }

  // Permission boundary
  if (rawMessage.includes('unauthorized') || rawMessage.includes('unauthenticated')) {
    return "Your session has expired or you do not have permission to execute this."
  }
  
  if (rawMessage.includes('undefined')) {
    return "The system lost track of a required variable."
  }

  if (rawMessage.includes('not found') || rawMessage.includes('404')) {
    return "The item or route you are looking for has been moved or doesn't exist."
  }

  return baseMessage
}
