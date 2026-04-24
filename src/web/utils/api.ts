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
