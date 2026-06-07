import { allGlossaries } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import Breadcrumb from '@/components/Breadcrumb'
import Link from '@/components/Link'
import { notFound } from 'next/navigation'
import { publishedGlossary, getGlossaryTerm, relatedEntries, categoryMeta } from '@/lib/glossary'
import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'

export const generateStaticParams = async () =>
  publishedGlossary(allGlossaries).map((t) => ({ term: t.slug }))

export async function generateMetadata(props: {
  params: Promise<{ term: string }>
}): Promise<Metadata | undefined> {
  const { term } = await props.params
  const entry = getGlossaryTerm(publishedGlossary(allGlossaries), term)
  if (!entry) return
  return genPageMetadata({
    title: `${entry.term} — Crypto Glossary`,
    description: entry.summary || `What ${entry.term} means in crypto, explained in plain English.`,
    alternates: { canonical: `/glossary/${entry.slug}` },
  })
}

export default async function GlossaryTermPage(props: { params: Promise<{ term: string }> }) {
  const { term } = await props.params
  const published = publishedGlossary(allGlossaries)
  const entry = getGlossaryTerm(published, term)
  if (!entry) return notFound()

  const meta = categoryMeta(entry.category)
  const related = relatedEntries(published, entry)

  return (
    <div className="py-7">
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Glossary', href: '/glossary' },
          { label: entry.term },
        ]}
      />
      <div className="mt-5 flex items-center gap-3">
        <h1 className="text-[34px] font-black tracking-tight text-gray-50">{entry.term}</h1>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      <div className="prose prose-invert mt-4 max-w-2xl">
        <MDXLayoutRenderer code={entry.body.code} components={components} />
      </div>

      {related.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-sm font-extrabold tracking-wide text-white uppercase">
            Related terms
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/glossary/${r.slug}`}
                className="bg-surface border-line hover:border-accent rounded-full border px-3 py-1.5 text-[13px] font-semibold text-gray-200 transition-colors"
              >
                {r.term}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <Link href="/glossary" className="text-blue text-sm font-semibold">
          ← Back to glossary
        </Link>
      </div>
    </div>
  )
}
