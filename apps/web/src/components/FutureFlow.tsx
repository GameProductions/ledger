import { useApi } from '../hooks/useApi'

const FutureFlow: React.FC = () => {
  const { data: projection } = useApi('/api/data/analysis/forecast')

  return (
    <section className="card" style={{ gridColumn: 'span 2' }}>
      <h3 style={{ marginBottom: '1rem' }}>🔮 Future Flow (180-Day Projection)</h3>
      <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '5%', padding: '1rem 0' }}>
        {Array.isArray(projection) && projection.map((p: any) => {
          const height = Math.min(100, Math.max(10, (p.balanceCents / (projection[0]?.balanceCents || 1)) * 100))
          return (
            <div key={p.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '100%', background: 'linear-gradient(to top, var(--primary), transparent)', height: `${height}%`, borderRadius: '4px 4px 0 0', opacity: 0.6 }}></div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{p.date.slice(5)}</div>
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Estimated balance based on recurring fixed costs and income trends.</p>
    </section>
  )
}

export default FutureFlow
