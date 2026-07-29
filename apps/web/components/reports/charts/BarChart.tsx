import React from 'react'
import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { ChartContainer, ChartTooltip } from './ChartContainer'
import { CHART_THEME, colorForIndex } from './chartTheme'

interface BarSeries {
  dataKey: string
  name: string
  color?: string
}

interface BarChartProps {
  data: any[]
  series: BarSeries[]
  xKey?: string
  title?: string
  subtitle?: string
  height?: number
  stacked?: boolean
  layout?: 'horizontal' | 'vertical'
  colors?: string[]
  onClick?: (entry: any) => void
}

export const BarChart: React.FC<BarChartProps> = ({
  data, series, xKey = 'name', title, subtitle, height, stacked, layout = 'horizontal', colors, onClick,
}) => {
  const isVertical = layout === 'vertical'
  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <RechartsBar data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout={layout}
        onClick={onClick ? (e: any) => onClick(e?.activePayload?.[0]?.payload || e) : undefined}
      >
        <CartesianGrid stroke={CHART_THEME.grid.line.stroke} strokeDasharray={CHART_THEME.grid.line.strokeDasharray} />
        {isVertical ? (
          <>
            <XAxis type="number" tick={{ fill: CHART_THEME.textColor, fontSize: CHART_THEME.fontSize }} tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`} />
            <YAxis type="category" dataKey={xKey} tick={{ fill: CHART_THEME.textColor, fontSize: CHART_THEME.fontSize }} axisLine={false} tickLine={false} width={90} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fill: CHART_THEME.textColor, fontSize: CHART_THEME.fontSize }} axisLine={CHART_THEME.axis.domain.line} tickLine={false} />
            <YAxis tick={{ fill: CHART_THEME.textColor, fontSize: CHART_THEME.fontSize }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`} />
          </>
        )}
        <Tooltip content={<ChartTooltip formatter={(v) => `$${(v / 100).toFixed(2)}`} />} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', opacity: 0.6 }} />}
        {series.map((s, i) => (
          <Bar key={s.dataKey} dataKey={s.dataKey} name={s.name} fill={s.color || colorForIndex(i)} stackId={stacked ? 'stack' : undefined} radius={[4, 4, 0, 0]} maxBarSize={40} />
        ))}
      </RechartsBar>
    </ChartContainer>
  )
}
