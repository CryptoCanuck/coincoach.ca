import { formatUsd, formatCompactUsd } from '@/lib/markets/format'
import type { CoinDetail } from '@/lib/markets/coins'

const dash = '—'

function supply(n: number | null, symbol: string): string {
  if (n === null || !Number.isFinite(n) || n === 0) return dash
  return `${formatCompactUsd(n).replace('$', '')} ${symbol}`
}

export default function KeyStats({
  coin,
  volatilityPct,
}: {
  coin: CoinDetail
  volatilityPct: number | null
}) {
  const cells: [string, string][] = [
    ['Market Cap', coin.marketCap ? formatCompactUsd(coin.marketCap) : dash],
    ['24h Volume', coin.volume ? formatCompactUsd(coin.volume) : dash],
    ['Circulating Supply', supply(coin.circulatingSupply, coin.symbol)],
    ['Max Supply', supply(coin.maxSupply, coin.symbol)],
    ['All-Time High', coin.ath ? formatUsd(coin.ath) : dash],
    ['All-Time Low', coin.atl ? formatUsd(coin.atl) : dash],
    ['Rank', coin.rank !== null ? `#${coin.rank}` : dash],
    ['Volatility (30d)', volatilityPct === null ? dash : `${volatilityPct.toFixed(1)}%`],
  ]
  return (
    <div className="border-line bg-surface grid grid-cols-2 overflow-hidden rounded-[10px] border sm:grid-cols-4">
      {cells.map(([k, v]) => (
        <div key={k} className="border-line border-r border-b p-3.5 last:border-r-0">
          <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">{k}</div>
          <div className="mt-1 text-[15px] font-extrabold text-gray-50">{v}</div>
        </div>
      ))}
    </div>
  )
}
