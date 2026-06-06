import siteMetadata from '@/data/siteMetadata'
import { SECTIONS } from '@/lib/sections'
import Link from './Link'
import MobileNav from './MobileNav'
import SearchButton from './SearchButton'

const Header = () => {
  return (
    <header className="bg-header border-line sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-[74px] max-w-[1440px] items-center gap-7 px-5 sm:px-10">
        <Link href="/" aria-label={siteMetadata.headerTitle} className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/images/coin-coach-icon.png"
            alt=""
            width={34}
            height={34}
            className="h-[34px] w-[34px]"
          />
          <span className="text-xl font-extrabold tracking-tight text-white">
            Coin<span className="text-accent">Coach</span>
          </span>
        </Link>

        <nav className="hidden gap-6 lg:flex">
          {SECTIONS.map((section) => (
            <Link
              key={section.type}
              href={section.route}
              className="text-[15px] font-semibold text-gray-300 transition-colors hover:text-white"
            >
              {section.title}
            </Link>
          ))}
          {/* Sentiment is a standalone feature page, not a content section, so it
              isn't in SECTIONS (typed by PostType: news|guide|breakdown|review).
              Kept in sync with the mobile nav in data/headerNavLinks.ts. */}
          <Link
            href="/sentiment"
            className="text-[15px] font-semibold text-gray-300 transition-colors hover:text-white"
          >
            Sentiment
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3.5">
          <SearchButton />
          <button
            type="button"
            aria-label="Ask the Coach"
            className="from-accent flex h-10 shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r to-[#f4b53f] px-4 text-sm font-extrabold whitespace-nowrap text-[#3a2400]"
          >
            <span className="h-[7px] w-[7px] rounded-full bg-[#3a2400]" />
            <span className="hidden sm:inline">Ask the Coach</span>
            <span className="sm:hidden">Coach</span>
          </button>
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

export default Header
