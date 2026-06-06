import CoinLogo from './CoinLogo'
import WatchlistButton from './WatchlistButton'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import type { CoinDetail } from '@/lib/markets/coins'

export default function CoinHeader({ coin }: { coin: CoinDetail }) {
  const dir = changeDirection(coin.change24h)
  const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
  return (
    <div className="border-line flex flex-wrap items-center gap-4 border-b py-6">
      <CoinLogo sym={coin.symbol} size={56} />
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-[26px] font-black tracking-tight text-gray-50">{coin.name}</h1>
          <span className="text-ink-3 text-sm font-bold">{coin.symbol}</span>
          {coin.rank !== null && (
            <span className="bg-amber/15 text-amber rounded-md px-2 py-0.5 text-[11px] font-bold">
              Rank #{coin.rank}
            </span>
          )}
        </div>
        {coin.categories.length > 0 && (
          <div className="text-ink-3 mt-1 text-[12.5px] font-semibold">
            {coin.categories.slice(0, 2).join(' · ')}
          </div>
        )}
      </div>
      <div className="ml-auto text-right">
        <div className="text-[28px] font-black tracking-tight text-gray-50">
          {formatUsd(coin.price)}
        </div>
        <div className={`mt-0.5 text-[15px] font-bold ${changeClass}`}>
          {formatPercent(coin.change24h)} (24h)
        </div>
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
