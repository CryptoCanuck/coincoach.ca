// "Ask the Coach" sidebar placeholder (design coach panel). Presentational only —
// wiring the input to the assistant backend is Phase 5.
export default function ArticleCoachBox() {
  return (
    <div className="rounded-[10px] bg-gradient-to-br from-[#10151E] to-[#1A2632] p-5 text-white">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="bg-accent flex h-[30px] w-[30px] items-center justify-center rounded-lg text-base font-black text-[#3a2400]">
          ✦
        </div>
        <div className="text-base font-extrabold">Ask the Coach</div>
      </div>
      <p className="mb-3.5 text-[13px] leading-relaxed text-[#B6C0CD]">
        Confused by something in this article? Ask for a plain-English explainer.
      </p>
      <div className="flex h-10 items-center rounded-lg border border-white/15 bg-white/[0.08] px-3 text-[13px] text-[#7E8A99]">
        Type your question…
      </div>
    </div>
  )
}
