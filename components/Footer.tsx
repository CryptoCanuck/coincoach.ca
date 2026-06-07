import Link from './Link'
import siteMetadata from '@/data/siteMetadata'

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Discover',
    links: [
      { label: 'Latest News', href: '/news' },
      { label: 'Guides', href: '/guides' },
      { label: 'Token Breakdowns', href: '/breakdowns' },
      { label: 'Reviews', href: '/reviews' },
      { label: 'Markets', href: '/charts' },
    ],
  },
  {
    heading: 'Topics',
    links: [
      { label: 'Learn', href: '/learn' },
      { label: 'Topics', href: '/topics' },
      { label: 'Glossary', href: '/glossary' },
      { label: 'All Tags', href: '/tags' },
      { label: 'Blog Archive', href: '/blog' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'RSS Feed', href: '/feed.xml' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-header text-ink-2 mt-2 px-5 pt-12 pb-8 sm:px-10">
      <div className="mx-auto grid max-w-[1440px] gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="mb-3.5 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/static/images/coin-coach-icon.png"
              alt=""
              width={29}
              height={29}
              className="h-[29px] w-[29px]"
            />
            <span className="text-lg font-extrabold tracking-tight text-white">
              Coin<span className="text-accent">Coach</span>
            </span>
          </Link>
          <p className="max-w-[300px] text-[13.5px] leading-relaxed text-gray-400">
            Crypto news, plain-English guides, project reviews and live market data — with an AI
            coach in your corner.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <h5 className="mb-3.5 text-[13px] font-extrabold tracking-wide text-white uppercase">
              {col.heading}
            </h5>
            {col.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-accent mb-2.5 block text-[13.5px] font-medium text-gray-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-line/60 mx-auto mt-8 flex max-w-[1440px] flex-col gap-2 border-t pt-5 text-[12.5px] text-gray-500 sm:flex-row sm:justify-between">
        <span>
          © {new Date().getFullYear()} {siteMetadata.headerTitle} — Not financial advice.
        </span>
        <span>Terms · Privacy · Disclaimer</span>
      </div>
    </footer>
  )
}
