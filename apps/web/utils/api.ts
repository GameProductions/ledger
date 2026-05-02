/**
 * Utility to safely retrieve the API URL from environment variables.
 * Handles the case where VITE_API_URL might be set to the string "undefined" or not defined.
 */
export const getApiUrl = (): string => {
  const rawUrl = import.meta.env.VITE_API_URL;
  if (!rawUrl || rawUrl === 'undefined') {
    return '';
  }
  return rawUrl.replace(/\/$/, '');
};

/**
 * Standard fetch wrapper for authenticated API requests.
 */
export const secureRequest = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('ledger_token');
  const householdId = localStorage.getItem('ledger_household_id');
  const apiUrl = getApiUrl();

  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (householdId) headers.set('x-household-id', householdId);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Global handling for auth errors can be added here if needed, 
    // but usually handled by AuthContext/useApi hook.
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `Request failed with status ${response.status}`);
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }

  return response;
};
