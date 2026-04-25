import React from 'react'

const SeasonalAssets: React.FC = () => {
  const now = new Date()
  const month = now.getMonth() // 0-indexed (0 = Jan, 9 = Oct, 11 = Dec)
  const day = now.getDate()

  // 1. Spooky Mode (Oct 25 - Oct 31)
  const isSpooky = (month === 9 && day >= 25)
  
  // 2. Frost Mode (Dec 15 - Dec 31)
  const isFrost = (month === 11 && day >= 15)

  if (isSpooky) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          right: '2rem', 
          fontSize: '3rem', 
          pointerEvents: 'none', 
          zIndex: 5000,
          opacity: 0.8,
          filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.5))'
        }}
        className="pulse"
      >
        🎃
      </div>
    )
  }

  if (isFrost) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          top: '1rem', 
          right: '50%', 
          fontSize: '2rem', 
          pointerEvents: 'none', 
          zIndex: 5000,
          opacity: 0.6
        }}
        className="pulse"
      >
        ❄️
      </div>
    )
  }

  return null
}

export default SeasonalAssets
