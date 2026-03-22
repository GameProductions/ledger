import React from 'react'

interface HealthScoreProps {
  score: number
}

const HealthScore: React.FC<HealthScoreProps> = ({ score }) => {
  const color = score > 80 ? 'var(--primary)' : score > 50 ? 'var(--secondary)' : '#ef4444'
  const radius = 35
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="health-score-gauge" style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto' }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <circle 
          cx="50" cy="50" r={radius} 
          fill="transparent" 
          stroke="rgba(255,255,255,0.05)" 
          strokeWidth="8" 
        />
        <circle 
          cx="50" cy="50" r={radius} 
          fill="transparent" 
          stroke={color} 
          strokeWidth="8" 
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', fontSize: '1.2rem' }}>
        {score}
      </div>
    </div>
  )
}

export default HealthScore
