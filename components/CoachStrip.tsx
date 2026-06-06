// AI-coach promo band. Presentational for now — wiring the input + suggested
// prompts to the assistant backend is a later phase.
const PROMPTS = [
  'Is BTC overbought?',
  'Best ETH staking?',
  'What is a presale?',
  'Explain market cap',
]

export default function CoachStrip() {
  return (
    <div className="grid items-center gap-9 rounded-[10px] bg-gradient-to-br from-[#10151E] to-[#1B2A38] p-8 lg:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <div className="bg-accent flex h-[34px] w-[34px] items-center justify-center rounded-[9px] text-lg font-black text-[#3a2400]">
            ✦
          </div>
          <span className="text-accent text-[11px] font-extrabold tracking-[0.14em] uppercase">
            AI Market Coach
          </span>
        </div>
        <h3 className="mb-3 text-[26px] leading-tight font-black tracking-tight text-white">
          Ask anything about crypto — get a plain-English answer
        </h3>
        <p className="max-w-[420px] text-sm leading-relaxed text-gray-400">
          Grounded in live prices, sentiment and our guides. Not financial advice — a smarter
          starting point.
        </p>
      </div>
      <div>
        <div className="flex h-[50px] items-center justify-between rounded-[10px] border border-white/15 bg-white/[0.07] pr-2 pl-4 text-sm text-gray-400">
          <span>e.g. “Explain Layer 2s like I&apos;m new”</span>
          <span className="bg-accent flex h-9 items-center rounded-[7px] px-4 text-[13px] font-extrabold text-[#3a2400]">
            Ask ›
          </span>
        </div>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[12.5px] font-semibold text-gray-300"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
