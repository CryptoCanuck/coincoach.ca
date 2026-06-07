'use client'

import { usePathname } from 'next/navigation'
import Link from './Link'

const ITEMS: { label: string; href: string }[] = [
  { label: 'All', href: '/' },
  { label: 'News', href: '/news' },
  { label: 'Guides', href: '/guides' },
  { label: 'Token Breakdowns', href: '/breakdowns' },
  { label: 'Reviews', href: '/reviews' },
  { label: 'Markets', href: '/charts' },
  { label: 'Topics', href: '/topics' },
  { label: 'Glossary', href: '/glossary' },
  { label: 'Learn', href: '/learn' },
]

export default function CatBar() {
  const pathname = usePathname()

  return (
    <div className="bg-paper border-line sticky top-[74px] z-40 border-b">
      <div className="no-scrollbar mx-auto flex h-[52px] max-w-[1440px] items-center gap-2.5 overflow-x-auto px-5 sm:px-10">
        {ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-[30px] shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'border-accent bg-accent text-[#2a1c05]'
                  : 'border-line bg-surface text-ink-2 hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
        <span className="text-ink-3 ml-auto shrink-0 pl-2 text-[13px] font-semibold">More ▾</span>
      </div>
    </div>
  )
}
