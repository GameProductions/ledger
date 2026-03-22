import React from 'react'

interface CalendarProps {
  transactions: any[]
}

const Calendar: React.FC<CalendarProps> = ({ transactions }) => {
  // Simple 1-month calendar for March 2026 (YOLO mode)
  const daysInMonth = 31
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  
  const getTransactionsForDay = (day: number) => {
    return transactions.filter(tx => {
      const date = new Date(tx.transaction_date)
      return date.getDate() === day && date.getMonth() === 2 // March
    })
  }

  return (
    <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
        <div key={d} style={{ textAlign: 'center', fontWeight: '700', color: 'var(--text-secondary)', padding: '0.5rem' }}>{d}</div>
      ))}
      
      {/* Empty cells for padding March 1st (starts on Sunday in 2026) */}
      {days.map(day => {
        const dayTxs = getTransactionsForDay(day)
        return (
          <div key={day} className="card" style={{ minHeight: '80px', padding: '0.4rem', fontSize: '0.8rem', background: dayTxs.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)' }}>
            <div style={{ marginBottom: '0.3rem', opacity: 0.6 }}>{day}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {dayTxs.map((tx: any) => (
                <div key={tx.id} style={{ fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', background: 'var(--primary)', padding: '0.1rem 0.3rem', borderRadius: '0.2rem' }}>
                  ${(tx.amount_cents / 100).toFixed(0)} {tx.description}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Calendar
