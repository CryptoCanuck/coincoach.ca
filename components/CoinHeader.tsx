import CoinLogo from './CoinLogo'
import WatchlistButton from './WatchlistButton'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import type { CoinFull } from '@/lib/markets/coins'

export default function CoinHeader({ coin }: { coin: CoinFull }) {
  const change24h = coin.changes.h24
  const dir = changeDirection(change24h)
  const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
  return (
    <div className="border-line flex flex-wrap items-center gap-4 border-b py-6">
      <CoinLogo sym={coin.symbol} size={56} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[26px] font-black tracking-tight text-gray-50">{coin.name}</h1>
          <span className="text-ink-3 text-sm font-bold">{coin.symbol}</span>
          {coin.rank !== null && (
            <span className="bg-amber/15 text-amber rounded-md px-2 py-0.5 text-[11px] font-bold">
              Rank #{coin.rank}
            </span>
          )}
        </div>
        {coin.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {coin.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="border-line bg-fill-2 text-ink-2 rounded-md border px-2 py-0.5 text-[11.5px] font-semibold"
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="ml-auto text-right">
        <div className="text-[28px] font-black tracking-tight text-gray-50">
          {coin.price === null ? '—' : formatUsd(coin.price)}
        </div>
        {change24h !== null && (
          <div className={`mt-0.5 text-[15px] font-bold ${changeClass}`}>
            {formatPercent(change24h)} (24h)
          </div>
        )}
      </div>
      <div className="flex gap-2.5">
        <WatchlistButton coinId={coin.id} />
        <span className="bg-accent flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-extrabold text-[#3a2400]">
          <span className="h-[7px] w-[7px] rounded-full bg-[#3a2400]" />
          Ask about {coin.symbol}
        </span>
      </div>
    </div>
  )
}
