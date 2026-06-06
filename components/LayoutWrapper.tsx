import { Inter } from 'next/font/google'
import SectionContainer from './SectionContainer'
import Footer from './Footer'
import { ReactNode } from 'react'
import Header from './Header'
import Ticker from './Ticker'

interface Props {
  children: ReactNode
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const LayoutWrapper = ({ children }: Props) => {
  return (
    <div className={`${inter.variable} flex min-h-screen flex-col font-sans`}>
      <Ticker />
      <Header />
      <SectionContainer>
        <main className="mb-auto">{children}</main>
      </SectionContainer>
      <Footer />
    </div>
  )
}

export default LayoutWrapper
