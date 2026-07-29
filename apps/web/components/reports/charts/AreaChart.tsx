import React from 'react'
import { AreaChart as RechartsArea, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltip } from './ChartContainer'
import { CHART_THEME, colorForIndex } from './chartTheme'

interface AreaChartProps {
  data: any[]
  dataKey: string
  xKey?: string
  title?: string
  subtitle?: string
  height?: number
  color?: string
  gradient?: boolean
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data, dataKey, xKey = 'date', title, subtitle, height, color, gradient = true,
}) => {
  const fillColor = color || colorForIndex(0)
  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <RechartsArea data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART_THEME.grid.line.stroke} strokeDasharray={CHART_THEME.grid.line.strokeDasharray} />
        <XAxis dataKey={xKey} tick={{ fill: CHART_THEME.textColor, fontSize: CHART_THEME.fontSize }} axisLine={CHART_THEME.axis.domain.line} tickLine={false} />
        <YAxis tick={{ fill: CHART_THEME.textColor, fontSize: CHART_THEME.fontSize }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`} />
        <Tooltip content={<ChartTooltip formatter={(v) => `$${(v / 100).toFixed(2)}`} />} />
        {gradient ? (
          <Area type="monotone" dataKey={dataKey} stroke={fillColor} fill={`url(#gradient-${dataKey})`} strokeWidth={2} />
        ) : (
          <Area type="monotone" dataKey={dataKey} stroke={fillColor} fill="transparent" strokeWidth={2} />
        )}
      </RechartsArea>
    </ChartContainer>
  )
}
