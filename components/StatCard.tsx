export default function StatCard({
  label,
  value,
  sub,
  up = true,
}: {
  label: string
  value: string
  sub?: string
  up?: boolean
}) {
  return (
    <div className="border-line flex-1 border-l px-4 py-3.5 first:border-l-0">
      <div className="text-ink-3 text-[11.5px] font-bold tracking-wide uppercase">{label}</div>
      <div className="mt-1 text-[22px] font-black tracking-tight text-gray-50">{value}</div>
      {sub && <div className={`mt-0.5 text-[12.5px] ${up ? 'text-up' : 'text-down'}`}>{sub}</div>}
    </div>
  )
}
