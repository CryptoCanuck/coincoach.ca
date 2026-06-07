import Link from '@/components/Link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-accent text-[80px] leading-none font-black tracking-tight sm:text-[110px]">
        404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-50 sm:text-3xl">
        Page not found
      </h1>
      <p className="text-ink-2 mt-3 max-w-md text-sm font-medium">
        We couldn&apos;t find the page you were looking for. It may have moved, or the link might be
        out of date.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href="/"
          className="bg-accent rounded-lg px-4 py-2 text-sm font-bold text-[#2a1c05] transition-opacity hover:opacity-90"
        >
          Back to home
        </Link>
        <Link
          href="/charts"
          className="bg-surface border-line text-ink-2 hover:border-accent hover:text-ink rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
        >
          Browse markets
        </Link>
        <Link
          href="/learn"
          className="bg-surface border-line text-ink-2 hover:border-accent hover:text-ink rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
        >
          Start learning
        </Link>
      </div>
    </div>
  )
}
