import Link from './Link'
import CoinLogo from './CoinLogo'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import type { Coin } from '@/lib/markets/coingecko'

export default function SimilarCoins({ coins }: { coins: Coin[] }) {
  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line border-b px-4 py-3.5 text-[15px] font-extrabold text-gray-50">
        Similar Coins
      </div>
      {coins.length === 0 ? (
        <p className="text-ink-2 px-4 py-4 text-sm">Market data unavailable.</p>
      ) : (
        <div className="py-1">
          {coins.map((c) => {
            const dir = changeDirection(c.change24h)
            const changeClass =
              dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
            return (
              <Link
                key={c.id || c.symbol}
                href={`/charts/${c.id}`}
                className="hover:bg-fill-2 flex items-center gap-3 px-4 py-2.5"
              >
                <CoinLogo sym={c.symbol} size={22} />
                <span className="text-[13.5px] font-bold text-gray-100">{c.symbol}</span>
                <span className="ml-auto text-[13.5px] font-bold text-gray-100">
                  {formatUsd(c.price)}
                </span>
                <span className={`w-[52px] text-right text-[13px] font-bold ${changeClass}`}>
                  {formatPercent(c.change24h)}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
