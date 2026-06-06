import CoinLogo from './CoinLogo'
import { sentimentZone } from '@/lib/markets/sentimentProxy'

export default function SentRow({
  symbol,
  name,
  score,
}: {
  symbol: string
  name: string
  score: number
}) {
  const { label, color } = sentimentZone(score)
  return (
    <div className="border-line-2 flex items-center gap-3.5 border-b py-3 last:border-b-0">
      <CoinLogo sym={symbol} size={26} />
      <div className="w-[120px] min-w-0">
        <div className="truncate text-sm font-bold text-gray-100">{name}</div>
        <div className="text-ink-3 text-[11.5px] font-semibold">{symbol}</div>
      </div>
      <div className="bg-fill h-[7px] flex-1 overflow-hidden rounded-full">
        <span
          className="block h-full rounded-full"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <div className="w-[42px] text-right text-[15px] font-extrabold" style={{ color }}>
        {score}
      </div>
      <div className="text-ink-2 hidden w-[104px] text-right text-[12.5px] font-bold sm:block">
        {label}
      </div>
    </div>
  )
}
