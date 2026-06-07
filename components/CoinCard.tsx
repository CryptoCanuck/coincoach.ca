'use client'

import { pickCoin } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'
import { useCoinData } from './CoinDataProvider'

// Inline live-price card for a coin referenced in the article body:
//   <CoinCard id="bitcoin" />
// The id must be listed in the post's `coins:` frontmatter. Renders nothing if
// the coin isn't in the provided data (missing id or market data unavailable).
export default function CoinCard({ id }: { id: string }) {
  const coin = pickCoin(useCoinData(), id)
  if (!coin) return null
  const dir = changeDirection(coin.change24h)
  const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
  return (
    <div className="not-prose bg-surface border-line my-7 flex items-center gap-4 rounded-[10px] border px-[18px] py-4">
      <CoinLogo sym={coin.symbol} size={40} />
      <div>
        <div className="text-[15px] font-extrabold text-gray-100">
          {coin.name} · {coin.symbol}
        </div>
        <div className="text-ink-3 text-[12.5px] font-semibold">
          Live price referenced in this article
        </div>
      </div>
      <div className="ml-auto text-right">
        <div className="text-xl font-black text-gray-50">{formatUsd(coin.price)}</div>
        <div className={`text-[13px] font-bold ${changeClass}`}>
          {formatPercent(coin.change24h)} (24h)
        </div>
      </div>
    </div>
  )
}
