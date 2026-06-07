import type { Coin } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import CoinLogo from './CoinLogo'
import Link from './Link'

// Sidebar panel listing the coins referenced by the article (from `coins:`
// frontmatter). Each row links to its /charts/[id] detail page. Renders nothing
// when there are no coins so the parent can omit the panel.
export default function CoinsInStory({ coins }: { coins: Coin[] }) {
  if (!coins.length) return null
  return (
    <div className="bg-surface border-line rounded-[10px] border">
      <div className="border-line border-b px-4 py-3.5 text-[15px] font-extrabold text-gray-50">
        Coins in this story
      </div>
      <div className="py-1">
        {coins.map((c, i) => {
          const dir = changeDirection(c.change24h)
          const changeClass = dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
          return (
            <Link
              key={c.id}
              href={`/charts/${c.id}`}
              className={`hover:bg-fill-2 flex items-center gap-3 px-4 py-2.5 ${
                i < coins.length - 1 ? 'border-line-2 border-b' : ''
              }`}
            >
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
            </Link>
          )
        })}
      </div>
    </div>
  )
}
