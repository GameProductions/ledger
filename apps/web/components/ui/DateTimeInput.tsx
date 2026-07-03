import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface DateTimeInputProps {
  /** ISO date string ("YYYY-MM-DD") or datetime-local string ("YYYY-MM-DDTHH:MM") */
  value: string
  onChange: (value: string) => void
  className?: string
  required?: boolean
}

/** Splits a stored value into its date and time parts */
const splitValue = (v: string): { date: string; time: string } => {
  if (!v) return { date: '', time: '' }
  const parts = v.split('T')
  return { date: parts[0] ?? '', time: parts[1] ?? '' }
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  className = '',
  required
}) => {
  const [date, setDate] = useState(splitValue(value).date)
  const [time, setTime] = useState(splitValue(value).time)
  const [showTime, setShowTime] = useState(!!splitValue(value).time)

  // Sync internal state when the external value changes
  useEffect(() => {
    const parts = splitValue(value)
    setDate(parts.date)
    setTime(parts.time)
    setShowTime(!!parts.time)
  }, [value])

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    onChange(time && showTime ? `${newDate}T${time}` : newDate)
  }

  const handleTimeChange = (newTime: string) => {
    setTime(newTime)
    onChange(date ? `${date}T${newTime}` : newTime)
  }

  const handleToggleTime = () => {
    if (showTime) {
      // Removing time — collapse back to date-only
      setShowTime(false)
      setTime('')
      if (date) onChange(date)
    } else {
      setShowTime(true)
    }
  }

  const baseInput = `bg-black/60 border border-white/10 rounded-xl p-2 text-sm text-white focus:border-blue-400/50 outline-none ${className}`

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={e => handleDateChange(e.target.value)}
          required={required}
          className={`flex-1 ${baseInput}`}
        />
        <button
          type="button"
          onClick={handleToggleTime}
          title={showTime ? 'Remove time' : 'Add specific time'}
          className={`p-2 rounded-lg border transition-colors flex-shrink-0 ${
            showTime
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
              : 'bg-white/5 border-white/10 text-secondary hover:text-white hover:border-white/30'
          }`}
        >
          <Clock size={14} />
        </button>
      </div>
      {showTime && (
        <input
          type="time"
          value={time}
          onChange={e => handleTimeChange(e.target.value)}
          className={`w-full ${baseInput}`}
          placeholder="HH:MM (optional)"
        />
      )}
      {(date || time) && (
        <p className="text-[10px] text-secondary/60">
          {date && !showTime && `Date: ${date}`}
          {date && showTime && time && `Scheduled: ${date} at ${time}`}
          {date && showTime && !time && `Date: ${date} — select a time above`}
        </p>
      )}
    </div>
  )
}
