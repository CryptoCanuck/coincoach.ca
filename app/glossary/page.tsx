import { allGlossaries } from 'contentlayer/generated'
import Breadcrumb from '@/components/Breadcrumb'
import Link from '@/components/Link'
import GlossaryFilter, { type GlossaryItem } from '@/components/GlossaryFilter'
import { publishedGlossary } from '@/lib/glossary'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Crypto Glossary',
  description:
    'Plain-English definitions of crypto and blockchain terms — from blockchain and DeFi to staking, gas and cold storage.',
  alternates: { canonical: '/glossary' },
})

export default function GlossaryPage() {
  const terms: GlossaryItem[] = publishedGlossary(allGlossaries).map((t) => ({
    slug: t.slug,
    term: t.term,
    category: t.category,
    summary: t.summary,
  }))

  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Glossary' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Crypto Glossary</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Plain-English definitions of the terms you'll meet across crypto. Browse by category or
        search, then dig deeper in our{' '}
        <Link href="/guides" className="text-blue font-semibold">
          guides
        </Link>
        .
      </p>
      <GlossaryFilter terms={terms} />
    </div>
  )
}
