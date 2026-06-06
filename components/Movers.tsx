import { getMovers } from '@/lib/markets/coingecko'
import { formatPercent } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'

// Gainers among the top-100 by market cap. The Gainers/Losers tab toggle is Phase 2.
export default async function Movers() {
  const { gainers } = await getMovers()

  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line flex gap-4 border-b px-4 pt-3">
        <span className="border-accent border-b-2 pb-2.5 text-sm font-extrabold text-gray-50">
          Gainers
        </span>
        <span className="text-ink-3 pb-2.5 text-sm font-bold">Losers</span>
      </div>
      {gainers.length === 0 ? (
        <p className="text-ink-2 px-4 py-4 text-sm">Market data unavailable.</p>
      ) : (
        <div className="py-1.5">
          {gainers.map((c) => (
            <div key={`${c.symbol}-${c.name}`} className="flex items-center gap-2.5 px-4 py-2">
              <CoinLogo sym={c.symbol} size={20} />
              <span className="text-[13.5px] font-bold text-gray-100">{c.symbol}</span>
              <span
                className={`ml-auto text-[13.5px] font-bold ${
                  c.change24h < 0 ? 'text-down' : 'text-up'
                }`}
              >
                {formatPercent(c.change24h)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
