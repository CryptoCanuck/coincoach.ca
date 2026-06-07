import Breadcrumb from '@/components/Breadcrumb'
import MarketsTable from '@/components/MarketsTable'
import { getMarketTable } from '@/lib/markets/coingecko'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Markets',
  description: 'Live prices, market caps, volume and 7-day trends for the top cryptocurrencies.',
  alternates: { canonical: '/charts' },
})

export default async function MarketsPage() {
  const coins = await getMarketTable(100)
  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Markets' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Markets</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Live prices for the top 100 coins — sort by gainers, losers or volume, search, and open any
        coin for its chart and stats.
      </p>
      <div className="mt-6">
        <MarketsTable coins={coins} />
      </div>
    </div>
  )
}
