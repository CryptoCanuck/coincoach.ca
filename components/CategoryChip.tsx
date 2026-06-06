import { getSection } from '@/lib/sections'
import type { PostType } from '@/lib/structuredData'

export default function CategoryChip({ type }: { type: PostType }) {
  const section = getSection(type)
  if (!section) return null
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10.5px] font-bold tracking-wide uppercase ${section.chipClass}`}
    >
      {section.label}
    </span>
  )
}
