import Link from './Link'
import CoinLogo from './CoinLogo'
import SectionHeading from './SectionHeading'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import type { SimilarCoin } from '@/lib/markets/coins'

// Same-category peers (from dbSimilarByCategory) rendered as a horizontal card
// row. Presentational server component — data comes in via props. Returns null
// when there are no peers so the page hides the whole section (spec: missing
// per-section data → hide it).
export default function SimilarCoins({ coins }: { coins: SimilarCoin[] }) {
  if (!coins.length) return null
  return (
    <div>
      <SectionHeading title="Similar Coins" barColor="var(--color-blue)" />
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {coins.map((c) => {
          const dir = changeDirection(c.change24h ?? 0)
          const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
          return (
            <Link
              key={c.id || c.symbol}
              href={`/charts/${c.id}`}
              className="border-line bg-surface hover:bg-fill-2 flex w-[170px] shrink-0 flex-col gap-2 rounded-[10px] border p-3.5"
            >
              <div className="flex items-center gap-2.5">
                <CoinLogo sym={c.symbol} size={26} />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-extrabold text-gray-50">
                    {c.symbol}
                  </div>
                  <div className="text-ink-3 truncate text-[11.5px] font-semibold">{c.name}</div>
                </div>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-extrabold text-gray-100">
                  {c.price !== null ? formatUsd(c.price) : '—'}
                </span>
                <span className={`text-[12.5px] font-bold ${changeClass}`}>
                  {c.change24h !== null ? formatPercent(c.change24h) : '—'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
