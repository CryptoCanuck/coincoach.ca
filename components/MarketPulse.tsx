import Gauge from './Gauge'
import StatCard from './StatCard'
import { getGlobalStats } from '@/lib/markets/global'
import { getFearGreed } from '@/lib/markets/sentiment'
import { formatCompactUsd, formatPercent } from '@/lib/markets/format'

export default async function MarketPulse() {
  const [stats, fng] = await Promise.all([getGlobalStats(), getFearGreed()])
  const dash = '—'
  return (
    <div className="bg-surface border-line grid overflow-hidden rounded-[10px] border md:grid-cols-[260px_1fr]">
      <div className="bg-fill-2 border-line border-b px-5 py-4 md:border-r md:border-b-0">
        <div className="mb-1 text-[15px] font-extrabold text-gray-50">Market Sentiment</div>
        <Gauge value={fng?.value ?? 50} label={fng?.label ?? 'Neutral'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Market Cap"
          value={stats ? formatCompactUsd(stats.totalMarketCap) : dash}
          sub={stats ? `${formatPercent(stats.marketCapChange24h)} (24h)` : undefined}
          up={(stats?.marketCapChange24h ?? 0) >= 0}
        />
        <StatCard label="24h Volume" value={stats ? formatCompactUsd(stats.totalVolume) : dash} />
        <StatCard
          label="BTC Dominance"
          value={stats ? `${stats.btcDominance.toFixed(1)}%` : dash}
        />
        <StatCard
          label="Active Coins"
          value={stats ? stats.activeCoins.toLocaleString('en-US') : dash}
        />
      </div>
    </div>
  )
}
