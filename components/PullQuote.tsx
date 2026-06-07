import type { ReactNode } from 'react'

// Amber pull-quote inside article prose (design `.pull`).
export default function PullQuote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="not-prose border-accent text-ink my-7 border-l-[3px] pl-5 text-[19px] leading-snug font-bold">
      {children}
    </blockquote>
  )
}
