// Honest "as of" stamp. Rendered server-side during (re)generation, so it reflects
// when this ISR view was produced — i.e. how fresh the cached market data is.
// UTC keeps it deterministic regardless of server locale; no client clock is read,
// so there is no hydration mismatch.
export default function FreshnessNote({ className = '' }: { className?: string }) {
  const now = new Date()
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  return (
    <span className={`text-ink-3 text-[11px] font-semibold ${className}`}>
      Updated {hh}:{mm} UTC
    </span>
  )
}
