import { type KeyboardEvent } from 'react'

interface TrendDotPayload {
  label: string
  historyKey: string
}

interface TrendDotProps {
  cx?: number
  cy?: number
  stroke?: string
  payload?: TrendDotPayload
  selectedHistoryKey: string | null
  onSelect: (historyKey: string) => void
}

export default function SelectableTrendDot({ cx, cy, stroke, payload, selectedHistoryKey, onSelect }: TrendDotProps) {
  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
    return null
  }

  const isSelected = payload.historyKey === selectedHistoryKey
  const handleSelect = () => onSelect(payload.historyKey)
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect()
    }
  }

  return (
    <g
      className="photo-history-chart-dot"
      style={{ color: stroke ?? '#155eef' }}
      tabIndex={0}
      role="button"
      aria-label={`${payload.label} 기록 보기`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <circle cx={cx} cy={cy} r={12} fill="transparent" />
      <circle
        className="photo-history-chart-dot__mark"
        cx={cx}
        cy={cy}
        r={isSelected ? 5 : 3.5}
        fill={isSelected ? stroke ?? '#155eef' : '#ffffff'}
        stroke={stroke ?? '#155eef'}
        strokeWidth={2}
      />
    </g>
  )
}

