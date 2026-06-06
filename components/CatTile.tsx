import Link from './Link'

export default function CatTile({
  name,
  count,
  color,
  href,
}: {
  name: string
  count: number
  color: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="bg-surface border-line hover:border-accent flex flex-col gap-2.5 rounded-[10px] border p-4 transition-all hover:-translate-y-0.5"
    >
      <div className="h-[38px] w-[38px] rounded-[9px] opacity-50" style={{ background: color }} />
      <div className="mt-0.5 text-[15px] font-extrabold text-gray-50">{name}</div>
      <div className="text-ink-3 text-xs font-semibold">{count} articles</div>
    </Link>
  )
}
