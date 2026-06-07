# Learn Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a structured "Learn" hub: a new Contentlayer `Lesson` MDX content type organised into Beginner / Intermediate / Advanced tiers, surfaced at `/learn` (tiered index) and `/learn/[lesson]` (detail).

**Architecture:** Mirror the shipped Glossary unit exactly. A new `Lesson` Contentlayer document type holds purpose-written lesson MDX under `data/learn/`. Pure, unit-tested helpers in `lib/learn.ts` define the difficulty tiers and group/sort/relate lessons (no Contentlayer import — generic over `<T extends {...}>`, exactly like `lib/glossary.ts`). Two server components render the index (three difficulty buckets) and the lesson detail (MDX + tier badge + related). Content is server-rendered; no client fetching; CSP intact.

**Tech Stack:** Next 15 App Router (RSC), Contentlayer2 + Pliny MDX, Tailwind v4, Vitest. Build/lint via `corepack yarn build` (Yarn Berry — `yarn` is not on PATH). Unit tests via `corepack yarn vitest run`.

**Key conventions (from this repo):**
- The Contentlayer document discriminator field is `type` — **never** add a frontmatter field named `type`. The `Lesson` type uses `difficulty`, not `type`.
- `computedFields` (shared in `contentlayer.config.ts`) already provides `slug`, `path`, `readingTime`, `toc` to every doc type — the `Lesson` type just spreads it.
- The generated export for a doc type named `Lesson` is `allLessons` from `contentlayer/generated`.
- Site has `trailingSlash: true`; canonical paths in metadata are written without the trailing slash (matches Glossary).
- All commits are authored solely by the user — **no AI co-author trailer**.
- The generated `app/tag-data.json` may change during a build; `git checkout -- app/tag-data.json` before committing if it does (it is unrelated to this unit).

**File structure:**
- Create `lib/learn.ts` — tier registry + pure helpers (`DIFFICULTY_TIERS`, `tierMeta`, `publishedLessons`, `sortLessons`, `lessonsByTier`, `getLesson`, `relatedLessons`).
- Create `lib/learn.test.ts` — unit tests for the helpers.
- Modify `contentlayer.config.ts` — add the `Lesson` document type + register it in `documentTypes`.
- Create `data/learn/*.mdx` — 9 seed lessons (3 per tier).
- Create `components/LessonCard.tsx` — lesson card (tier badge + read time + title + summary).
- Create `app/learn/page.tsx` — tiered index.
- Create `app/learn/[lesson]/page.tsx` — lesson detail.
- Modify `data/headerNavLinks.ts`, `components/CatBar.tsx`, `components/Footer.tsx`, `app/sitemap.ts` — wiring.

---

### Task 1: `lib/learn.ts` pure helpers (TDD)

**Files:**
- Create: `lib/learn.ts`
- Test: `lib/learn.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/learn.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  publishedLessons,
  sortLessons,
  lessonsByTier,
  getLesson,
  relatedLessons,
  tierMeta,
  DIFFICULTY_TIERS,
} from './learn'

type L = {
  slug: string
  title: string
  difficulty: string
  order?: number
  related?: string[]
  draft?: boolean
}

const sample: L[] = [
  { slug: 'b2', title: 'Blockchain Basics', difficulty: 'beginner', order: 2 },
  { slug: 'b1', title: 'What Is Crypto', difficulty: 'beginner', order: 1, related: ['b2', 'x'] },
  { slug: 'adv', title: 'Consensus', difficulty: 'advanced', order: 1 },
  { slug: 'mid', title: 'DeFi', difficulty: 'intermediate', order: 1 },
  { slug: 'hidden', title: 'Hidden', difficulty: 'beginner', order: 3, draft: true },
  { slug: 'noord', title: 'Zeta', difficulty: 'beginner' },
]

describe('publishedLessons', () => {
  it('drops draft entries', () => {
    expect(publishedLessons(sample).map((l) => l.slug)).not.toContain('hidden')
    expect(publishedLessons(sample)).toHaveLength(5)
  })
  it('returns a non-array input as empty', () => {
    // @ts-expect-error testing runtime guard
    expect(publishedLessons(undefined)).toEqual([])
  })
})

describe('sortLessons', () => {
  it('sorts by order ascending, missing order last, ties by title', () => {
    expect(sortLessons(sample.filter((l) => l.difficulty === 'beginner')).map((l) => l.slug)).toEqual([
      'b1',
      'b2',
      'hidden',
      'noord',
    ])
  })
  it('does not mutate the input', () => {
    const copy = [...sample]
    sortLessons(sample)
    expect(sample).toEqual(copy)
  })
})

describe('lessonsByTier', () => {
  it('groups in beginner→advanced order, only non-empty tiers, sorted within', () => {
    const groups = lessonsByTier(publishedLessons(sample))
    expect(groups.map((g) => g.tier.key)).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(groups[0].lessons.map((l) => l.slug)).toEqual(['b1', 'b2', 'noord'])
  })
  it('omits tiers with no lessons', () => {
    const groups = lessonsByTier([{ slug: 'a', title: 'A', difficulty: 'advanced', order: 1 }])
    expect(groups.map((g) => g.tier.key)).toEqual(['advanced'])
  })
  it('returns a non-array input as empty', () => {
    // @ts-expect-error testing runtime guard
    expect(lessonsByTier(undefined)).toEqual([])
  })
})

describe('getLesson', () => {
  it('finds by slug', () => {
    expect(getLesson(sample, 'mid')?.title).toBe('DeFi')
  })
  it('returns undefined when missing', () => {
    expect(getLesson(sample, 'nope')).toBeUndefined()
  })
})

describe('relatedLessons', () => {
  it('resolves related slugs, preserving order and dropping misses', () => {
    const b1 = getLesson(sample, 'b1')!
    expect(relatedLessons(sample, b1).map((l) => l.slug)).toEqual(['b2'])
  })
  it('returns empty when related is missing', () => {
    expect(relatedLessons(sample, getLesson(sample, 'mid')!)).toEqual([])
  })
})

describe('tiers', () => {
  it('every tier key has metadata', () => {
    for (const t of DIFFICULTY_TIERS) {
      expect(tierMeta(t.key).label).toBe(t.label)
    }
  })
  it('falls back gracefully for an unknown key', () => {
    expect(tierMeta('unknown').label).toBe('Unknown')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `corepack yarn vitest run lib/learn.test.ts`
Expected: FAIL — `Failed to resolve import "./learn"` / module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/learn.ts`:

```ts
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
    const ao = Number.isFinite(a.order) ? a.order! : Number.MAX_SAFE_INTEGER
    const bo = Number.isFinite(b.order) ? b.order! : Number.MAX_SAFE_INTEGER
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
  if (!Array.isArray(lessons)) return []
  if (!lesson || !Array.isArray(lesson.related)) return []
  return lesson.related
    .map((slug) => lessons.find((l) => l.slug === slug))
    .filter((l): l is T => Boolean(l))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `corepack yarn vitest run lib/learn.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add lib/learn.ts lib/learn.test.ts
git commit -m "Add learn-hub tier registry and lesson helpers"
```

---

### Task 2: `Lesson` Contentlayer doc type + seed content

**Files:**
- Modify: `contentlayer.config.ts` (add `Lesson` doc type after the `Glossary` definition near line 200; add `Lesson` to the `documentTypes` array in `makeSource`)
- Create: `data/learn/what-is-cryptocurrency.mdx`, `data/learn/what-is-a-blockchain.mdx`, `data/learn/crypto-wallets-explained.mdx`, `data/learn/how-transactions-work.mdx`, `data/learn/understanding-defi.mdx`, `data/learn/staking-and-yield.mdx`, `data/learn/consensus-mechanisms.mdx`, `data/learn/layer-2-scaling.mdx`, `data/learn/smart-contract-risk.mdx`

- [ ] **Step 1: Add the `Lesson` document type**

In `contentlayer.config.ts`, immediately after the `export const Glossary = defineDocumentType(...)` block, add:

```ts
export const Lesson = defineDocumentType(() => ({
  name: 'Lesson',
  filePathPattern: 'learn/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title: { type: 'string', required: true },
    summary: { type: 'string' },
    difficulty: {
      type: 'enum',
      options: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    order: { type: 'number' },
    related: { type: 'list', of: { type: 'string' }, default: [] },
    draft: { type: 'boolean' },
  },
  computedFields,
}))
```

- [ ] **Step 2: Register the type in `makeSource`**

In the same file, change the `documentTypes` array in the `makeSource({...})` call from:

```ts
  documentTypes: [Blog, Authors, Glossary],
```

to:

```ts
  documentTypes: [Blog, Authors, Glossary, Lesson],
```

- [ ] **Step 3: Create the 9 seed lessons**

Create `data/learn/what-is-cryptocurrency.mdx`:

```mdx
---
title: 'What Is Cryptocurrency?'
summary: 'Digital money that runs on open networks instead of banks — the core idea in plain English.'
difficulty: 'beginner'
order: 1
related: ['what-is-a-blockchain', 'crypto-wallets-explained']
---

Cryptocurrency is digital money that runs on an open, decentralized network instead of through a bank. Coins like Bitcoin and Ethereum are issued and verified by software running across thousands of computers worldwide, so no single company or government is in charge.

Instead of an account at an institution, you prove ownership with a pair of cryptographic keys: a public address others can send to, and a private key only you control. Whoever holds the private key controls the funds — which is why protecting it matters so much.

Two things make crypto different from the money in your bank app: transactions are **irreversible** once confirmed, and the network runs **24/7** without a middleman. That openness is powerful, but it also means there's no support line to reverse a mistake or a scam. Treat your first transactions as small experiments while you learn.
```

Create `data/learn/what-is-a-blockchain.mdx`:

```mdx
---
title: 'What Is a Blockchain?'
summary: 'The shared, tamper-resistant ledger that records every crypto transaction.'
difficulty: 'beginner'
order: 2
related: ['what-is-cryptocurrency', 'how-transactions-work']
---

A blockchain is a shared record of transactions that no single party can quietly edit. Think of it as a public spreadsheet that thousands of computers each keep a copy of and constantly check against one another.

Transactions are bundled into **blocks**. Each new block includes a cryptographic fingerprint of the block before it, linking them into a chain. Changing an old transaction would change every fingerprint after it — so tampering is immediately obvious to the rest of the network.

Because everyone holds the same copy and agrees on the rules, the blockchain becomes a single source of truth without a central authority. This is what lets strangers transact directly, and what makes balances and history auditable by anyone. Different blockchains make different trade-offs between speed, cost, and decentralization, which is why Bitcoin, Ethereum, and newer networks behave so differently.
```

Create `data/learn/crypto-wallets-explained.mdx`:

```mdx
---
title: 'Crypto Wallets Explained'
summary: 'What a wallet actually stores, and the difference between hot and cold storage.'
difficulty: 'beginner'
order: 3
related: ['what-is-cryptocurrency', 'smart-contract-risk']
---

A crypto wallet does not "hold" coins the way a physical wallet holds cash. Your coins live on the blockchain; the wallet stores the **private keys** that prove the coins are yours and let you spend them.

Wallets come in two broad types. A **hot wallet** is connected to the internet — a phone or browser app that's convenient for everyday use but more exposed to hacks. A **cold wallet** keeps keys offline, often on a dedicated hardware device, which is far safer for larger, long-term holdings.

Most wallets show you a **recovery phrase** (usually 12 or 24 words) when you set them up. Anyone with that phrase can take your funds, and no one can restore it if you lose it. Write it down, store it offline, and never type it into a website or share it — legitimate services will never ask for it.
```

Create `data/learn/how-transactions-work.mdx`:

```mdx
---
title: 'How Crypto Transactions Work'
summary: 'From signing with your key to confirmation on-chain — and why fees exist.'
difficulty: 'intermediate'
order: 1
related: ['what-is-a-blockchain', 'consensus-mechanisms']
---

When you send crypto, your wallet creates a transaction and **signs** it with your private key. That signature proves you authorised the transfer without ever revealing the key itself. The signed transaction is then broadcast to the network.

Validators (or miners) pick up pending transactions, check that the signature is valid and the funds exist, and include them in the next block. Once a block is added and a few more are built on top of it, the transaction is considered **confirmed** — practically irreversible.

You pay a **network fee** for this. Fees compensate validators for the work and prevent spam, and they rise when the network is busy because there's limited room in each block. This is why the same transfer can cost cents one day and much more during a market frenzy. Many wallets let you choose a fee level, trading cost against confirmation speed.
```

Create `data/learn/understanding-defi.mdx`:

```mdx
---
title: 'Understanding DeFi'
summary: 'Lending, trading, and earning yield through code instead of banks.'
difficulty: 'intermediate'
order: 2
related: ['staking-and-yield', 'smart-contract-risk']
---

DeFi — decentralized finance — rebuilds financial services like lending, borrowing, and trading as open software running on a blockchain, with no bank or broker in the middle. The programs that run these services are called **smart contracts**.

Instead of a company matching buyers and lenders, DeFi apps use pooled funds and automated rules. On a decentralized exchange, you trade against a **liquidity pool** rather than a counterparty. In lending protocols, you deposit assets that others borrow, and you earn the interest they pay.

The appeal is openness: anyone with a wallet can use these services permissionlessly, and the rules are visible in code. The risks are real too — bugs in a smart contract can drain funds, and there's no customer support or deposit insurance. DeFi rewards people who understand exactly what they're interacting with, so start small and read each protocol's documentation before committing funds.
```

Create `data/learn/staking-and-yield.mdx`:

```mdx
---
title: 'Staking and Earning Yield'
summary: 'How locking up coins helps secure a network — and earns rewards.'
difficulty: 'intermediate'
order: 3
related: ['understanding-defi', 'consensus-mechanisms']
---

Staking means locking up coins to help secure a proof-of-stake blockchain. In return for committing your funds and (directly or through a validator) helping confirm transactions, the network pays you rewards — a yield expressed as an annual percentage.

You can stake in a few ways. **Solo staking** means running your own validator, which earns the most but requires technical setup and a minimum deposit. **Delegated** or **pooled** staking lets you contribute a smaller amount through a validator or exchange that runs the infrastructure for you, sharing the rewards.

Yield is not free money. Staked funds are often **locked** for a period and can't be sold instantly, so you carry price risk the whole time. Some networks can also **slash** (penalise) a validator that misbehaves or goes offline, which can cost delegators a share of their stake. Understand the lock-up, the validator's track record, and the real source of the yield before staking.
```

Create `data/learn/consensus-mechanisms.mdx`:

```mdx
---
title: 'Consensus Mechanisms: PoW vs PoS'
summary: 'How decentralized networks agree on one shared history without a referee.'
difficulty: 'advanced'
order: 1
related: ['how-transactions-work', 'staking-and-yield']
---

Consensus is how a decentralized network agrees on which transactions are valid and in what order — without a central referee. Two mechanisms dominate.

**Proof of Work (PoW)**, used by Bitcoin, has miners compete to solve a hard computational puzzle. The winner proposes the next block and earns a reward. Rewriting history would require redoing all that work faster than the rest of the network combined, which is prohibitively expensive. The cost is enormous energy use.

**Proof of Stake (PoS)**, used by Ethereum and most newer chains, replaces computation with economic stake. Validators put up collateral and are chosen to propose and attest to blocks; dishonest behaviour gets their stake **slashed**. It achieves similar security guarantees using a fraction of the energy.

Both aim for the same outcome — making it far more costly to attack the network than to follow the rules — but they differ sharply in energy use, hardware requirements, and how new participants get involved.
```

Create `data/learn/layer-2-scaling.mdx`:

```mdx
---
title: 'Layer-2 Scaling Explained'
summary: 'How rollups make blockchains faster and cheaper without giving up security.'
difficulty: 'advanced'
order: 2
related: ['how-transactions-work', 'understanding-defi']
---

Popular blockchains can only fit so many transactions in each block, so when demand spikes, fees climb and confirmations slow. **Layer-2** networks fix this by moving most activity off the main chain (Layer 1) while still inheriting its security.

The leading approach is the **rollup**. A rollup executes many transactions on a separate, cheaper chain, then posts a compressed summary back to Layer 1. **Optimistic rollups** assume the summary is valid and allow a challenge window to dispute fraud; **zero-knowledge (ZK) rollups** post a cryptographic proof that the batch was processed correctly, so no challenge period is needed.

Either way, users get much lower fees and faster transactions while the main chain remains the ultimate source of truth. The trade-offs show up in withdrawal times, how decentralized the rollup's operators are, and the maturity of the technology — worth checking before you bridge significant funds onto one.
```

Create `data/learn/smart-contract-risk.mdx`:

```mdx
---
title: 'Smart Contract Risk and Security'
summary: 'Why code-based finance can fail, and how to size up a protocol before you use it.'
difficulty: 'advanced'
order: 3
related: ['understanding-defi', 'crypto-wallets-explained']
---

Smart contracts are programs that move real money automatically, and "the code is the rule" cuts both ways: a bug or a loophole can be exploited just as automatically. Most large DeFi losses trace back to flawed contract code rather than broken cryptography.

Common failure modes include **reentrancy** (a contract is tricked into paying out repeatedly before it updates its balances), **oracle manipulation** (feeding a protocol a fake price to borrow against), and simple logic errors in upgrade or admin functions. Because deployed contracts are often immutable, a shipped bug can't always be patched.

Before trusting a protocol, look for independent **security audits**, a public bug-bounty program, a track record of time in production handling real value, and transparency about who controls upgrade keys. None of these guarantee safety, but their absence is a red flag. The safest habit is the same one from wallets: start with amounts you can afford to lose.
```

- [ ] **Step 4: Regenerate Contentlayer and verify the type + content**

Run: `corepack yarn build`
Expected: Build succeeds. Contentlayer logs "Generated ... documents" including the 9 Lesson documents. No type errors. (If `app/tag-data.json` changed, that's unrelated — leave it for now; it's reverted before commit.)

Verify the generated export exists:

Run: `grep -c "allLessons" .contentlayer/generated/index.mjs`
Expected: a non-zero count (the `allLessons` export was generated).

- [ ] **Step 5: Commit**

```bash
git checkout -- app/tag-data.json 2>/dev/null || true
git add contentlayer.config.ts data/learn
git commit -m "Add Lesson content type with nine seed lessons"
```

---

### Task 3: `LessonCard` + `/learn` tiered index

**Files:**
- Create: `components/LessonCard.tsx`
- Create: `app/learn/page.tsx`

- [ ] **Step 1: Create the lesson card**

Create `components/LessonCard.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the index page**

Create `app/learn/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Build to verify the page compiles and renders**

Run: `corepack yarn build`
Expected: Build succeeds; `/learn` appears in the route list as a static route.

- [ ] **Step 4: Smoke-test the rendered page**

Start a dev server on an unused port and check the index lists the three tiers:

Run:
```bash
corepack yarn dev -p 3099 >/tmp/learn-dev.log 2>&1 &
sleep 8
curl -s http://localhost:3099/learn/ | grep -oE 'Beginner|Intermediate|Advanced|What Is Cryptocurrency' | sort -u
lsof -ti tcp:3099 | xargs -r kill -9
```
Expected: prints `Advanced`, `Beginner`, `Intermediate`, `What Is Cryptocurrency`.

- [ ] **Step 5: Commit**

```bash
git checkout -- app/tag-data.json 2>/dev/null || true
git add components/LessonCard.tsx app/learn/page.tsx
git commit -m "Add Learn index with difficulty-tiered lesson buckets"
```

---

### Task 4: `/learn/[lesson]` detail page

**Files:**
- Create: `app/learn/[lesson]/page.tsx`

- [ ] **Step 1: Create the detail page**

Create `app/learn/[lesson]/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Build to verify static params + page compile**

Run: `corepack yarn build`
Expected: Build succeeds; 9 `/learn/[lesson]` routes are pre-rendered (one per lesson).

- [ ] **Step 3: Smoke-test a lesson page and a 404**

Run:
```bash
corepack yarn dev -p 3099 >/tmp/learn-dev.log 2>&1 &
sleep 8
echo "valid:"; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3099/learn/understanding-defi/
echo "body has related:"; curl -s http://localhost:3099/learn/understanding-defi/ | grep -oE 'Related lessons|Staking and Earning Yield' | sort -u
echo "missing:"; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3099/learn/does-not-exist/
lsof -ti tcp:3099 | xargs -r kill -9
```
Expected: valid → `200`; body shows `Related lessons` and `Staking and Earning Yield`; missing → `404`.

- [ ] **Step 4: Commit**

```bash
git checkout -- app/tag-data.json 2>/dev/null || true
git add "app/learn/[lesson]/page.tsx"
git commit -m "Add Learn lesson detail page"
```

---

### Task 5: Wire Learn into nav, CatBar, footer, sitemap

**Files:**
- Modify: `data/headerNavLinks.ts`
- Modify: `components/CatBar.tsx`
- Modify: `components/Footer.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add Learn to the header nav**

In `data/headerNavLinks.ts`, add the Learn link directly after the Guides entry:

```ts
  { href: '/guides', title: 'Guides' },
  { href: '/learn', title: 'Learn' },
  { href: '/breakdowns', title: 'Breakdowns' },
```

- [ ] **Step 2: Add Learn to the CatBar**

In `components/CatBar.tsx`, add a Learn item to the `ITEMS` array, after the Glossary entry:

```ts
  { label: 'Topics', href: '/topics' },
  { label: 'Glossary', href: '/glossary' },
  { label: 'Learn', href: '/learn' },
```

- [ ] **Step 3: Add Learn to the footer**

In `components/Footer.tsx`, in the `Topics` heading group's `links` array, add Learn as the first item:

```ts
    heading: 'Topics',
    links: [
      { label: 'Learn', href: '/learn' },
      { label: 'Topics', href: '/topics' },
      { label: 'Glossary', href: '/glossary' },
      { label: 'All Tags', href: '/tags' },
      { label: 'Blog Archive', href: '/blog' },
    ],
```

- [ ] **Step 4: Add Learn routes to the sitemap**

In `app/sitemap.ts`:

Change the import to also pull `allLessons`:

```ts
import { allBlogs, allGlossaries, allLessons } from 'contentlayer/generated'
```

Add `'learn'` to the `staticRoutes` route list:

```ts
  const staticRoutes = ['', 'blog', 'tags', 'charts', 'topics', 'glossary', 'learn'].map(
    (route) => ({
      url: `${siteUrl}/${route}`,
      lastModified,
    })
  )
```

After the `glossaryRoutes` block, add a `lessonRoutes` block:

```ts
  const lessonRoutes = allLessons
    .filter((l) => !l.draft)
    .map((l) => ({
      url: `${siteUrl}/learn/${l.slug}`,
      lastModified,
    }))
```

And include it in the returned array:

```ts
  return [
    ...staticRoutes,
    ...sectionRoutes,
    ...topicRoutes,
    ...glossaryRoutes,
    ...lessonRoutes,
    ...blogRoutes,
  ]
}
```

- [ ] **Step 5: Build and verify wiring**

Run: `corepack yarn build`
Expected: Build succeeds with no type/lint errors.

Run:
```bash
corepack yarn dev -p 3099 >/tmp/learn-dev.log 2>&1 &
sleep 8
echo "nav shows Learn:"; curl -s http://localhost:3099/ | grep -oE 'href="/learn"' | head -1
echo "sitemap has learn lessons:"; curl -s http://localhost:3099/sitemap.xml | grep -oE '/learn/[a-z-]+' | sort -u | head
lsof -ti tcp:3099 | xargs -r kill -9
```
Expected: `href="/learn"` present; sitemap lists `/learn/...` lesson URLs.

- [ ] **Step 6: Commit**

```bash
git checkout -- app/tag-data.json 2>/dev/null || true
git add data/headerNavLinks.ts components/CatBar.tsx components/Footer.tsx app/sitemap.ts
git commit -m "Surface Learn hub in nav, category bar, footer and sitemap"
```

---

## Final verification (after all tasks)

- [ ] **Full test suite**

Run: `corepack yarn vitest run`
Expected: all tests pass, including the new `lib/learn.test.ts`.

- [ ] **Full production build**

Run: `corepack yarn build`
Expected: clean build; `/learn` static route + 9 `/learn/[lesson]` pre-rendered routes; no ESLint/prettier/type errors.

- [ ] **Revert generated artifact if changed**

Run: `git checkout -- app/tag-data.json 2>/dev/null || true`

- [ ] Dispatch the final holistic code review over the whole branch, then proceed to the PR / CodeRabbit loop.

---

## Self-Review notes

**Spec coverage:**
- New `Lesson` Contentlayer doc type → Task 2. ✅
- Difficulty/order frontmatter → Task 2 fields (`difficulty` enum, `order` number). ✅
- Difficulty-tiered buckets → `lessonsByTier` (Task 1) + index sections (Task 3). ✅
- `/learn` index + `/learn/[lesson]` detail → Tasks 3, 4. ✅
- Seed content (purpose-written lessons) → Task 2, 9 lessons across 3 tiers. ✅
- Nav/CatBar/Footer/sitemap wiring → Task 5. ✅
- Unit tests for pure helpers → Task 1. ✅

**Type consistency:** `Lesson` fields (`title`, `summary`, `difficulty`, `order`, `related`, `draft`) match the helper generics in `lib/learn.ts` and the property access in `app/learn/page.tsx` / `app/learn/[lesson]/page.tsx` (`l.readingTime.minutes` comes from shared `computedFields`; `entry.body.code` from Contentlayer MDX). Helper names (`publishedLessons`, `sortLessons`, `lessonsByTier`, `getLesson`, `relatedLessons`, `tierMeta`, `DIFFICULTY_TIERS`) are identical across the test, the lib, and both pages. Related-slug values in the seed lessons (`what-is-a-blockchain`, `crypto-wallets-explained`, etc.) all correspond to real lesson file slugs.

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N" — every step contains full code or content.
