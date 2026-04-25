/**
 * LEDGER Chart Identity Engine
 * Returns a standardized Chart.js configuration object.
 * FORENSIC HARDENING: Avoid external rendering for sensitive data.
 */
export const getChartConfig = (type: 'pie' | 'bar', labels: string[], data: number[], title: string) => {
  return {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: title,
        data: data,
        backgroundColor: [
          '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: title, color: '#fff' },
        legend: { labels: { color: '#fff' } }
      }
    }
  }
}

/**
 * @deprecated Use getChartConfig and render client-side.
 * This sends sensitive financial data to a 3rd party (quickchart.io).
 * Only use for external integrations (Discord) where client-side rendering is impossible.
 */
export const getLegacyExternalChartUrl = (type: 'pie' | 'bar', labels: string[], data: number[], title: string) => {
  const config = getChartConfig(type, labels, data, title)
  // Ensure we use the old QuickChart format for the title/legend if needed, 
  // or just pass the config. QuickChart accepts standard Chart.js v2/v3 configs.
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&bg=%231e1e1e`
}

