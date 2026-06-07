import Link from '@/components/Link'
import { slug } from 'github-slugger'
import tagData from 'app/tag-data.json'
import Breadcrumb from '@/components/Breadcrumb'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Tags',
  description: 'Browse every tag across CoinCoach news, guides, breakdowns and reviews.',
  alternates: { canonical: '/tags' },
})

export default function Page() {
  const tagCounts = tagData as Record<string, number>
  const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a])

  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Tags' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Tags</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Every tag across our coverage. Prefer a curated view? Browse{' '}
        <Link href="/topics" className="text-blue font-semibold">
          topics
        </Link>
        .
      </p>

      {sortedTags.length === 0 ? (
        <p className="text-ink-2 mt-8 text-sm">No tags found.</p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2.5">
          {sortedTags.map((t) => (
            <Link
              key={t}
              href={`/tags/${slug(t)}`}
              aria-label={`View posts tagged ${t}`}
              className="bg-surface border-line text-ink-2 hover:border-accent flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors hover:text-gray-50"
            >
              {t.split('-').join(' ')}
              <span className="text-ink-3 text-[11px] font-bold">{tagCounts[t]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
