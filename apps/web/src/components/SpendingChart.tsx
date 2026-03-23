import React from 'react'

interface SpendingChartProps {
  data: any[]
}

const SpendingChart: React.FC<SpendingChartProps> = ({ data }) => {
  // Simple SVG Line Chart (Implementation)
  const width = 300
  const height = 100
  const padding = 10
  
  if (!data || data.length === 0) return <div style={{ height, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No trend data yet</div>

  const maxAmount = Math.max(...data.map(d => d.amount_cents), 100000)
  
  const points = data.slice(-10).map((d, i) => {
    const x = (i / 9) * (width - 2 * padding) + padding
    const y = height - ((d.amount_cents / maxAmount) * (height - 2 * padding)) - padding
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="spending-chart" style={{ marginTop: '1rem', width: '100%', overflow: 'hidden' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path 
          d={`M ${padding},${height} L ${points} L ${width - padding},${height} Z`} 
          fill="url(#chartGradient)"
        />
        <polyline 
          fill="none" 
          stroke="var(--primary)" 
          strokeWidth="2" 
          points={points} 
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export default SpendingChart
