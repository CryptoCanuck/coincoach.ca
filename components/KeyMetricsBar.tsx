import { formatUsd, formatCompactUsd } from '@/lib/markets/format'
import SectionHeading from './SectionHeading'
import type { CoinFull } from '@/lib/markets/coins'

const dash = '—'

// The minimal slice of CoinFull this strip needs. Accepting the sub-shape (not
// the whole CoinFull) keeps the contract narrow and lets the page pass `coin`
// directly (CoinFull structurally satisfies this).
export interface KeyMetricsBarProps {
  coin: Pick<
    CoinFull,
    | 'symbol'
    | 'marketCap'
    | 'fdv'
    | 'volume'
    | 'circulatingSupply'
    | 'maxSupply'
    | 'high24h'
    | 'low24h'
  >
}

// A finite, non-zero number is "present"; null/0/NaN render as the em dash.
function num(n: number | null): number | null {
  return n !== null && Number.isFinite(n) && n !== 0 ? n : null
}

// Compact token amount (e.g. "20.04M BTC"), reusing the compact-USD grouping
// then stripping the leading "$" since this is a coin quantity, not a price.
function supply(n: number | null, symbol: string): string {
  const v = num(n)
  if (v === null) return dash
  return `${formatCompactUsd(v).replace('$', '')} ${symbol}`
}

export default function KeyMetricsBar({ coin }: KeyMetricsBarProps) {
  const marketCap = num(coin.marketCap)
  const fdv = num(coin.fdv)
  const volume = num(coin.volume)
  const circulating = num(coin.circulatingSupply)
  const max = num(coin.maxSupply)
  const high = num(coin.high24h)
  const low = num(coin.low24h)

  // Graceful: with no market metrics at all the page hides the whole section.
  if (
    marketCap === null &&
    fdv === null &&
    volume === null &&
    circulating === null &&
    high === null &&
    low === null
  ) {
    return null
  }

  // Circulating supply shows "% of max" only when a max supply exists.
  const circPct =
    circulating !== null && max !== null && max > 0
      ? `${((circulating / max) * 100).toFixed(1)}% of max`
      : null

  const cells: { label: string; value: string; sub?: string }[] = [
    { label: 'Market Cap', value: marketCap !== null ? formatCompactUsd(marketCap) : dash },
    { label: 'FDV', value: fdv !== null ? formatCompactUsd(fdv) : dash },
    { label: '24h Volume', value: volume !== null ? formatCompactUsd(volume) : dash },
    {
      label: 'Circulating Supply',
      value: supply(circulating, coin.symbol),
      sub: circPct ?? undefined,
    },
    { label: '24h High', value: high !== null ? formatUsd(high) : dash },
    { label: '24h Low', value: low !== null ? formatUsd(low) : dash },
  ]

  return (
    <div>
      <SectionHeading title="Key Metrics" />
      <div className="border-line bg-surface grid grid-cols-2 overflow-hidden rounded-[10px] border sm:grid-cols-3 lg:grid-cols-6">
        {cells.map((c) => (
          <div key={c.label} className="border-line border-r border-b p-3.5 last:border-r-0">
            <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">
              {c.label}
            </div>
            <div className="mt-1 text-[15px] font-extrabold text-gray-50">{c.value}</div>
            {c.sub && <div className="text-ink-3 mt-0.5 text-[12px] font-semibold">{c.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
