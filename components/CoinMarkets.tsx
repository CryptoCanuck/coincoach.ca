import Link from './Link'
import SectionHeading from './SectionHeading'
import { formatUsd, formatCompactUsd } from '@/lib/markets/format'
import type { TickerRow } from '@/lib/markets/coins'

const dash = '—'

// Numeric exchange trust (CoinGecko 0–10) → the green/yellow/red trust signal
// the design calls for. The per-ticker green/yellow/red string isn't exposed on
// the TickerRow view-model (the read joins the exchange's numeric trust_score),
// so we derive the same three-band semantic from that score.
type Trust = { dot: string; label: string }

function trustFor(score: number | null): Trust | null {
  if (score === null || !Number.isFinite(score)) return null
  if (score >= 7) return { dot: 'var(--color-green)', label: 'High' }
  if (score >= 4) return { dot: 'var(--color-amber)', label: 'Medium' }
  return { dot: 'var(--color-red)', label: 'Low' }
}

function priceCell(v: number | null): string {
  return v === null || !Number.isFinite(v) ? dash : formatUsd(v)
}

function volumeCell(v: number | null): string {
  return v === null || !Number.isFinite(v) || v === 0 ? dash : formatCompactUsd(v)
}

function spreadCell(v: number | null): string {
  // spread_pct is stored as a fraction (e.g. 0.0102 = 1.02%); render as a percent.
  return v === null || !Number.isFinite(v) ? dash : `${(v * 100).toFixed(2)}%`
}

export interface CoinMarketsProps {
  /** Coin display name, used in the section heading ("Where to buy {name}"). */
  coinName: string
  /** Exchange ticker rows, pre-sorted by USD volume (from dbCoinTickers). */
  tickers: TickerRow[]
}

// Server component (presentational, no interactivity). Renders the coin's
// exchange markets as a full-width "Where to buy" table. Returns null when there
// are no tickers so the page can hide the section (spec: missing data → hide).
export default function CoinMarkets({ coinName, tickers }: CoinMarketsProps) {
  if (!tickers || tickers.length === 0) return null

  return (
    <div>
      <SectionHeading title={`Where to Buy ${coinName}`} barColor="var(--color-blue)" />
      <div className="bg-surface border-line overflow-hidden rounded-[10px] border">
        <div className="max-h-[520px] overflow-y-auto">
          <div className="border-line text-ink-3 bg-surface sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-2.5 text-[11px] font-bold tracking-wide uppercase">
            <span className="w-6">#</span>
            <span className="flex-1">Exchange</span>
            <span className="w-[96px]">Pair</span>
            <span className="w-[92px] text-right">Price</span>
            <span className="hidden w-[104px] text-right sm:inline">24h Volume</span>
            <span className="hidden w-[72px] text-right md:inline">Spread</span>
            <span className="hidden w-[80px] text-right md:inline">Trust</span>
            <span className="w-[72px] text-right">Trade</span>
          </div>

          {tickers.map((t, i) => {
            const trust = trustFor(t.trustScore)
            return (
              <div
                key={`${t.exchangeId}-${t.base}-${t.target}`}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i < tickers.length - 1 ? 'border-line-2 border-b' : ''
                }`}
              >
                <span className="text-ink-3 w-6 text-xs font-bold">{i + 1}</span>
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {t.exchangeImage ? (
                    // Exchange logos are remote CoinGecko URLs not whitelisted for
                    // next/image; a plain img with fixed dims degrades gracefully.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.exchangeImage}
                      alt=""
                      width={22}
                      height={22}
                      loading="lazy"
                      className="border-line h-[22px] w-[22px] shrink-0 rounded-full border bg-white object-contain"
                    />
                  ) : (
                    <span className="border-line bg-fill-2 h-[22px] w-[22px] shrink-0 rounded-full border" />
                  )}
                  <span className="truncate text-sm font-bold text-gray-100">{t.exchangeName}</span>
                </div>
                <span className="text-ink-2 w-[96px] truncate text-[13px] font-semibold">
                  {t.pair}
                </span>
                <span className="w-[92px] text-right text-sm font-bold text-gray-100">
                  {priceCell(t.priceUsd)}
                </span>
                <span className="text-ink-2 hidden w-[104px] text-right text-[13px] font-semibold sm:inline">
                  {volumeCell(t.volumeUsd)}
                </span>
                <span className="text-ink-2 hidden w-[72px] text-right text-[13px] font-semibold md:inline">
                  {spreadCell(t.spreadPct)}
                </span>
                <span className="hidden w-[80px] items-center justify-end gap-1.5 md:flex">
                  {trust ? (
                    <>
                      <span
                        aria-hidden
                        className="h-[8px] w-[8px] rounded-full"
                        style={{ background: trust.dot }}
                      />
                      <span className="text-ink-2 text-[12.5px] font-semibold">{trust.label}</span>
                    </>
                  ) : (
                    <span className="text-ink-3 text-[12.5px] font-semibold">{dash}</span>
                  )}
                </span>
                <span className="w-[72px] text-right">
                  {t.tradeUrl ? (
                    <Link
                      href={t.tradeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent text-[13px] font-bold hover:text-gray-50"
                    >
                      Trade ↗
                    </Link>
                  ) : (
                    <span className="text-ink-3 text-[13px] font-semibold">{dash}</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
