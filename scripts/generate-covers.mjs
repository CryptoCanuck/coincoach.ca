/**
 * Generate branded cover images for blog posts that have no `images` frontmatter.
 *
 * Each cover is a deterministic 1200x675 JPEG derived from the post slug:
 * dark Direction-B base, category-colored gradient wash, coin-ring motif,
 * a seeded sparkline, optional ticker watermark (from `coins` frontmatter),
 * a category label, and the CoinCoach wordmark.
 *
 * Usage:
 *   node scripts/generate-covers.mjs            # generate missing covers only
 *   node scripts/generate-covers.mjs --force    # regenerate all covers
 *
 * The script also inserts `images: ['/images/covers/<slug>.jpg']` into the
 * frontmatter of any post it generated a cover for, so cards, article heroes,
 * and Open Graph tags pick it up. Re-running is a no-op for covered posts.
 */
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const ROOT = process.cwd()
const BLOG_DIR = path.join(ROOT, 'data', 'blog')
const OUT_DIR = path.join(ROOT, 'public', 'images', 'covers')
const WIDTH = 1200
const HEIGHT = 675
const FORCE = process.argv.includes('--force')

const CATEGORY_COLORS = {
  news: '#3fa7da',
  guide: '#7bc23a',
  breakdown: '#c964c9',
  review: '#f2a024',
}

const TICKERS = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  chainlink: 'LINK',
  avalanche: 'AVAX',
  'avalanche-2': 'AVAX',
  'matic-network': 'POL',
  'polygon-ecosystem-token': 'POL',
  'the-open-network': 'TON',
  toncoin: 'TON',
  ripple: 'XRP',
  cardano: 'ADA',
  dogecoin: 'DOGE',
  litecoin: 'LTC',
  tron: 'TRX',
  polkadot: 'DOT',
  uniswap: 'UNI',
  aave: 'AAVE',
  stellar: 'XLM',
  monero: 'XMR',
  'cosmos-hub': 'ATOM',
  cosmos: 'ATOM',
  near: 'NEAR',
  aptos: 'APT',
  sui: 'SUI',
  arbitrum: 'ARB',
  optimism: 'OP',
  'hedera-hashgraph': 'HBAR',
  'shiba-inu': 'SHIB',
  'binancecoin': 'BNB',
  'usd-coin': 'USDC',
  tether: 'USDT',
}

/** Small deterministic PRNG so each slug always produces the same artwork. */
function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashSlug(slug) {
  let h = 2166136261
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  const fm = match[1]
  const get = (key) => {
    const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
    return m ? m[1].trim() : undefined
  }
  const coinsRaw = get('coins') ?? ''
  const coins = [...coinsRaw.matchAll(/'([^']+)'/g)].map((m) => m[1])
  return {
    postType: (get('postType') ?? 'news').replace(/['"]/g, ''),
    hasImages: /^images:/m.test(fm),
    coins,
  }
}

function sparklinePoints(rand) {
  const points = []
  let y = 0.55 + rand() * 0.2
  const steps = 14
  for (let i = 0; i <= steps; i++) {
    y = Math.min(0.9, Math.max(0.35, y + (rand() - 0.48) * 0.14))
    points.push(`${Math.round((i / steps) * WIDTH)},${Math.round(y * HEIGHT)}`)
  }
  return points.join(' ')
}

function coverSvg(slug, postType, ticker) {
  const color = CATEGORY_COLORS[postType] ?? CATEGORY_COLORS.news
  const rand = mulberry32(hashSlug(slug))
  const angle = Math.round(rand() * 360)
  const cx1 = Math.round(WIDTH * (0.55 + rand() * 0.4))
  const cy1 = Math.round(HEIGHT * (0.1 + rand() * 0.5))
  const r1 = Math.round(180 + rand() * 180)
  const cx2 = Math.round(WIDTH * rand() * 0.4)
  const cy2 = Math.round(HEIGHT * (0.5 + rand() * 0.5))
  const r2 = Math.round(120 + rand() * 140)
  const spark = sparklinePoints(rand)
  const label = postType.toUpperCase()

  const dots = []
  for (let x = 60; x < WIDTH; x += 96) {
    for (let y = 60; y < HEIGHT; y += 96) {
      dots.push(`<circle cx="${x}" cy="${y}" r="1.6" fill="#ffffff" opacity="0.05"/>`)
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="wash" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.34"/>
      <stop offset="55%" stop-color="#0a0e15" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow" cx="${cx1 / WIDTH}" cy="${cy1 / HEIGHT}" r="0.7">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0a0e15"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#wash)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  ${dots.join('\n  ')}
  <circle cx="${cx1}" cy="${cy1}" r="${r1}" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="3"/>
  <circle cx="${cx1}" cy="${cy1}" r="${Math.round(r1 * 0.82)}" fill="none" stroke="${color}" stroke-opacity="0.16" stroke-width="2"/>
  <circle cx="${cx2}" cy="${cy2}" r="${r2}" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="2"/>
  <polyline points="${spark}" fill="none" stroke="${color}" stroke-opacity="0.55" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
  ${
    ticker
      ? `<text x="${WIDTH - 48}" y="${HEIGHT - 64}" text-anchor="end" font-family="sans-serif" font-size="230" font-weight="800" fill="#ffffff" opacity="0.07">${ticker}</text>`
      : ''
  }
  <text x="56" y="86" font-family="sans-serif" font-size="26" font-weight="700" letter-spacing="6" fill="${color}">${label}</text>
  <text x="56" y="${HEIGHT - 52}" font-family="sans-serif" font-size="34" font-weight="800">
    <tspan fill="#e7ecf3">Coin</tspan><tspan fill="#f2a024">Coach</tspan>
  </text>
</svg>`
}

function insertImagesFrontmatter(raw, slug) {
  // Place `images` just above `authors:`, which every post defines.
  return raw.replace(/^authors:/m, `images: ['/images/covers/${slug}.jpg']\nauthors:`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith('.mdx'))
  let generated = 0

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, '')
    const filePath = path.join(BLOG_DIR, file)
    const raw = await readFile(filePath, 'utf8')
    const fm = parseFrontmatter(raw)
    if (!fm) {
      console.warn(`skip (no frontmatter): ${file}`)
      continue
    }
    if (fm.hasImages && !FORCE) continue

    const ticker = fm.coins.map((c) => TICKERS[c]).find(Boolean)
    const svg = coverSvg(slug, fm.postType, ticker)
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(OUT_DIR, `${slug}.jpg`))

    if (!fm.hasImages) {
      await writeFile(filePath, insertImagesFrontmatter(raw, slug))
    }
    generated++
    console.log(`cover: ${slug} (${fm.postType}${ticker ? `, ${ticker}` : ''})`)
  }

  console.log(`${generated} cover(s) generated, ${files.length - generated} already covered`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
