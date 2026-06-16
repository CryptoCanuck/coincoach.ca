import SectionHeading from './SectionHeading'
import { formatCompactUsd } from '@/lib/markets/format'
import type { DevStats, CommunityStats } from '@/lib/markets/coins'

export interface DevActivityProps {
  /** GitHub / developer activity (coins.dev_data). null when never profiled. */
  dev: DevStats | null
  /** Social/community stats (coins.community_data). Optional — rows render only
   *  when their value is present and non-zero (most are deprecated upstream). */
  community?: CommunityStats | null
}

const dash = '—'

// Compact a plain count (stars/forks/commits/…) reusing the project's compact
// number formatter, stripping the leading "$" since these aren't currency.
// Counts under 10k render in full for readability; larger ones go compact.
function count(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return dash
  if (n < 10_000) return n.toLocaleString('en-US')
  return formatCompactUsd(n).replace('$', '')
}

// A value is "present" for the purpose of hiding the section / community rows
// when it's a finite, non-null, non-zero number. (CoinGecko sends null for
// deprecated fields and 0 for live-but-empty — both are treated as absent here.)
function present(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n !== 0
}

export default function DevActivity({ dev, community }: DevActivityProps) {
  // Core data absent → render nothing so the page hides the section (spec §7).
  if (!dev) return null

  const devCells: [string, string][] = [
    ['GitHub Stars', count(dev.stars)],
    ['Forks', count(dev.forks)],
    ['Commits (4w)', count(dev.commits4w)],
    ['PRs Merged', count(dev.prsMerged)],
    ['Contributors', count(dev.contributors)],
    ['Total Issues', count(dev.totalIssues)],
    ['Closed Issues', count(dev.closedIssues)],
    ['Watchers', count(dev.subscribers)],
  ]

  // Every dev metric is null/zero → nothing meaningful to show, hide the section.
  const hasDevData = [
    dev.stars,
    dev.forks,
    dev.commits4w,
    dev.prsMerged,
    dev.contributors,
    dev.totalIssues,
    dev.closedIssues,
    dev.subscribers,
  ].some(present)
  if (!hasDevData) return null

  // Community rows render only when present + non-zero (deprecated upstream).
  const communityCells: [string, string][] = []
  if (community) {
    if (present(community.redditSubscribers))
      communityCells.push(['Reddit Subscribers', count(community.redditSubscribers)])
    if (present(community.telegramUsers))
      communityCells.push(['Telegram Users', count(community.telegramUsers)])
  }

  return (
    <div>
      <SectionHeading title="Developer Activity" barColor="var(--color-green)" />
      <div className="border-line bg-surface grid grid-cols-2 overflow-hidden rounded-[10px] border sm:grid-cols-4">
        {devCells.map(([k, v]) => (
          <div key={k} className="border-line border-r border-b p-3.5 last:border-r-0">
            <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">{k}</div>
            <div className="mt-1 text-[15px] font-extrabold text-gray-50">{v}</div>
          </div>
        ))}
      </div>

      {communityCells.length > 0 && (
        <div className="border-line bg-surface mt-4 grid grid-cols-2 overflow-hidden rounded-[10px] border sm:grid-cols-4">
          {communityCells.map(([k, v]) => (
            <div key={k} className="border-line border-r border-b p-3.5 last:border-r-0">
              <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">{k}</div>
              <div className="mt-1 text-[15px] font-extrabold text-gray-50">{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
