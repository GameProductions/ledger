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
 * @deprecated EXTERNAL DATA LEAK PROTECTION (Alert #19)
 * This function previously sent sensitive financial data to quickchart.io.
 * It has been decommissioned to ensure zero information exposure.
 */
export const getLegacyExternalChartUrl = (type: 'pie' | 'bar', labels: string[], data: number[], title: string) => {
  console.warn(`[SECURITY_ENFORCEMENT] Blocked external chart request for: ${title}`);
  // Return a static placeholder that explains external charts are disabled for security
  return `https://placehold.co/600x400/1e1e1e/ffffff?text=Security+Notice:+External+Charts+Decommissioned`;
}

