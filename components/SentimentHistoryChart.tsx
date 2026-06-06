'use client'

import { useState } from 'react'
import type { FearGreedPoint } from '@/lib/markets/sentiment'

const FRAMES: { id: string; days: number }[] = [
  { id: '7D', days: 7 },
  { id: '30D', days: 30 },
  { id: '90D', days: 90 },
  { id: '1Y', days: 365 },
]

const W = 760
const H = 220

export default function SentimentHistoryChart({ data }: { data: FearGreedPoint[] }) {
  const [frame, setFrame] = useState('30D')
  const days = FRAMES.find((f) => f.id === frame)?.days ?? 30
  const series = data.slice(-days)

  // SVG point geometry (only meaningful once we have ≥2 points; the < 2 case
  // renders the empty state instead, so step is never divided by zero there).
  const step = series.length > 1 ? W / (series.length - 1) : 0
  const points = series.map(
    (p, i) => `${(i * step).toFixed(1)},${(H - (p.value / 100) * H).toFixed(1)}`
  )
  const linePoints = points.join(' ')
  const areaPoints = `${linePoints} ${W},${H} 0,${H}`

  const chipBase = 'rounded-md px-2.5 py-1 text-[12px] font-bold'
  return (
    <div className="bg-surface border-line flex flex-col rounded-[10px] border p-5">
      <div className="mb-3 flex items-center">
        <div className="text-base font-extrabold text-gray-50">Fear &amp; Greed History</div>
        <div className="ml-auto flex gap-1.5" role="group" aria-label="Chart timeframe">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={frame === f.id}
              onClick={() => setFrame(f.id)}
              className={
                frame === f.id
                  ? `${chipBase} bg-fill text-gray-50`
                  : `${chipBase} text-ink-3 hover:text-ink-2`
              }
            >
              {f.id}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[200px] flex-1">
        {series.length < 2 ? (
          <p className="text-ink-3 py-16 text-center text-sm">History unavailable.</p>
        ) : (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0"
            aria-hidden="true"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((g) => (
              <line key={g} x1="0" y1={g * H} x2={W} y2={g * H} stroke="#1B232F" strokeWidth="1" />
            ))}
            <polygon fill="rgba(242,160,36,.09)" points={areaPoints} />
            <polyline fill="none" stroke="#F2A024" strokeWidth="2.5" points={linePoints} />
          </svg>
        )}
      </div>

      <div className="text-ink-3 mt-2.5 flex justify-between text-[11.5px] font-semibold">
        <span>{days >= 365 ? '1y ago' : `${days}d ago`}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
