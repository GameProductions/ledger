import React, { useState } from 'react'

const SmartInsights: React.FC<{ insights: string[] }> = ({ insights }) => {
  return (
    <section className="card" style={{ gridColumn: 'span 1', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.2rem' }}>💡</span>
        <h3 style={{ margin: 0 }}>Smart Insights</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {insights.map((insight, i) => (
          <div key={i} style={{ fontSize: '0.9rem', padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary)' }}>
            {insight}
          </div>
        ))}
      </div>
    </section>
  )
}

export default SmartInsights
