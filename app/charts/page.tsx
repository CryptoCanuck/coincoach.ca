import Link from '@/components/Link'
import CoinLogo from '@/components/CoinLogo'
import Breadcrumb from '@/components/Breadcrumb'
import { getTopCoins } from '@/lib/markets/coingecko'
import { formatUsd, formatPercent, changeDirection } from '@/lib/markets/format'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Charts',
  description: 'Live prices and candlestick charts for the top cryptocurrencies.',
  alternates: { canonical: '/charts' },
})

export default async function ChartsPage() {
  // Only coins with an id can be linked to a /charts/[id] detail page.
  const coins = (await getTopCoins()).filter((c) => c.id)
  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Charts' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Charts</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Live prices for the top coins — open one for its candlestick chart and stats.
      </p>

      <div className="bg-surface border-line mt-6 overflow-hidden rounded-[10px] border">
        {coins.length === 0 ? (
          <p className="text-ink-2 px-4 py-6 text-sm">Market data unavailable.</p>
        ) : (
          coins.map((c, i) => {
            const dir = changeDirection(c.change24h)
            const changeClass =
              dir === 'down' ? 'text-down' : dir === 'up' ? 'text-up' : 'text-ink-2'
            return (
              <Link
                key={c.id || c.symbol}
                href={`/charts/${c.id}`}
                className="border-line-2 hover:bg-fill-2 flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <span className="text-ink-3 w-5 text-xs font-bold">{i + 1}</span>
                <CoinLogo sym={c.symbol} size={24} />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-gray-100">{c.name}</span>
                  <span className="text-ink-3 text-[11px] font-semibold">{c.symbol}</span>
                </div>
                <span className="ml-auto text-sm font-bold text-gray-100">
                  {formatUsd(c.price)}
                </span>
                <span className={`w-[64px] text-right text-[13px] font-bold ${changeClass}`}>
                  {formatPercent(c.change24h)}
                </span>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
