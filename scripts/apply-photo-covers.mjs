/**
 * Build photo-based cover images from the curated source list in
 * `data/cover-photos.json` (slug → { url, author, license, pageUrl }).
 *
 * Each entry's photo (a license-checked Wikimedia Commons file) is downloaded,
 * cropped to the 1200x675 cover frame, given a subtle brand overlay (bottom
 * gradient, category label, CoinCoach wordmark), and written over the post's
 * cover JPEG. The post's frontmatter gets a matching `imageCredit` line.
 *
 * Usage: node scripts/apply-photo-covers.mjs [slug ...]   # default: all entries
 */
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

const ROOT = process.cwd()
const BLOG_DIR = path.join(ROOT, 'data', 'blog')
const OUT_DIR = path.join(ROOT, 'public', 'images', 'covers')
const PHOTO_CACHE = path.join(ROOT, 'node_modules', '.cache', 'cover-photos')
const WIDTH = 1200
const HEIGHT = 675

const CATEGORY_COLORS = {
  news: '#3fa7da',
  guide: '#7bc23a',
  breakdown: '#c964c9',
  review: '#f2a024',
}

function overlaySvg(postType) {
  const color = CATEGORY_COLORS[postType] ?? CATEGORY_COLORS.news
  const label = postType.toUpperCase()
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="#0a0e15" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0a0e15" stop-opacity="0.82"/>
    </linearGradient>
    <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0e15" stop-opacity="0.55"/>
      <stop offset="22%" stop-color="#0a0e15" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bottom)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#top)"/>
  <text x="56" y="86" font-family="sans-serif" font-size="26" font-weight="700" letter-spacing="6" fill="${color}" stroke="#0a0e15" stroke-width="0.5">${label}</text>
  <text x="56" y="${HEIGHT - 52}" font-family="sans-serif" font-size="34" font-weight="800">
    <tspan fill="#e7ecf3">Coin</tspan><tspan fill="#f2a024">Coach</tspan>
  </text>
</svg>`
}

function getFrontmatterField(raw, key) {
  const m = raw.match(new RegExp(`^${key}:\\s*'?([^'\\n]*)'?$`, 'm'))
  return m ? m[1].trim() : undefined
}

function upsertImageCredit(raw, credit) {
  const escaped = credit.replace(/'/g, "''")
  if (/^imageCredit:/m.test(raw)) {
    return raw.replace(/^imageCredit:.*$/m, `imageCredit: '${escaped}'`)
  }
  return raw.replace(/^authors:/m, `imageCredit: '${escaped}'\nauthors:`)
}

async function fetchPhoto(slug, url) {
  await mkdir(PHOTO_CACHE, { recursive: true })
  const file = path.join(PHOTO_CACHE, `${slug}.img`)
  try {
    return await readFile(file)
  } catch {
    /* not cached yet */
  }
  const res = await fetch(url, {
    headers: { 'user-agent': 'CoinCoachCoverBot/1.0 (https://coincoach.ca; content tooling)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(file, buf)
  return buf
}

async function main() {
  const sources = JSON.parse(await readFile(path.join(ROOT, 'data', 'cover-photos.json'), 'utf8'))
  const only = process.argv.slice(2)
  const slugs = only.length ? only : Object.keys(sources)
  let done = 0
  const failures = []

  for (const slug of slugs) {
    const src = sources[slug]
    if (!src) {
      failures.push(`${slug}: no entry in cover-photos.json`)
      continue
    }
    const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`)
    let raw
    try {
      raw = await readFile(mdxPath, 'utf8')
    } catch {
      failures.push(`${slug}: post not found`)
      continue
    }
    const postType = (getFrontmatterField(raw, 'postType') ?? 'news').replace(/['"]/g, '')

    try {
      const photo = await fetchPhoto(slug, src.url)
      await sharp(photo)
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
        .composite([{ input: Buffer.from(overlaySvg(postType)) }])
        .jpeg({ quality: 84, mozjpeg: true })
        .toFile(path.join(OUT_DIR, `${slug}.jpg`))
    } catch (err) {
      failures.push(`${slug}: ${err.message}`)
      continue
    }

    const credit = `Photo: ${src.author}, ${src.license}, via Wikimedia Commons`
    await writeFile(mdxPath, upsertImageCredit(raw, credit))
    done++
    console.log(`photo cover: ${slug} (${src.license})`)
  }

  console.log(`${done} photo cover(s) applied`)
  if (failures.length) {
    console.warn('failures:')
    for (const f of failures) console.warn(`  ${f}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
