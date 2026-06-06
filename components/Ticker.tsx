import { getTopCoins } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'

export default async function Ticker() {
  const coins = await getTopCoins()
  if (coins.length === 0) return null
  return (
    <div className="bg-ticker border-line border-b">
      <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto px-4 py-1.5 text-[12.5px] whitespace-nowrap text-gray-400">
        {coins.map((c) => {
          const dir = changeDirection(c.change24h)
          return (
            <span key={c.symbol} className="shrink-0">
              <span className="font-semibold text-gray-100">{c.symbol}</span> {formatUsd(c.price)}{' '}
              <span className={dir === 'down' ? 'text-down' : 'text-up'}>
                {formatPercent(c.change24h)}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
