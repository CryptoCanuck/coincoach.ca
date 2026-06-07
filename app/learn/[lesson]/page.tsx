import { allLessons } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import Breadcrumb from '@/components/Breadcrumb'
import Link from '@/components/Link'
import { notFound } from 'next/navigation'
import { publishedLessons, getLesson, relatedLessons, tierMeta } from '@/lib/learn'
import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'

export const generateStaticParams = async () =>
  publishedLessons(allLessons).map((l) => ({ lesson: l.slug }))

export async function generateMetadata(props: {
  params: Promise<{ lesson: string }>
}): Promise<Metadata | undefined> {
  const { lesson } = await props.params
  const entry = getLesson(publishedLessons(allLessons), lesson)
  if (!entry) return
  return genPageMetadata({
    title: `${entry.title} — Learn Crypto`,
    description: entry.summary || `Learn about ${entry.title} in plain English.`,
    alternates: { canonical: `/learn/${entry.slug}` },
  })
}

export default async function LessonPage(props: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await props.params
  const published = publishedLessons(allLessons)
  const entry = getLesson(published, lesson)
  if (!entry) return notFound()

  const meta = tierMeta(entry.difficulty)
  const related = relatedLessons(published, entry)
  const minutes = Math.max(1, Math.round(entry.readingTime.minutes))

  return (
    <div className="py-7">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Learn', href: '/learn' },
          { label: entry.title },
        ]}
      />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h1 className="text-[34px] font-black tracking-tight text-gray-50">{entry.title}</h1>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
        <span className="text-ink-3 text-[12px] font-semibold">{minutes} min read</span>
      </div>

      <div className="prose prose-invert mt-4 max-w-2xl">
        <MDXLayoutRenderer code={entry.body.code} components={components} />
      </div>

      {related.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-sm font-extrabold tracking-wide text-white uppercase">
            Related lessons
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/learn/${r.slug}`}
                className="bg-surface border-line hover:border-accent rounded-full border px-3 py-1.5 text-[13px] font-semibold text-gray-200 transition-colors"
              >
                {r.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <Link href="/learn" className="text-blue text-sm font-semibold">
          ← Back to Learn
        </Link>
      </div>
    </div>
  )
}
