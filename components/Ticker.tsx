import { getTopCoins } from '@/lib/markets/coingecko'
import type { Coin } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'

function TickerItem({ c }: { c: Coin }) {
  const dir = changeDirection(c.change24h)
  const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
  return (
    <span className="mr-6 flex shrink-0 items-center gap-2 text-[12.5px] font-semibold whitespace-nowrap text-gray-300">
      <CoinLogo sym={c.symbol} size={16} />
      <span className="font-bold text-gray-400">{c.symbol}</span>
      <span>{formatUsd(c.price)}</span>
      <span className={`text-xs ${changeClass}`}>{formatPercent(c.change24h)}</span>
    </span>
  )
}

export default async function Ticker() {
  const coins = await getTopCoins()
  if (coins.length === 0) return null
  return (
    <div className="bg-ticker border-line border-b">
      <div className="mx-auto flex h-[38px] max-w-[1440px] items-center gap-6 overflow-hidden px-5 sm:px-10">
        <span className="text-accent shrink-0 text-[12.5px] font-extrabold tracking-wide whitespace-nowrap">
          MARKET ▾
        </span>
        <div className="ticker-marquee no-scrollbar flex-1">
          <div className="ticker-track">
            <div className="flex">
              {coins.map((c) => (
                <TickerItem key={`a-${c.symbol}-${c.name}`} c={c} />
              ))}
            </div>
            <div className="flex" aria-hidden="true">
              {coins.map((c) => (
                <TickerItem key={`b-${c.symbol}-${c.name}`} c={c} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
