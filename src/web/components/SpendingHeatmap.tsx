import React from 'react'

const SpendingHeatmap: React.FC<{ transactions: any[] }> = ({ transactions }) => {
  // Generate a 7x4 grid for the last 28 days
  const days = Array.from({ length: 28 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (27 - i))
    const dateStr = date.toISOString().split('T')[0]
    const amount = (transactions || [])
      .filter(t => t.transactionDate.startsWith(dateStr))
      .reduce((sum, t) => sum + t.amountCents, 0)
    return { date: dateStr, amount }
  })

  const getIntensity = (amount: number) => {
    if (amount === 0) return 'rgba(255,255,255,0.03)'
    if (amount < 5000) return 'rgba(16, 185, 129, 0.2)'
    if (amount < 20000) return 'rgba(16, 185, 129, 0.5)'
    return 'rgba(16, 185, 129, 0.9)'
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map((d, i) => (
          <div 
            key={i} 
            title={`${d.date}: $${(d.amount/100).toFixed(2)}`}
            style={{ 
              aspectRatio: '1/1', 
              background: getIntensity(d.amount), 
              borderRadius: '2px',
              transition: 'transform 0.2s'
            }} 
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
        <span>28 Days Ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}

export default SpendingHeatmap
