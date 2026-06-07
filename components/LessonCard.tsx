import Link from './Link'
import { tierMeta } from '@/lib/learn'

export default function LessonCard({
  slug,
  title,
  summary,
  difficulty,
  readingTime,
}: {
  slug: string
  title: string
  summary?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  readingTime: number
}) {
  const meta = tierMeta(difficulty)
  return (
    <Link
      href={`/learn/${slug}`}
      className="bg-surface border-line hover:border-accent flex flex-col gap-2 rounded-[10px] border p-4 transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
        <span className="text-ink-3 text-[11px] font-semibold">{readingTime} min read</span>
      </div>
      <div className="text-[15px] font-extrabold text-gray-50">{title}</div>
      {summary ? <div className="text-ink-2 text-[13px] font-medium">{summary}</div> : null}
    </Link>
  )
}
