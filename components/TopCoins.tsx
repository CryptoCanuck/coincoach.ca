import { getTopCoins } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'

export default async function TopCoins() {
  const coins = (await getTopCoins()).slice(0, 5)
  return (
    <div className="bg-surface border-line rounded-xl border p-3">
      <h3 className="text-accent mb-1.5 text-xs font-semibold tracking-wider uppercase">
        Top coins
      </h3>
      {coins.length === 0 ? (
        <p className="py-2 text-sm text-gray-400">Market data unavailable.</p>
      ) : (
        coins.map((c) => {
          const dir = changeDirection(c.change24h)
          return (
            <div
              key={c.symbol}
              className="border-line flex items-center justify-between border-b py-1.5 text-sm last:border-b-0"
            >
              <span className="font-semibold text-gray-100">{c.name}</span>
              <span className="text-gray-300">
                {formatUsd(c.price)}{' '}
                <span className={dir === 'down' ? 'text-down' : 'text-up'}>
                  {formatPercent(c.change24h)}
                </span>
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
