import Link from './Link'
import siteMetadata from '@/data/siteMetadata'

export default function Footer() {
  return (
    <footer className="border-line mt-10 border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-[12.5px] text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <div>
          © {new Date().getFullYear()} {siteMetadata.headerTitle} — Crypto news, guides, breakdowns
          &amp; reviews
        </div>
        <div className="flex gap-4">
          <Link href="/feed.xml" className="hover:text-accent">
            RSS
          </Link>
          <Link href="/about" className="hover:text-accent">
            About
          </Link>
          <Link href="/tags" className="hover:text-accent">
            Tags
          </Link>
        </div>
      </div>
    </footer>
  )
}
