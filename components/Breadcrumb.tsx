import Link from './Link'

export interface Crumb {
  label: string
  href?: string
}

// Breadcrumb trail (design `.crumb`). The last item renders as plain current text.
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-ink-3 flex items-center gap-2 text-[13px] font-semibold"
    >
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-2">
            {item.href && !last ? (
              <Link href={item.href} className="hover:text-ink-2">
                {item.label}
              </Link>
            ) : (
              <span
                className={last ? 'text-ink-2' : undefined}
                aria-current={last ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!last && <span className="text-ink-3">›</span>}
          </span>
        )
      })}
    </nav>
  )
}
