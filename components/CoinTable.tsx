import { getTopCoins } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'
import Link from './Link'

export default async function CoinTable({
  title = 'Live Coin Prices',
  limit = 6,
}: {
  title?: string
  limit?: number
}) {
  const coins = (await getTopCoins()).slice(0, limit)

  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line flex items-center justify-between border-b px-4 py-3.5">
        <div className="text-[15px] font-extrabold text-gray-50">{title}</div>
        <Link href="/charts" className="text-blue text-xs font-bold">
          View all ›
        </Link>
      </div>
      {coins.length === 0 ? (
        <p className="text-ink-2 px-4 py-4 text-sm">Market data unavailable.</p>
      ) : (
        <div className="py-1">
          {coins.map((c, i) => {
            const dir = changeDirection(c.change24h)
            const changeClass =
              dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
            return (
              <div
                key={`${c.symbol}-${c.name}`}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i < coins.length - 1 ? 'border-line-2 border-b' : ''
                }`}
              >
                <span className="text-ink-3 w-3.5 text-xs font-bold">{i + 1}</span>
                <CoinLogo sym={c.symbol} size={22} />
                <div className="flex flex-col leading-tight">
                  <span className="text-[13.5px] font-bold text-gray-100">{c.name}</span>
                  <span className="text-ink-3 text-[11px] font-semibold">{c.symbol}</span>
                </div>
                <span className="ml-auto text-[13.5px] font-bold text-gray-100">
                  {formatUsd(c.price)}
                </span>
                <span className={`w-[52px] text-right text-[13px] font-bold ${changeClass}`}>
                  {formatPercent(c.change24h)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
