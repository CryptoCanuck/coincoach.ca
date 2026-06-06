// Fear & Greed semicircular gauge. Static `value` for now — a live sentiment feed
// is a later phase. Arc runs red → amber → green; needle + readout colour by zone.
export default function Gauge({
  value = 64,
  label = 'Greed',
  size = 'lg',
}: {
  value?: number
  label?: string
  size?: 'lg' | 'sm'
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const angle = -90 + (clamped / 100) * 180
  const arcLen = (clamped / 100) * 270
  const positive = clamped >= 50
  const gid = `gauge-grad-${size}-${clamped}`
  const dims = size === 'lg' ? { w: 200, h: 108, needle: 92 } : { w: 160, h: 90, needle: 72 }

  return (
    <div className="flex flex-col items-center">
      <div className="relative overflow-hidden" style={{ width: dims.w, height: dims.h }}>
        <svg
          width={dims.w}
          height={dims.h}
          viewBox="0 0 200 108"
          className="absolute inset-0"
          aria-hidden="true"
        >
          <path
            d="M14 100 A86 86 0 0 1 186 100"
            fill="none"
            stroke="#1B232F"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M14 100 A86 86 0 0 1 186 100"
            fill="none"
            strokeWidth="16"
            strokeLinecap="round"
            stroke={`url(#${gid})`}
            strokeDasharray={`${arcLen} 400`}
          />
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#EB5E45" />
              <stop offset="0.5" stopColor="#F2A024" />
              <stop offset="1" stopColor="#7BC23A" />
            </linearGradient>
          </defs>
        </svg>
        <div
          className="bg-ink absolute bottom-0 left-1/2 w-[3px] origin-bottom rounded-sm"
          style={{ height: dims.needle, transform: `translateX(-50%) rotate(${angle}deg)` }}
        />
        <div className="bg-ink absolute bottom-[-6px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full" />
      </div>
      <div className="mt-1.5 text-center">
        <div
          className={`leading-none font-black ${positive ? 'text-up' : 'text-down'} ${
            size === 'lg' ? 'text-[38px]' : 'text-[28px]'
          }`}
        >
          {clamped}
        </div>
        <div className="text-ink-2 text-xs font-bold">{label} · Fear &amp; Greed</div>
      </div>
    </div>
  )
}
