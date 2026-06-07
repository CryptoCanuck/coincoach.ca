# Unit D (Glossary) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a crypto glossary — a new Contentlayer `Glossary` MDX document type, a seeded set of starter terms, an A–Z `/glossary` index with category filtering, and per-term `/glossary/[term]` pages — wired into nav and sitemap.

**Architecture:** Glossary terms are authored as one `.mdx` file per term under `data/glossary/` (decision: MDX-per-term, chosen by the user for rich, individually-indexable term pages). A new `Glossary` document type in `contentlayer.config.ts` generates `allGlossaries`. Pure, framework-free helpers in `lib/glossary.ts` (sort, group-by-letter, related lookup, category metadata) are unit-tested. The index page is server-rendered with a small `'use client'` filter component (search + category chips) that sorts/filters a server-passed array locally — no client fetching, CSP intact. Term pages render the MDX body via `MDXLayoutRenderer`, exactly like blog posts.

**Tech Stack:** Next.js 15 App Router, Contentlayer2, Pliny MDX (`MDXLayoutRenderer`), Tailwind v4, github-slugger, Vitest.

---

## File Structure

- `contentlayer.config.ts` — add `Glossary` document type + register in `documentTypes`.
- `data/glossary/*.mdx` — seeded term files (one per term).
- `lib/glossary.ts` — pure helpers + category metadata (no Contentlayer import; operates on injected arrays).
- `lib/glossary.test.ts` — Vitest unit tests for the pure helpers.
- `components/GlossaryFilter.tsx` — `'use client'` search + category-chip filter rendering the grouped list.
- `app/glossary/page.tsx` — server index page (Breadcrumb, heading, `GlossaryFilter`).
- `app/glossary/[term]/page.tsx` — server term page (`generateStaticParams`, `generateMetadata`, MDX body, related terms).
- `data/headerNavLinks.ts`, `components/Footer.tsx`, `components/CatBar.tsx`, `app/sitemap.ts` — wiring.

**Wiring note:** match the existing sibling-hub treatment (Topics): surface Glossary in `headerNavLinks` (mobile nav), `Footer`, `CatBar`, and `sitemap`. Do NOT add it to the hardcoded desktop `Header.tsx` nav (that bar intentionally shows only SECTIONS + Sentiment + Charts).

**Build/verify commands (this repo):**
- Type check: `corepack yarn tsc --noEmit`
- Unit tests: `corepack yarn vitest run`
- Full build (authoritative — runs ESLint incl. prettier + no-html-link rules, regenerates Contentlayer): `corepack yarn build`
- After any build/dev run, revert the regenerated tag file: `git checkout app/tag-data.json`
- LSP "module not found" on `contentlayer/generated` for new doc types is stale until a build regenerates types — trust `corepack yarn build`, not the editor.

---

### Task 1: Add the `Glossary` Contentlayer document type

**Files:**
- Modify: `contentlayer.config.ts` (add the doc type before `makeSource`; add to `documentTypes`)

- [ ] **Step 1: Define the document type**

Add this `defineDocumentType` block after the `Authors` document type definition and before `export default makeSource(...)`:

```ts
export const Glossary = defineDocumentType(() => ({
  name: 'Glossary',
  filePathPattern: 'glossary/**/*.mdx',
  contentType: 'mdx',
  fields: {
    term: { type: 'string', required: true },
    category: { type: 'string', required: true },
    related: { type: 'list', of: { type: 'string' }, default: [] },
    summary: { type: 'string' },
    draft: { type: 'boolean' },
  },
  computedFields,
}))
```

The shared `computedFields` (already defined near the top of the file) provides `slug`, `path`, `filePath`, `readingTime`, and `toc`. For a file `data/glossary/staking.mdx`, `flattenedPath` is `glossary/staking`, so `slug` resolves to `staking` and `path` to `glossary/staking`.

- [ ] **Step 2: Register the doc type**

Change the `documentTypes` array in `makeSource`:

```ts
  documentTypes: [Blog, Authors, Glossary],
```

Leave the `onSuccess` block unchanged (glossary terms are not added to the kbar search index in this unit — that is noted as future work).

- [ ] **Step 3: Regenerate and type-check**

Run: `corepack yarn build`
Expected: build succeeds; `.contentlayer/generated` now exports `allGlossaries` and a `Glossary` type. (There are no glossary files yet, so `allGlossaries` is an empty array — that is fine.)
Then: `git checkout app/tag-data.json`

- [ ] **Step 4: Commit**

```bash
git add contentlayer.config.ts
git commit -m "Add Glossary Contentlayer document type"
```

---

### Task 2: Pure glossary helpers + tests

**Files:**
- Create: `lib/glossary.ts`
- Test: `lib/glossary.test.ts`

These helpers are framework-free (no `contentlayer/generated` import) so they unit-test cleanly; pages pass `allGlossaries` in. Follow the existing `lib/topics.ts` style.

- [ ] **Step 1: Write the failing tests**

Create `lib/glossary.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  publishedGlossary,
  sortGlossary,
  groupByLetter,
  getGlossaryTerm,
  relatedEntries,
  categoryMeta,
  GLOSSARY_CATEGORIES,
} from './glossary'

type T = { slug: string; term: string; category: string; related?: string[]; draft?: boolean }

const sample: T[] = [
  { slug: 'staking', term: 'Staking', category: 'defi', related: ['proof-of-stake'] },
  { slug: 'bitcoin', term: 'Bitcoin', category: 'fundamentals' },
  { slug: 'proof-of-stake', term: 'Proof of Stake', category: 'fundamentals' },
  { slug: 'a-test', term: 'a test', category: 'fundamentals' },
  { slug: 'hidden', term: 'Hidden', category: 'defi', draft: true },
]

describe('publishedGlossary', () => {
  it('drops draft entries', () => {
    expect(publishedGlossary(sample).map((t) => t.slug)).not.toContain('hidden')
    expect(publishedGlossary(sample)).toHaveLength(4)
  })
  it('returns a non-array input as empty', () => {
    // @ts-expect-error testing runtime guard
    expect(publishedGlossary(undefined)).toEqual([])
  })
})

describe('sortGlossary', () => {
  it('sorts case-insensitively by term', () => {
    expect(sortGlossary(sample).map((t) => t.slug)).toEqual([
      'a-test',
      'bitcoin',
      'hidden',
      'proof-of-stake',
      'staking',
    ])
  })
  it('does not mutate the input', () => {
    const copy = [...sample]
    sortGlossary(sample)
    expect(sample).toEqual(copy)
  })
})

describe('groupByLetter', () => {
  it('groups by uppercased first letter in alphabetical order', () => {
    const groups = groupByLetter(publishedGlossary(sample))
    expect(groups.map((g) => g.letter)).toEqual(['A', 'B', 'P', 'S'])
    expect(groups[0].entries.map((e) => e.slug)).toEqual(['a-test'])
  })
  it('buckets non-alphabetic leading characters under #', () => {
    const groups = groupByLetter([{ slug: '0x', term: '0x Protocol', category: 'defi' }])
    expect(groups[0].letter).toBe('#')
  })
})

describe('getGlossaryTerm', () => {
  it('finds by slug', () => {
    expect(getGlossaryTerm(sample, 'staking')?.term).toBe('Staking')
  })
  it('returns undefined when missing', () => {
    expect(getGlossaryTerm(sample, 'nope')).toBeUndefined()
  })
})

describe('relatedEntries', () => {
  it('resolves related slugs to entries, preserving order and dropping misses', () => {
    const staking = getGlossaryTerm(sample, 'staking')!
    const related = relatedEntries(sample, staking)
    expect(related.map((e) => e.slug)).toEqual(['proof-of-stake'])
  })
  it('returns empty when related is missing', () => {
    expect(relatedEntries(sample, getGlossaryTerm(sample, 'bitcoin')!)).toEqual([])
  })
})

describe('categories', () => {
  it('every category key has metadata', () => {
    for (const c of GLOSSARY_CATEGORIES) {
      expect(categoryMeta(c.key).label).toBe(c.label)
    }
  })
  it('falls back gracefully for an unknown key', () => {
    expect(categoryMeta('unknown').label).toBe('Unknown')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack yarn vitest run lib/glossary.test.ts`
Expected: FAIL (module `./glossary` not found / exports missing).

- [ ] **Step 3: Implement `lib/glossary.ts`**

```ts
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
```

Note: `groupByLetter` sorts case-insensitively but a draft-vs-published filter is the caller's job; the test passes `publishedGlossary(sample)` where it expects drafts removed, and raw `sample` where it does not.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `corepack yarn vitest run lib/glossary.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add lib/glossary.ts lib/glossary.test.ts
git commit -m "Add pure glossary helpers with tests"
```

---

### Task 3: Seed starter glossary terms

**Files:**
- Create: `data/glossary/<slug>.mdx` (20 files)

Each file uses the frontmatter shape from the doc type. `term`, `category`, and `related` are frontmatter; the one- or two-sentence definition is the MDX body. Keep definitions plain-English and factual. These are AI-seeded starter definitions for the user to review/expand (note this in the PR body).

- [ ] **Step 1: Create all 20 term files**

Create each file exactly as below (filename = `data/glossary/<slug>.mdx`).

`data/glossary/blockchain.mdx`:
```mdx
---
term: 'Blockchain'
category: 'fundamentals'
summary: 'A shared, append-only ledger maintained across many computers.'
related: ['bitcoin', 'smart-contract']
---

A blockchain is a shared, append-only ledger of transactions maintained across many computers, where each block of records is cryptographically linked to the one before it. Because every participant holds a copy and new blocks must be agreed on by the network, the recorded history is very hard to alter after the fact.
```

`data/glossary/bitcoin.mdx`:
```mdx
---
term: 'Bitcoin'
category: 'fundamentals'
summary: 'The first and largest cryptocurrency, launched in 2009.'
related: ['blockchain', 'proof-of-work', 'halving']
---

Bitcoin is the first and largest cryptocurrency, launched in 2009 by the pseudonymous Satoshi Nakamoto. It runs on a proof-of-work blockchain and is designed to be a scarce, decentralized form of digital money with a fixed supply capped at 21 million coins.
```

`data/glossary/ethereum.mdx`:
```mdx
---
term: 'Ethereum'
category: 'fundamentals'
summary: 'A programmable blockchain for smart contracts and apps.'
related: ['smart-contract', 'gas', 'proof-of-stake']
---

Ethereum is a programmable blockchain that lets developers deploy smart contracts and decentralized applications. Its native token, ether (ETH), is used to pay for computation and transaction fees on the network.
```

`data/glossary/wallet.mdx`:
```mdx
---
term: 'Wallet'
category: 'security'
summary: 'Software or hardware that stores the keys to your crypto.'
related: ['private-key', 'seed-phrase', 'cold-storage']
---

A crypto wallet stores the keys that let you access and move your coins. "Hot" wallets stay connected to the internet for convenience, while "cold" wallets keep keys offline for stronger security.
```

`data/glossary/private-key.mdx`:
```mdx
---
term: 'Private Key'
category: 'security'
summary: 'The secret that proves ownership of crypto at an address.'
related: ['wallet', 'seed-phrase']
---

A private key is the secret number that proves ownership of the crypto at an address and authorizes transactions from it. Anyone who holds your private key controls your funds, so it must never be shared.
```

`data/glossary/seed-phrase.mdx`:
```mdx
---
term: 'Seed Phrase'
category: 'security'
summary: 'A 12–24 word backup that can restore a whole wallet.'
related: ['wallet', 'private-key', 'cold-storage']
---

A seed phrase (or recovery phrase) is a list of 12 to 24 words that can regenerate all the private keys in a wallet. It is the master backup of your funds and should be stored offline and never entered into untrusted apps.
```

`data/glossary/cold-storage.mdx`:
```mdx
---
term: 'Cold Storage'
category: 'security'
summary: 'Keeping private keys completely offline.'
related: ['wallet', 'seed-phrase']
---

Cold storage keeps private keys completely offline — for example on a hardware wallet or paper backup — so they cannot be reached by online attackers. It is the standard way to secure crypto you do not need to access often.
```

`data/glossary/smart-contract.mdx`:
```mdx
---
term: 'Smart Contract'
category: 'fundamentals'
summary: 'Self-executing code deployed on a blockchain.'
related: ['ethereum', 'defi', 'dao']
---

A smart contract is code deployed on a blockchain that runs exactly as written once its conditions are met, without an intermediary. Smart contracts power most DeFi, NFT and DAO applications.
```

`data/glossary/defi.mdx`:
```mdx
---
term: 'DeFi'
category: 'defi'
summary: 'Financial services built on blockchains without banks.'
related: ['smart-contract', 'stablecoin', 'staking']
---

DeFi (decentralized finance) refers to financial services — lending, trading, borrowing and earning yield — built on public blockchains using smart contracts instead of banks or brokers. Users keep custody of their assets and interact directly with the protocols.
```

`data/glossary/stablecoin.mdx`:
```mdx
---
term: 'Stablecoin'
category: 'defi'
summary: 'A crypto token designed to hold a steady value.'
related: ['defi', 'market-cap']
---

A stablecoin is a cryptocurrency designed to hold a steady value, usually pegged to a fiat currency like the US dollar. They are commonly used to move value between volatile crypto assets without cashing out.
```

`data/glossary/nft.mdx`:
```mdx
---
term: 'NFT'
category: 'nfts'
summary: 'A unique blockchain token representing ownership of an item.'
related: ['smart-contract', 'ethereum']
---

An NFT (non-fungible token) is a unique blockchain token that represents ownership of a specific item, such as digital art, collectibles or in-game assets. Unlike coins, each NFT is one-of-a-kind and not interchangeable.
```

`data/glossary/gas.mdx`:
```mdx
---
term: 'Gas'
category: 'fundamentals'
summary: 'The fee paid to process a blockchain transaction.'
related: ['ethereum', 'layer-2']
---

Gas is the fee paid to have a transaction processed and included on a blockchain like Ethereum. Fees rise when the network is busy because users bid for limited block space.
```

`data/glossary/proof-of-work.mdx`:
```mdx
---
term: 'Proof of Work'
category: 'fundamentals'
summary: 'Consensus secured by miners solving hard puzzles.'
related: ['mining', 'bitcoin', 'proof-of-stake']
---

Proof of work is a consensus method where miners compete to solve a hard computational puzzle to add the next block, spending real energy in the process. Bitcoin uses proof of work to secure its network.
```

`data/glossary/proof-of-stake.mdx`:
```mdx
---
term: 'Proof of Stake'
category: 'fundamentals'
summary: 'Consensus secured by validators staking tokens.'
related: ['staking', 'ethereum', 'proof-of-work']
---

Proof of stake is a consensus method where validators lock up (stake) tokens for the right to confirm blocks, and can lose their stake for misbehaving. It secures networks like modern Ethereum with far less energy than proof of work.
```

`data/glossary/staking.mdx`:
```mdx
---
term: 'Staking'
category: 'defi'
summary: 'Locking tokens to help secure a network and earn rewards.'
related: ['proof-of-stake', 'defi']
---

Staking means locking up tokens to help secure a proof-of-stake blockchain in exchange for rewards. It lets holders earn a yield while supporting the network.
```

`data/glossary/mining.mdx`:
```mdx
---
term: 'Mining'
category: 'fundamentals'
summary: 'Using computing power to validate blocks and earn coins.'
related: ['proof-of-work', 'halving', 'bitcoin']
---

Mining is the process of using computing power to validate transactions and add new blocks on a proof-of-work chain, earning newly issued coins and fees as a reward.
```

`data/glossary/halving.mdx`:
```mdx
---
term: 'Halving'
category: 'fundamentals'
summary: 'A scheduled cut to the block reward, slowing new supply.'
related: ['bitcoin', 'mining']
---

A halving is a scheduled event that cuts the reward miners receive for each new block in half, slowing the rate at which new coins are created. Bitcoin halves roughly every four years.
```

`data/glossary/market-cap.mdx`:
```mdx
---
term: 'Market Cap'
category: 'markets'
summary: 'Price multiplied by circulating supply.'
related: ['stablecoin', 'bitcoin']
---

Market capitalization is the total value of a cryptocurrency, calculated by multiplying its current price by the number of coins in circulation. It is a common way to compare the relative size of crypto assets.
```

`data/glossary/layer-2.mdx`:
```mdx
---
term: 'Layer 2'
category: 'fundamentals'
summary: 'A network on top of a base chain for faster, cheaper transactions.'
related: ['ethereum', 'gas']
---

A layer 2 is a network built on top of a base blockchain (layer 1) to process transactions faster and more cheaply, then settle back to the main chain for security. Rollups on Ethereum are a leading example.
```

`data/glossary/dao.mdx`:
```mdx
---
term: 'DAO'
category: 'fundamentals'
summary: 'A group governed by smart contracts and token-holder votes.'
related: ['smart-contract', 'defi']
---

A DAO (decentralized autonomous organization) is a group that coordinates and makes decisions through rules encoded in smart contracts and token-holder votes, rather than through a traditional management hierarchy.
```

- [ ] **Step 2: Build to validate the documents parse**

Run: `corepack yarn build`
Expected: build succeeds; Contentlayer reports 20 Glossary documents generated.
Then: `git checkout app/tag-data.json`

- [ ] **Step 3: Commit**

```bash
git add data/glossary
git commit -m "Seed 20 starter glossary terms"
```

---

### Task 4: Glossary filter (client) + index page

**Files:**
- Create: `components/GlossaryFilter.tsx`
- Create: `app/glossary/page.tsx`

Reference existing patterns: `components/MarketsTable.tsx` (client search + filter over a server-passed array), `app/topics/page.tsx` (server index with Breadcrumb + heading + `genPageMetadata`), `app/seo.tsx` (`genPageMetadata`).

- [ ] **Step 1: Implement the client filter**

`components/GlossaryFilter.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import Link from '@/components/Link'
import {
  GLOSSARY_CATEGORIES,
  categoryMeta,
  groupByLetter,
  sortGlossary,
} from '@/lib/glossary'

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
        !q ||
        t.term.toLowerCase().includes(q) ||
        (t.summary ?? '').toLowerCase().includes(q)
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
            className="bg-surface border-line text-ink-1 placeholder:text-ink-3 w-full rounded-lg border px-3 py-2 text-sm focus:border-accent focus:outline-none"
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
```

- [ ] **Step 2: Implement the index page**

`app/glossary/page.tsx`:

```tsx
import { allGlossaries } from 'contentlayer/generated'
import Breadcrumb from '@/components/Breadcrumb'
import Link from '@/components/Link'
import GlossaryFilter, { type GlossaryItem } from '@/components/GlossaryFilter'
import { publishedGlossary, sortGlossary } from '@/lib/glossary'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: 'Crypto Glossary',
  description:
    'Plain-English definitions of crypto and blockchain terms — from blockchain and DeFi to staking, gas and cold storage.',
  alternates: { canonical: '/glossary' },
})

export default function GlossaryPage() {
  const terms: GlossaryItem[] = sortGlossary(publishedGlossary(allGlossaries)).map((t) => ({
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
        Plain-English definitions of the terms you’ll meet across crypto. Browse by category or
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
```

- [ ] **Step 3: Build and smoke-check**

Run: `corepack yarn build`
Expected: build succeeds; `/glossary` is in the route list.
Then: `git checkout app/tag-data.json`

Optionally smoke locally (if a dev server is available): `/glossary` renders the A–Z grid; category chips and search filter the list.

- [ ] **Step 4: Commit**

```bash
git add components/GlossaryFilter.tsx app/glossary/page.tsx
git commit -m "Add glossary index page with category filter and search"
```

---

### Task 5: Term page `/glossary/[term]`

**Files:**
- Create: `app/glossary/[term]/page.tsx`

Reference: `app/blog/[...slug]/page.tsx` (MDX render via `MDXLayoutRenderer` + `components`), `app/topics/[topic]/page.tsx` (`generateStaticParams` + `generateMetadata` + `notFound`).

- [ ] **Step 1: Implement the term page**

`app/glossary/[term]/page.tsx`:

```tsx
import { allGlossaries } from 'contentlayer/generated'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import Breadcrumb from '@/components/Breadcrumb'
import Link from '@/components/Link'
import { notFound } from 'next/navigation'
import {
  publishedGlossary,
  getGlossaryTerm,
  relatedEntries,
  categoryMeta,
} from '@/lib/glossary'
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

export default async function GlossaryTermPage(props: {
  params: Promise<{ term: string }>
}) {
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
          <h2 className="text-sm font-extrabold tracking-wide text-white uppercase">Related terms</h2>
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
```

- [ ] **Step 2: Build and verify static generation**

Run: `corepack yarn build`
Expected: build succeeds; 20 `/glossary/[term]` pages are statically generated; the route count rises accordingly.
Then: `git checkout app/tag-data.json`

- [ ] **Step 3: Commit**

```bash
git add 'app/glossary/[term]/page.tsx'
git commit -m "Add glossary term detail pages"
```

---

### Task 6: Wire navigation and sitemap

**Files:**
- Modify: `data/headerNavLinks.ts`
- Modify: `components/Footer.tsx`
- Modify: `components/CatBar.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Mobile nav link**

In `data/headerNavLinks.ts`, add a Glossary entry after Topics:

```ts
  { href: '/topics', title: 'Topics' },
  { href: '/glossary', title: 'Glossary' },
  { href: '/about', title: 'About' },
```

- [ ] **Step 2: Footer link**

In `components/Footer.tsx`, add Glossary to the `Topics` column links (after `All Tags`):

```ts
    links: [
      { label: 'Topics', href: '/topics' },
      { label: 'Glossary', href: '/glossary' },
      { label: 'All Tags', href: '/tags' },
      { label: 'Blog Archive', href: '/blog' },
    ],
```

- [ ] **Step 3: CatBar link**

In `components/CatBar.tsx`, add Glossary to `ITEMS` after Topics:

```ts
  { label: 'Topics', href: '/topics' },
  { label: 'Glossary', href: '/glossary' },
```

- [ ] **Step 4: Sitemap**

In `app/sitemap.ts`:

1. Add the import:

```ts
import { allBlogs, allGlossaries } from 'contentlayer/generated'
```

2. Add `'glossary'` to `staticRoutes`:

```ts
  const staticRoutes = ['', 'blog', 'tags', 'charts', 'topics', 'glossary'].map((route) => ({
```

3. Add per-term routes (mirror `topicRoutes`), filtering drafts:

```ts
  const glossaryRoutes = allGlossaries
    .filter((t) => !t.draft)
    .map((t) => ({
      url: `${siteUrl}/glossary/${t.slug}`,
      lastModified,
    }))
```

4. Include them in the return:

```ts
  return [...staticRoutes, ...sectionRoutes, ...topicRoutes, ...glossaryRoutes, ...blogRoutes]
```

- [ ] **Step 5: Build and verify**

Run: `corepack yarn build`
Expected: build succeeds; no `@next/next/no-html-link-for-pages` or prettier errors.
Then: `git checkout app/tag-data.json`

- [ ] **Step 6: Commit**

```bash
git add data/headerNavLinks.ts components/Footer.tsx components/CatBar.tsx app/sitemap.ts
git commit -m "Surface Glossary in nav, footer, and sitemap"
```

---

## Self-Review

- **Spec coverage:** doc type (Task 1), helpers+tests (Task 2), seeded content (Task 3), index+filter (Task 4), term pages (Task 5), nav+sitemap (Task 6) — all present.
- **Type consistency:** `GlossaryItem` (index/filter) carries `slug/term/category/summary`; helpers are generic over `{term}/{slug}/{related}/{draft}`; `relatedEntries`/`getGlossaryTerm` take `(terms, …)` arg order consistently; pages pass `allGlossaries` (which satisfies those shapes plus `body.code`).
- **No placeholders:** all code and all 20 term definitions are written out in full.
- **CSP:** no client fetching; the filter sorts/filters a server-passed array.
- **Build discipline:** every page/component/config task ends in `corepack yarn build` + `git checkout app/tag-data.json` (tsc alone is insufficient for `.tsx`/ESLint rules).
