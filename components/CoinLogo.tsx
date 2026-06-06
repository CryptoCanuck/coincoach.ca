// Lightweight inline-SVG brand marks for coins. Falls back to a coloured disc
// with the ticker's first letter for symbols we don't have a custom mark for.
// In a later phase these can be swapped for a licensed crypto-icon set / CDN.

const COIN_BG: Record<string, string> = {
  BTC: '#F7931A',
  ETH: '#627EEA',
  SOL: '#101418',
  BNB: '#F3BA2F',
  XRP: '#23292F',
  ADA: '#0033AD',
  DOGE: '#C2A633',
  USDT: '#26A17B',
  AVAX: '#E84142',
  LINK: '#2A5ADA',
  MATIC: '#8247E5',
  INJ: '#00A3FF',
  RNDR: '#FF5A2D',
  TIA: '#7B2BF9',
  DOT: '#E6007A',
}

function glyph(g: string, fill = '#fff', fontSize = 15) {
  return (
    <text
      x="16"
      y="16"
      dominantBaseline="central"
      textAnchor="middle"
      fontFamily="var(--font-figtree), Arial, sans-serif"
      fontWeight="800"
      fontSize={fontSize}
      fill={fill}
    >
      {g}
    </text>
  )
}

export default function CoinLogo({ sym, size = 24 }: { sym: string; size?: number }) {
  const symbol = sym.toUpperCase()
  const bg = COIN_BG[symbol] || '#3A4452'

  let inner: React.ReactNode
  if (symbol === 'BTC') {
    inner = glyph('₿', '#fff', 17)
  } else if (symbol === 'ETH') {
    inner = (
      <g fill="#fff">
        <path d="M16 4 L16 12.8 L22.8 16 Z" opacity=".55" />
        <path d="M16 4 L9.2 16 L16 12.8 Z" />
        <path d="M16 17.4 L16 24 L22.8 17.3 Z" opacity=".55" />
        <path d="M16 24 L16 17.4 L9.2 17.3 Z" />
      </g>
    )
  } else if (symbol === 'SOL') {
    const gid = `sg${size}`
    inner = (
      <g>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9945FF" />
            <stop offset="1" stopColor="#14F195" />
          </linearGradient>
        </defs>
        <g fill={`url(#${gid})`}>
          <path d="M10 10.5 L24 10.5 L22 12.7 L8 12.7 Z" />
          <path d="M8 14.9 L22 14.9 L24 17.1 L10 17.1 Z" />
          <path d="M10 19.3 L24 19.3 L22 21.5 L8 21.5 Z" />
        </g>
      </g>
    )
  } else if (symbol === 'BNB') {
    inner = (
      <g fill="#fff">
        <rect x="13.6" y="13.6" width="4.8" height="4.8" rx="1" transform="rotate(45 16 16)" />
        <rect x="14.2" y="6.6" width="3.6" height="3.6" rx=".8" transform="rotate(45 16 8.4)" />
        <rect x="14.2" y="21.8" width="3.6" height="3.6" rx=".8" transform="rotate(45 16 23.6)" />
        <rect x="6.6" y="14.2" width="3.6" height="3.6" rx=".8" transform="rotate(45 8.4 16)" />
        <rect x="21.8" y="14.2" width="3.6" height="3.6" rx=".8" transform="rotate(45 23.6 16)" />
      </g>
    )
  } else if (symbol === 'USDT') {
    inner = glyph('₮', '#fff', 15)
  } else if (symbol === 'ADA') {
    inner = glyph('₳', '#fff', 15)
  } else if (symbol === 'DOGE') {
    inner = glyph('Ð', '#fff', 15)
  } else if (symbol === 'XRP') {
    inner = glyph('✕', '#fff', 13)
  } else {
    inner = glyph(symbol[0] || '?', '#fff', 14)
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className="block shrink-0 rounded-full"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill={bg} />
      {inner}
    </svg>
  )
}
