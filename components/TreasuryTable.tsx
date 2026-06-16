import SectionHeading from './SectionHeading'
import { formatCompactUsd } from '@/lib/markets/format'
import type { TreasuryView } from '@/lib/markets/coins'

export interface TreasuryTableProps {
  // The treasury view-model from dbTreasury (BTC/ETH only). null when the coin
  // has no treasury data — the component renders null so the page hides the
  // section (spec: "Not BTC/ETH → no Treasury").
  treasury: TreasuryView | null
  // The coin's ticker (e.g. "BTC"), used to label coin-count holdings.
  symbol: string
}

const dash = '—'

// Coin-count holdings (not USD) — compact integer, e.g. 845,256 → "845.26K".
function formatHoldings(n: number | null, symbol: string): string {
  if (n === null || !Number.isFinite(n) || n === 0) return dash
  const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n)
  return `${compact} ${symbol}`
}

// Already-a-percent values (pct_of_supply, market_cap_dominance: 4.025 = 4.03%).
function formatSupplyPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return dash
  return `${n.toFixed(2)}%`
}

function formatUsdValue(n: number | null): string {
  if (n === null || !Number.isFinite(n) || n === 0) return dash
  return formatCompactUsd(n)
}

export default function TreasuryTable({ treasury, symbol }: TreasuryTableProps) {
  // Graceful: no treasury data at all → hide the section entirely.
  if (!treasury || treasury.holdings.length === 0) return null

  const { totalHoldings, totalValueUsd, marketCapDominance, holdings } = treasury

  const summary: [string, string][] = [
    ['Total Holdings', formatHoldings(totalHoldings, symbol)],
    ['Total Value', formatUsdValue(totalValueUsd)],
    ['Supply Dominance', formatSupplyPct(marketCapDominance)],
  ]

  return (
    <div>
      <SectionHeading title="Public Company Treasuries" barColor="var(--color-blue)" />

      {/* Summary band — mirrors the StatCard bordered-grid idiom. */}
      <div className="border-line bg-surface mb-4 grid grid-cols-3 overflow-hidden rounded-[10px] border">
        {summary.map(([k, v]) => (
          <div key={k} className="border-line border-r p-3.5 last:border-r-0">
            <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">{k}</div>
            <div className="mt-1 text-[15px] font-extrabold text-gray-50">{v}</div>
          </div>
        ))}
      </div>

      {/* Holdings table */}
      <div className="border-line bg-surface overflow-hidden rounded-[10px] border">
        <div className="max-h-[440px] overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-line bg-surface border-b">
                <th className="text-ink-3 px-3.5 py-2.5 text-[11.5px] font-bold tracking-wide uppercase">
                  Company
                </th>
                <th className="text-ink-3 px-3.5 py-2.5 text-[11.5px] font-bold tracking-wide uppercase">
                  Country
                </th>
                <th className="text-ink-3 px-3.5 py-2.5 text-right text-[11.5px] font-bold tracking-wide uppercase">
                  Holdings
                </th>
                <th className="text-ink-3 px-3.5 py-2.5 text-right text-[11.5px] font-bold tracking-wide uppercase">
                  Value
                </th>
                <th className="text-ink-3 px-3.5 py-2.5 text-right text-[11.5px] font-bold tracking-wide uppercase">
                  % of Supply
                </th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr
                  key={`${h.companySymbol}-${i}`}
                  className="border-line border-b last:border-b-0"
                >
                  <td className="px-3.5 py-2.5">
                    <div className="text-[14px] font-extrabold text-gray-50">{h.name}</div>
                    <div className="text-ink-3 text-[11.5px] font-semibold">{h.companySymbol}</div>
                  </td>
                  <td className="text-ink-2 px-3.5 py-2.5 text-[13px] font-semibold">
                    {h.country ?? dash}
                  </td>
                  <td className="px-3.5 py-2.5 text-right text-[14px] font-bold text-gray-50 tabular-nums">
                    {formatHoldings(h.holdings, symbol)}
                  </td>
                  <td className="text-ink px-3.5 py-2.5 text-right text-[14px] font-semibold tabular-nums">
                    {formatUsdValue(h.currentValueUsd)}
                  </td>
                  <td className="text-ink-2 px-3.5 py-2.5 text-right text-[13px] font-semibold tabular-nums">
                    {formatSupplyPct(h.pctOfSupply)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
