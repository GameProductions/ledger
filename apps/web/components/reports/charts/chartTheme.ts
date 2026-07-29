export const CHART_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#d946ef', '#eab308', '#22c55e', '#0ea5e9',
]

export const CHART_THEME = {
  background: 'transparent',
  textColor: 'rgba(255,255,255,0.6)',
  fontSize: 11,
  axis: {
    domain: { line: { stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 } },
    ticks: { line: { stroke: 'rgba(255,255,255,0.05)' } },
  },
  grid: { line: { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '3 3' } },
  tooltip: {
    container: {
      background: '#111',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '10px 14px',
      fontSize: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    },
  },
}

export function colorForIndex(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}
