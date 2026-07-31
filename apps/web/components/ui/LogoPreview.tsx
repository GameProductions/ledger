import React, { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface LogoPreviewProps {
  src?: string | null
  size?: number
  name?: string
  className?: string
}

export const LogoPreview: React.FC<LogoPreviewProps> = ({ src, size = 40, name, className = '' }) => {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div
        className={`rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {name ? (
          <span className="text-sm font-black italic text-white/30">{name.charAt(0).toUpperCase()}</span>
        ) : (
          <ImageOff size={size * 0.4} className="text-white/20" />
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={name || 'logo'}
        onError={() => setError(true)}
        className="w-full h-full object-cover"
      />
    </div>
  )
}
