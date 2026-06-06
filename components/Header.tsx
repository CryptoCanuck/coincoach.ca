import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Link from './Link'
import MobileNav from './MobileNav'
import SearchButton from './SearchButton'

const Header = () => {
  return (
    <header className="bg-header border-line sticky top-0 z-50 border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <Link href="/" aria-label={siteMetadata.headerTitle}>
          <div className="text-xl font-extrabold tracking-tight text-gray-100">
            Coin<span className="text-accent">Coach</span>
          </div>
        </Link>
        <div className="flex items-center gap-5">
          <nav className="hidden gap-5 text-sm font-medium text-gray-300 sm:flex">
            {headerNavLinks
              .filter((link) => link.href !== '/')
              .map((link) => (
                <Link key={link.title} href={link.href} className="hover:text-accent">
                  {link.title}
                </Link>
              ))}
          </nav>
          <SearchButton />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

export default Header
