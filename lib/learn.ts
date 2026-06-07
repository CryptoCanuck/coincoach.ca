export interface DifficultyTier {
  key: string
  label: string
  color: string
  description: string
}

// Ordered beginner→advanced. Colours reuse the Direction-B accent palette
// (green = start, blue = build, amber = stretch).
export const DIFFICULTY_TIERS: DifficultyTier[] = [
  {
    key: 'beginner',
    label: 'Beginner',
    color: '#7BC23A',
    description: 'Start here — the essentials, with no jargon assumed.',
  },
  {
    key: 'intermediate',
    label: 'Intermediate',
    color: '#3FA7DA',
    description: 'Go a level deeper once the basics make sense.',
  },
  {
    key: 'advanced',
    label: 'Advanced',
    color: '#F2A024',
    description: 'For confident users ready for the technical detail.',
  },
]

export function tierMeta(key: string): DifficultyTier {
  return (
    DIFFICULTY_TIERS.find((t) => t.key === key) ?? {
      key,
      label: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown',
      color: '#7A8699',
      description: '',
    }
  )
}

export function publishedLessons<T extends { draft?: boolean }>(lessons: T[]): T[] {
  if (!Array.isArray(lessons)) return []
  return lessons.filter((l) => l.draft !== true)
}

// Sort by explicit `order` ascending; lessons without an order sink to the end;
// ties break by title for stable output.
export function sortLessons<T extends { order?: number; title: string }>(lessons: T[]): T[] {
  if (!Array.isArray(lessons)) return []
  return [...lessons].sort((a, b) => {
    const ao = Number.isFinite(a.order) ? (a.order as number) : Number.MAX_SAFE_INTEGER
    const bo = Number.isFinite(b.order) ? (b.order as number) : Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' })
  })
}

export interface TierGroup<T> {
  tier: DifficultyTier
  lessons: T[]
}

// Group lessons into tiers in DIFFICULTY_TIERS order; only tiers with ≥1 lesson
// are returned, each tier's lessons sorted by sortLessons.
export function lessonsByTier<T extends { difficulty: string; order?: number; title: string }>(
  lessons: T[]
): TierGroup<T>[] {
  if (!Array.isArray(lessons)) return []
  const groups: TierGroup<T>[] = []
  for (const tier of DIFFICULTY_TIERS) {
    const inTier = sortLessons(lessons.filter((l) => l.difficulty === tier.key))
    if (inTier.length) groups.push({ tier, lessons: inTier })
  }
  return groups
}

export function getLesson<T extends { slug: string }>(lessons: T[], slug: string): T | undefined {
  if (!Array.isArray(lessons)) return undefined
  return lessons.find((l) => l.slug === slug)
}

export function relatedLessons<T extends { slug: string; related?: string[] }>(
  lessons: T[],
  lesson: T
): T[] {
  if (!lesson || !Array.isArray(lesson.related)) return []
  return lesson.related
    .map((slug) => lessons.find((l) => l.slug === slug))
    .filter((l): l is T => Boolean(l))
}
