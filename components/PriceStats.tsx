import SectionHeading from './SectionHeading'
import { formatUsd } from '@/lib/markets/format'
import type { PriceExtreme } from '@/lib/markets/coins'

// Minimal slice of CoinFull this section needs: the two all-time extremes plus
// the launch/genesis date. The page passes these straight through from CoinFull
// (coin.ath / coin.atl / coin.genesisDate) — no fetching here.
export interface PriceStatsProps {
  ath: PriceExtreme
  atl: PriceExtreme
  genesisDate: string | null
}

const dash = '—'

// Compact, locale-stable date label, e.g. "Mar 14, 2024". The DB hands us an ISO
// 'YYYY-MM-DD' string (genesis_date, ath_date/atl_date are cast that way); parse
// it as UTC midnight so the label never drifts a day across timezones. Returns
// null for absent/unparseable input so callers can fall back to the dash.
function formatCompactDate(iso: string | null): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Signed percent label (e.g. "+2,140.5%" / "-38.2%"). null when no value.
function formatSignedPct(pct: number | null): string | null {
  if (pct === null || !Number.isFinite(pct)) return null
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function ExtremeCell({
  label,
  extreme,
  // `from` describes the % relative to the extreme: ATH change is negative
  // ("below ATH"), ATL change is positive ("above ATL").
  from,
}: {
  label: string
  extreme: PriceExtreme
  from: 'ath' | 'atl'
}) {
  const value = extreme.value && Number.isFinite(extreme.value) ? formatUsd(extreme.value) : dash
  const date = formatCompactDate(extreme.date)
  const pct = formatSignedPct(extreme.changePct)
  const pctClass =
    extreme.changePct === null || !Number.isFinite(extreme.changePct)
      ? 'text-ink-3'
      : extreme.changePct >= 0
        ? 'text-up'
        : 'text-down'
  const fromLabel = from === 'ath' ? 'from ATH' : 'from ATL'

  return (
    <div className="border-line border-r border-b p-3.5 last:border-r-0">
      <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">{label}</div>
      <div className="mt-1 text-[15px] font-extrabold text-gray-50">{value}</div>
      {pct && (
        <div className={`mt-0.5 text-[12.5px] font-semibold ${pctClass}`}>
          {pct} {fromLabel}
        </div>
      )}
      {date && <div className="text-ink-3 mt-0.5 text-[11.5px]">{date}</div>}
    </div>
  )
}

/**
 * All-time price stats: ATH (value + date + % below), ATL (value + date + %
 * above), and the coin's launch/genesis date. Presentational server component —
 * receives the already-typed slice of CoinFull from the page.
 *
 * Renders null when none of its three data points are present, so the page can
 * stack it full-width and rely on it self-hiding when the DB row lacks extremes.
 */
export default function PriceStats({ ath, atl, genesisDate }: PriceStatsProps) {
  const hasAth = !!ath?.value && Number.isFinite(ath.value)
  const hasAtl = !!atl?.value && Number.isFinite(atl.value)
  const launch = formatCompactDate(genesisDate)

  // Nothing worth showing → hide the whole section (page relies on this).
  if (!hasAth && !hasAtl && !launch) return null

  return (
    <div>
      <SectionHeading title="Price Stats" barColor="var(--color-blue)" />
      <div className="border-line bg-surface grid grid-cols-1 overflow-hidden rounded-[10px] border sm:grid-cols-2 lg:grid-cols-3">
        <ExtremeCell label="All-Time High" extreme={ath} from="ath" />
        <ExtremeCell label="All-Time Low" extreme={atl} from="atl" />
        <div className="border-line border-r border-b p-3.5 last:border-r-0">
          <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">
            Launch Date
          </div>
          <div className="mt-1 text-[15px] font-extrabold text-gray-50">{launch ?? dash}</div>
          {launch && <div className="text-ink-3 mt-0.5 text-[11.5px]">Genesis</div>}
        </div>
      </div>
    </div>
  )
}
