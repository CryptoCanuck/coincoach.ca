import SectionHeading from './SectionHeading'
import { formatPercent, changeDirection } from '@/lib/markets/format'
import type { PriceChanges } from '@/lib/markets/coins'

// Presentational server component (spec Track 2, section 4 — "Price
// performance"): a full-width grid of signed, color-coded % price changes over
// the windows the collector stores on coin_markets_latest. Data is passed in
// already-typed; this module never fetches.
export interface PricePerformanceProps {
  changes: PriceChanges
}

// Window label → the PriceChanges field that holds it, in display order.
const WINDOWS: [label: string, key: keyof PriceChanges][] = [
  ['1H', 'h1'],
  ['24H', 'h24'],
  ['7D', 'd7'],
  ['30D', 'd30'],
  ['1Y', 'y1'],
]

export default function PricePerformance({ changes }: PricePerformanceProps) {
  // Keep only windows we actually have a value for — null cells are omitted
  // (spec: "Omit a cell whose value is null").
  const cells = WINDOWS.map(([label, key]) => [label, changes?.[key] ?? null] as const).filter(
    (c): c is [string, number] => c[1] !== null
  )

  // Graceful: no populated windows → render nothing so the page hides the
  // section.
  if (cells.length === 0) return null

  return (
    <div>
      <SectionHeading title="Price Performance" barColor="var(--color-blue)" />
      <div className="border-line bg-surface grid grid-cols-2 overflow-hidden rounded-[10px] border sm:grid-cols-5">
        {cells.map(([label, value]) => {
          const dir = changeDirection(value)
          const valueClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
          return (
            <div key={label} className="border-line border-r border-b p-3.5 last:border-r-0">
              <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">
                {label}
              </div>
              <div className={`mt-1 text-[15px] font-extrabold ${valueClass}`}>
                {formatPercent(value)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
