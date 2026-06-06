import Link from './Link'

// Section header with the accent bar from the design (`.sec-h`).
export default function SectionHeading({
  title,
  barColor = 'var(--color-amber)',
  moreLabel,
  moreHref,
}: {
  title: string
  barColor?: string
  moreLabel?: string
  moreHref?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center text-xl font-extrabold tracking-tight text-gray-50">
        <span
          className="mr-2.5 inline-block h-[18px] w-1 rounded-sm align-[-3px]"
          style={{ background: barColor }}
        />
        {title}
      </h2>
      {moreLabel && moreHref && (
        <Link href={moreHref} className="text-ink-2 hover:text-ink text-[13px] font-semibold">
          {moreLabel} ›
        </Link>
      )}
    </div>
  )
}
