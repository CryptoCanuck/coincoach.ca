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
      <Ticker />
      <Header />
      <CatBar />
      <SectionContainer>
        <main className="mb-auto">{children}</main>
      </SectionContainer>
      <Footer />
    </div>
  )
}

export default LayoutWrapper
