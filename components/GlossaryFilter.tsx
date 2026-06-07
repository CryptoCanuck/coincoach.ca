'use client'

import { useMemo, useState } from 'react'
import Link from '@/components/Link'
import { GLOSSARY_CATEGORIES, categoryMeta, groupByLetter, sortGlossary } from '@/lib/glossary'

export interface GlossaryItem {
  slug: string
  term: string
  category: string
  summary?: string
}

export default function GlossaryFilter({ terms }: { terms: GlossaryItem[] }) {
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortGlossary(terms).filter((t) => {
      const matchesCat = activeCat === 'all' || t.category === activeCat
      const matchesQuery =
        !q || t.term.toLowerCase().includes(q) || (t.summary ?? '').toLowerCase().includes(q)
      return matchesCat && matchesQuery
    })
  }, [terms, query, activeCat])

  const groups = useMemo(() => groupByLetter(filtered), [filtered])

  return (
    <div>
      <div className="mt-6 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter terms by category">
          <button
            type="button"
            onClick={() => setActiveCat('all')}
            aria-pressed={activeCat === 'all'}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              activeCat === 'all'
                ? 'bg-accent text-[#3a2400]'
                : 'bg-surface text-ink-2 hover:text-white'
            }`}
          >
            All
          </button>
          {GLOSSARY_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCat(cat.key)}
              aria-pressed={activeCat === cat.key}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                activeCat === cat.key
                  ? 'bg-accent text-[#3a2400]'
                  : 'bg-surface text-ink-2 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="sm:w-64">
          <label htmlFor="glossary-search" className="sr-only">
            Search glossary terms
          </label>
          <input
            id="glossary-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms…"
            className="bg-surface border-line text-ink-1 placeholder:text-ink-3 focus:border-accent w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-ink-2 mt-8 text-sm">No terms match your search.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.letter}>
              <h2 className="text-accent mb-3 text-lg font-black">{group.letter}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.entries.map((entry) => {
                  const meta = categoryMeta(entry.category)
                  return (
                    <Link
                      key={entry.slug}
                      href={`/glossary/${entry.slug}`}
                      className="bg-surface border-line hover:border-accent flex flex-col gap-1.5 rounded-[10px] border p-4 transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-extrabold text-gray-50">
                          {entry.term}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                          style={{ background: `${meta.color}22`, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      {entry.summary ? (
                        <span className="text-ink-3 text-xs leading-relaxed font-medium">
                          {entry.summary}
                        </span>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
