import { Figtree } from 'next/font/google'
import SectionContainer from './SectionContainer'
import Footer from './Footer'
import { ReactNode } from 'react'
import Header from './Header'
import Ticker from './Ticker'
import CatBar from './CatBar'

interface Props {
  children: ReactNode
}

const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
})

const LayoutWrapper = ({ children }: Props) => {
  return (
    <div className={`${figtree.variable} flex min-h-screen flex-col font-sans`}>
      <a
        href="#main-content"
        className="bg-accent sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#2a1c05]"
      >
        Skip to content
      </a>
      <Ticker />
      <Header />
      <CatBar />
      <SectionContainer>
        <main id="main-content" tabIndex={-1} className="mb-auto">
          {children}
        </main>
      </SectionContainer>
      <Footer />
    </div>
  )
}

export default LayoutWrapper
