import { useEffect, useState } from 'react'

const LEVEL_COLOR: Record<string, string> = {
  SAFE: '#2DD4BF',
  SUSPICIOUS: '#F5B942',
  HIGH_RISK: '#F0673A',
  BLOCK: '#E5484D',
}

const LEVEL_LABEL: Record<string, string> = {
  SAFE: 'Safe to Proceed',
  SUSPICIOUS: 'Suspicious',
  HIGH_RISK: 'High Risk',
  BLOCK: 'Block Payment',
}

export default function RiskGauge({
  score,
  level,
  size = 220,
}: {
  score: number
  level: string
  size?: number
}) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 60)
    return () => clearTimeout(t)
  }, [score])

  const color = LEVEL_COLOR[level] ?? '#5C6A8C'
  const radius = size / 2 - 18
  const circumference = Math.PI * radius // half-circle arc (0-180deg)
  const offset = circumference * (1 - animated / 100)
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
        {/* track */}
        <path
          d={`M 18 ${cy} A ${radius} ${radius} 0 0 1 ${size - 18} ${cy}`}
          fill="none"
          stroke="#1B2740"
          strokeWidth={14}
          strokeLinecap="round"
        />
        {/* band ticks at 30 / 60 / 85 */}
        {[30, 60, 85].map((tick) => {
          const angle = Math.PI * (1 - tick / 100)
          const x1 = cx + (radius - 10) * Math.cos(angle)
          const y1 = cy - (radius - 10) * Math.sin(angle)
          const x2 = cx + (radius + 10) * Math.cos(angle)
          const y2 = cy - (radius + 10) * Math.sin(angle)
          return (
            <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2A3A5A" strokeWidth={2} />
          )
        })}
        {/* value arc */}
        <path
          d={`M 18 ${cy} A ${radius} ${radius} 0 0 1 ${size - 18} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1), stroke 400ms' }}
        />
        {/* needle */}
        {(() => {
          const angle = Math.PI * (1 - animated / 100)
          const nx = cx + (radius - 2) * Math.cos(angle)
          const ny = cy - (radius - 2) * Math.sin(angle)
          return (
            <g style={{ transition: 'all 900ms cubic-bezier(0.16,1,0.3,1)' }}>
              <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth={2} opacity={0.9} />
              <circle cx={cx} cy={cy} r={5} fill={color} />
            </g>
          )
        })()}
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          className="font-mono"
          fontSize={size * 0.19}
          fontWeight={600}
          fill="#E8ECF6"
        >
          {animated}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="font-mono" fontSize={11} fill="#5C6A8C">
          RISK SCORE / 100
        </text>
      </svg>
      <div
        className="mt-1 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wide"
        style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}55` }}
      >
        {LEVEL_LABEL[level] ?? level}
      </div>
    </div>
  )
}
