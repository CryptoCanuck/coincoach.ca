import Gauge from './Gauge'
import SectionHeading from './SectionHeading'
import { sentimentScore } from '@/lib/markets/sentimentProxy'

// Presentational server component (no interactivity). The page passes an already
// -fetched CoinFull slice in; this never touches the DB. It composes three
// signals into one full-width "Sentiment" band:
//   1. Momentum gauge — the 24h-change proxy (NOT social sentiment).
//   2. CoinGecko community up/down vote %s — a split bar.
//   3. Watchlist user count.
// Graceful: when none of the three signals are present it renders null, so the
// page hides the section entirely (spec: missing per-section data → hide it).

// Minimal slice of CoinFull this band needs. Accepting the slice (rather than the
// whole CoinFull) keeps the contract narrow and the component easy to reuse/test.
export interface SentimentBandProps {
  symbol: string
  change24h: number | null
  sentimentVotesUpPct: number | null
  sentimentVotesDownPct: number | null
  watchlistUsers: number | null
}

const num = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v)

// Plain compact count (not USD) for the watchlist users — formatCompactUsd would
// prefix a "$", which is wrong for a people count.
function formatCompactCount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export default function SentimentBand({
  symbol,
  change24h,
  sentimentVotesUpPct,
  sentimentVotesDownPct,
  watchlistUsers,
}: SentimentBandProps) {
  const hasMomentum = num(change24h)
  const hasVotes = num(sentimentVotesUpPct) || num(sentimentVotesDownPct)
  const hasWatchlist = num(watchlistUsers) && (watchlistUsers as number) > 0

  // Nothing to show → let the page drop the section.
  if (!hasMomentum && !hasVotes && !hasWatchlist) return null

  // Resolve the vote split. If only one side is present, derive the other so the
  // bar always reads as two parts summing to 100.
  const clampPct = (n: number) => Math.max(0, Math.min(100, n))
  const up = num(sentimentVotesUpPct)
    ? clampPct(sentimentVotesUpPct as number)
    : num(sentimentVotesDownPct)
      ? clampPct(100 - (sentimentVotesDownPct as number))
      : null
  const down = num(sentimentVotesDownPct)
    ? clampPct(sentimentVotesDownPct as number)
    : num(sentimentVotesUpPct)
      ? clampPct(100 - (sentimentVotesUpPct as number))
      : null

  return (
    <div>
      <SectionHeading title="Sentiment" />
      <div className="border-line bg-surface flex flex-col gap-6 rounded-[10px] border p-5 md:flex-row md:items-center md:gap-8">
        {hasMomentum && (
          <div className="md:border-line flex flex-col items-center md:border-r md:pr-8">
            <Gauge value={sentimentScore(change24h as number)} label="Momentum" size="sm" />
            <div className="text-ink-3 mt-1 text-[11px]">24h momentum proxy</div>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          {hasVotes && up !== null && down !== null && (
            <div className="flex-1">
              <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">
                Community Sentiment
              </div>
              <div className="bg-fill mt-2.5 flex h-[9px] overflow-hidden rounded-full">
                <span
                  className="bg-up block h-full"
                  style={{ width: `${Math.max(0, Math.min(100, up))}%` }}
                />
                <span
                  className="bg-down block h-full"
                  style={{ width: `${Math.max(0, Math.min(100, down))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-up text-[15px] font-extrabold">{up.toFixed(0)}% Bullish</span>
                <span className="text-down text-[15px] font-extrabold">
                  {down.toFixed(0)}% Bearish
                </span>
              </div>
              <div className="text-ink-3 mt-1 text-[11px]">CoinGecko community votes</div>
            </div>
          )}

          {hasWatchlist && (
            <div className="sm:w-[160px]">
              <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">
                Watchlists
              </div>
              <div className="mt-1 text-[22px] font-black tracking-tight text-gray-50">
                {formatCompactCount(watchlistUsers as number)}
              </div>
              <div className="text-ink-3 mt-0.5 text-[12.5px]">users tracking {symbol}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
