import SectionHeading from './SectionHeading'
import type { CoinFull } from '@/lib/markets/coins'

// Minimal slice of CoinFull the specs definition-list needs. Accepting just
// these fields (rather than the whole CoinFull) keeps the component's contract
// narrow — the page passes `coin` and TS structurally satisfies this.
export interface SpecsTableData {
  hashingAlgorithm: CoinFull['hashingAlgorithm']
  blockTimeMinutes: CoinFull['blockTimeMinutes']
  genesisDate: CoinFull['genesisDate']
  assetPlatform: CoinFull['assetPlatform']
  categories: CoinFull['categories']
}

export interface SpecsTableProps {
  coin: SpecsTableData
}

// Normalize a stored genesis date (ISO YYYY-MM-DD or null) to a readable label,
// falling back to the raw string if it isn't a parseable date.
function formatGenesis(raw: string): string {
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// Drop empty/whitespace-only category strings the upstream blob can carry.
function cleanCategories(categories: string[]): string[] {
  return categories.filter((c) => typeof c === 'string' && c.trim() !== '')
}

export default function SpecsTable({ coin }: SpecsTableProps) {
  const algorithm =
    typeof coin.hashingAlgorithm === 'string' && coin.hashingAlgorithm.trim() !== ''
      ? coin.hashingAlgorithm.trim()
      : null
  const blockTime =
    typeof coin.blockTimeMinutes === 'number' && Number.isFinite(coin.blockTimeMinutes)
      ? coin.blockTimeMinutes
      : null
  const genesis =
    typeof coin.genesisDate === 'string' && coin.genesisDate.trim() !== ''
      ? coin.genesisDate.trim()
      : null
  const platform =
    typeof coin.assetPlatform === 'string' && coin.assetPlatform.trim() !== ''
      ? coin.assetPlatform.trim()
      : null
  const categories = cleanCategories(coin.categories ?? [])

  // Scalar rows: omit any whose value is missing.
  const rows: [string, string][] = []
  if (algorithm) rows.push(['Hashing algorithm', algorithm])
  if (blockTime !== null) {
    const unit = blockTime === 1 ? 'minute' : 'minutes'
    rows.push(['Block time', `${blockTime} ${unit}`])
  }
  if (genesis) rows.push(['Genesis date', formatGenesis(genesis)])
  if (platform) rows.push(['Asset platform', platform])

  // Hide the whole section when there's nothing to show (the page relies on a
  // null return to drop empty modules).
  if (rows.length === 0 && categories.length === 0) return null

  return (
    <div>
      <SectionHeading title="Specs" barColor="var(--color-blue)" />
      <dl className="border-line bg-surface divide-line divide-y overflow-hidden rounded-[10px] border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">{label}</dt>
            <dd className="text-right text-[14px] font-extrabold text-gray-50">{value}</dd>
          </div>
        ))}
        {categories.length > 0 && (
          <div className="px-4 py-3">
            <dt className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">
              Categories
            </dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {categories.map((c) => (
                <span
                  key={c}
                  className="border-line bg-fill-2 text-ink rounded-lg border px-2.5 py-1 text-[12.5px] font-semibold"
                >
                  {c}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
