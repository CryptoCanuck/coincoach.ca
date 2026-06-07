import { allLessons } from 'contentlayer/generated'
import Breadcrumb from '@/components/Breadcrumb'
import Link from '@/components/Link'
import LessonCard from '@/components/LessonCard'
import { publishedLessons, lessonsByTier } from '@/lib/learn'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Learn Crypto',
  description:
    'Structured crypto lessons from beginner to advanced — understand blockchain, wallets, DeFi and more, one step at a time.',
  alternates: { canonical: '/learn' },
})

export default function LearnPage() {
  const groups = lessonsByTier(publishedLessons(allLessons))

  return (
    <div className="py-7">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Learn' }]} />
      <h1 className="mt-5 text-[34px] font-black tracking-tight text-gray-50">Learn Crypto</h1>
      <p className="text-ink-2 mt-1.5 text-sm font-medium">
        Build your crypto knowledge step by step. Pick a level and work through the lessons, then go
        deeper with our{' '}
        <Link href="/guides" className="text-blue font-semibold">
          guides
        </Link>{' '}
        and{' '}
        <Link href="/glossary" className="text-blue font-semibold">
          glossary
        </Link>
        .
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {groups.map(({ tier, lessons }) => (
          <section key={tier.key}>
            <div className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-full" style={{ background: tier.color }} />
              <h2 className="text-xl font-extrabold text-gray-50">{tier.label}</h2>
            </div>
            <p className="text-ink-3 mt-1 text-[13px] font-medium">{tier.description}</p>
            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.map((l) => (
                <LessonCard
                  key={l.slug}
                  slug={l.slug}
                  title={l.title}
                  summary={l.summary}
                  difficulty={l.difficulty}
                  readingTime={Math.max(1, Math.round(l.readingTime.minutes))}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
