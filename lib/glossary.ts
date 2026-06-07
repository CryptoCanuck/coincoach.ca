export interface GlossaryCategory {
  key: string
  label: string
  color: string
}

// Category buckets used for filter chips + the per-term category tag.
// Colours reuse the Direction-B accent palette.
export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  { key: 'fundamentals', label: 'Fundamentals', color: '#3FA7DA' },
  { key: 'defi', label: 'DeFi', color: '#7BC23A' },
  { key: 'security', label: 'Security', color: '#EB5E45' },
  { key: 'nfts', label: 'NFTs', color: '#B07BE0' },
  { key: 'markets', label: 'Markets', color: '#F2A024' },
]

export function categoryMeta(key: string): GlossaryCategory {
  return (
    GLOSSARY_CATEGORIES.find((c) => c.key === key) ?? {
      key,
      label: key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown',
      color: '#7A8699',
    }
  )
}

export function publishedGlossary<T extends { draft?: boolean }>(terms: T[]): T[] {
  if (!Array.isArray(terms)) return []
  return terms.filter((t) => t.draft !== true)
}

export function sortGlossary<T extends { term: string }>(terms: T[]): T[] {
  if (!Array.isArray(terms)) return []
  return [...terms].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }))
}

export interface LetterGroup<T> {
  letter: string
  entries: T[]
}

export function groupByLetter<T extends { term: string }>(terms: T[]): LetterGroup<T>[] {
  const sorted = sortGlossary(terms)
  const groups: LetterGroup<T>[] = []
  for (const entry of sorted) {
    const first = entry.term.trim().charAt(0).toUpperCase()
    const letter = /[A-Z]/.test(first) ? first : '#'
    const last = groups[groups.length - 1]
    if (last && last.letter === letter) {
      last.entries.push(entry)
    } else {
      groups.push({ letter, entries: [entry] })
    }
  }
  return groups
}

export function getGlossaryTerm<T extends { slug: string }>(
  terms: T[],
  slug: string
): T | undefined {
  if (!Array.isArray(terms)) return undefined
  return terms.find((t) => t.slug === slug)
}

export function relatedEntries<T extends { slug: string; related?: string[] }>(
  terms: T[],
  entry: T
): T[] {
  if (!entry || !Array.isArray(entry.related)) return []
  return entry.related
    .map((slug) => terms.find((t) => t.slug === slug))
    .filter((t): t is T => Boolean(t))
}
