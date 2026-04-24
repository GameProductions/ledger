import { useState, useCallback, useEffect } from 'react';

/**
 * A custom hook to persist tab selection state in the URL query string.
 * This guarantees that page refreshes or external links restore the exact layout tab natively.
 * 
 * @param defaultTab The default tab key to fall back to if none is defined in the URL.
 * @param paramName The URL parameter key used to track this tab state.
 * @returns [currentTab, setTab]
 */
export function useTabState<T extends string>(defaultTab: T, paramName: string = 'tab'): [T, (tab: T) => void] {
  // Set up state from URL params
  const [activeTab, setActiveTab] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTab = searchParams.get(paramName) as T;
      return urlTab || defaultTab;
    }
    return defaultTab;
  });

  // Sync state upward to the browser's URL whenever it changes
  const setTab = useCallback((newTab: T) => {
    setActiveTab(newTab);
    
    // Perform a silent URL update so React Router doesn't accidentally trigger a full unmount
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set(paramName, newTab);
      window.history.replaceState({}, '', url.toString());
    }
  }, [paramName]);

  // Handle external navigational POP states (if the user clicks browser-back)
  useEffect(() => {
    const handlePopState = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlTab = searchParams.get(paramName) as T;
      if (urlTab && urlTab !== activeTab) {
        setActiveTab(urlTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [paramName, activeTab]);

  return [activeTab, setTab];
}
