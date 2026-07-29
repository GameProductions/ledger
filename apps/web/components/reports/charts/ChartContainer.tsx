import React from 'react'
import { ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_THEME } from './chartTheme'

interface ChartContainerProps {
  title?: string
  subtitle?: string
  height?: number
  children: React.ReactNode
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ title, subtitle, height = 250, children }) => {
  return (
    <div className="space-y-2">
      {title && (
        <div>
          <div className="text-xs font-black tracking-widest text-white/50">{title}</div>
          {subtitle && <div className="text-[10px] font-medium text-white/30 mt-0.5">{subtitle}</div>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {children as any}
      </ResponsiveContainer>
    </div>
  )
}

export const ChartTooltip: React.FC<{
  active?: boolean
  payload?: any[]
  label?: string
  formatter?: (value: number) => string
}> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-deep border border-white/10 rounded-xl px-3 py-2 text-xs shadow-2xl shadow-black/50 space-y-1">
      {label && <div className="font-bold text-white/70">{label}</div>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-white/60">{entry.name}:</span>
          <span className="font-bold text-white">
            {formatter ? formatter(entry.value as number) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}
