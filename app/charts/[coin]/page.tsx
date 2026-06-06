import { notFound } from 'next/navigation'
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer'
import { allBlogs } from 'contentlayer/generated'
import Link from '@/components/Link'
import Breadcrumb from '@/components/Breadcrumb'
import CoinHeader from '@/components/CoinHeader'
import PriceChart from '@/components/PriceChart'
import KeyStats from '@/components/KeyStats'
import SectionHeading from '@/components/SectionHeading'
import Converter from '@/components/Converter'
import SimilarCoins from '@/components/SimilarCoins'
import Gauge from '@/components/Gauge'
import { getCoin, getAllOhlc, priceVolatilityPct, TIMEFRAMES } from '@/lib/markets/coins'
import { getTopCoins } from '@/lib/markets/coingecko'
import { sentimentScore } from '@/lib/markets/sentimentProxy'
import { genPageMetadata } from 'app/seo'

export async function generateMetadata({ params }: { params: Promise<{ coin: string }> }) {
  const { coin: id } = await params
  const coin = await getCoin(id)
  if (!coin) return genPageMetadata({ title: 'Coin not found' })
  return genPageMetadata({
    title: `${coin.name} (${coin.symbol}) Price & Chart`,
    description: `Live ${coin.name} price, candlestick chart, key stats and ${coin.symbol} news.`,
    alternates: { canonical: `/charts/${coin.id}` },
  })
}

export default async function CoinDetailPage({ params }: { params: Promise<{ coin: string }> }) {
  const { coin: id } = await params
  const [coin, ohlc, top] = await Promise.all([getCoin(id), getAllOhlc(id), getTopCoins()])
  if (!coin) notFound()

  const volatility = priceVolatilityPct(ohlc['1M'] ?? [])
  const similar = top.filter((c) => c.id !== coin.id).slice(0, 5)

  const posts = allCoreContent(sortPosts(allBlogs))
  const sym = coin.symbol.toLowerCase()
  const nameLower = coin.name.toLowerCase()
  const coinNews = posts
    .filter((p) =>
      (p.tags ?? []).some((t) => t.toLowerCase() === sym || t.toLowerCase() === nameLower)
    )
    .slice(0, 4)

  return (
    <div className="py-2">
      <div className="pt-5">
        <Breadcrumb
          items={[{ label: 'Charts', href: '/charts' }, { label: `${coin.name} (${coin.symbol})` }]}
        />
      </div>
      <CoinHeader coin={coin} />

      <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="flex flex-col gap-6">
          <PriceChart data={ohlc} frames={TIMEFRAMES} />

          <div>
            <SectionHeading title="Key Stats" />
            <KeyStats coin={coin} volatilityPct={volatility} />
          </div>

          {(coin.description || coin.links.length > 0) && (
            <div>
              <SectionHeading title={`About ${coin.name}`} barColor="var(--color-blue)" />
              {coin.description && (
                <p className="text-ink-2 text-[14px] leading-relaxed">{coin.description}</p>
              )}
              {coin.links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {coin.links.map((l) => (
                    <Link
                      key={l.label}
                      href={l.href}
                      className="border-line bg-fill-2 text-ink rounded-lg border px-3 py-1.5 text-[13px] font-semibold hover:text-gray-50"
                    >
                      {l.label} ↗
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT RAIL */}
        <div className="flex flex-col gap-5">
          <div className="bg-surface border-line flex flex-col items-center rounded-[10px] border p-4">
            <div className="mb-1 self-start text-[15px] font-extrabold text-gray-50">
              {coin.symbol} Sentiment
            </div>
            <Gauge value={sentimentScore(coin.change24h)} label="Momentum" size="sm" />
            <div className="text-ink-3 mt-1 text-[11px]">24h momentum proxy</div>
          </div>

          <Converter symbol={coin.symbol} price={coin.price} />

          <SimilarCoins coins={similar} />

          <div className="bg-surface border-line rounded-[10px] border p-4">
            <div className="mb-2 text-[15px] font-extrabold text-gray-50">
              Latest {coin.symbol} News
            </div>
            {coinNews.length === 0 ? (
              <p className="text-ink-3 text-sm">
                No {coin.symbol} stories yet —{' '}
                <Link href="/news" className="text-blue font-semibold">
                  browse all news ›
                </Link>
              </p>
            ) : (
              <div className="flex flex-col">
                {coinNews.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="border-line-2 text-ink-2 border-b py-2.5 text-[13.5px] font-semibold last:border-b-0 hover:text-gray-50"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
