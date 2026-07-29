import React from 'react'
import { Treemap as RechartsTreemap, Tooltip } from 'recharts'
import { ChartContainer } from './ChartContainer'
import { colorForIndex } from './chartTheme'

interface TreemapChartProps {
  data: any[]
  nameKey?: string
  valueKey?: string
  title?: string
  subtitle?: string
  height?: number
  onClick?: (entry: any) => void
}

const CustomizedContent: React.FC<any> = ({ root, depth, x, y, width, height, index, colors, name, value }) => {
  if (depth > 1) return null
  const fontSize = Math.min(Math.max(width / (name?.length || 1), 10), 14)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={colorForIndex(index)} fillOpacity={0.3} stroke="rgba(255,255,255,0.1)" strokeWidth={1} rx={4} />
      {width > 50 && height > 30 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={fontSize} fontWeight={700}>
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={10} fontWeight={600}>
            ${(value / 100).toLocaleString()}
          </text>
        </>
      )}
    </g>
  )
}

const TreemapTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-deep border border-white/10 rounded-xl px-3 py-2 text-xs shadow-2xl shadow-black/50">
      <div className="font-bold text-white">{d.name}</div>
      <div className="text-white/60">${(d.value / 100).toLocaleString()}</div>
    </div>
  )
}

export const TreemapChart: React.FC<TreemapChartProps> = ({ data, nameKey = 'name', valueKey = 'value', title, subtitle, height = 300, onClick }) => {
  return (
    <ChartContainer title={title} subtitle={subtitle} height={height}>
      <RechartsTreemap data={data} dataKey={valueKey} nameKey={nameKey} aspectRatio={4 / 3} stroke="transparent" fill="transparent"
        content={<CustomizedContent />}
        onClick={onClick ? (e: any) => onClick(e?.payload || e) : undefined}
      >
        <Tooltip content={<TreemapTooltip />} />
      </RechartsTreemap>
    </ChartContainer>
  )
}
