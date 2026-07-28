import React, { useState } from 'react'

interface ProviderLogoProps {
  url?: string | null
  name?: string
  size?: number
  className?: string
}

export const ProviderLogo: React.FC<ProviderLogoProps> = ({ url, name, size = 24, className = '' }) => {
  const [failed, setFailed] = useState(false)

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name || ''}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    )
  }

  const initials = name
    ? name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div
      className={`rounded-full flex items-center justify-center font-black flex-shrink-0 bg-white/10 text-white/60 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={name || ''}
    >
      {initials}
    </div>
  )
}
