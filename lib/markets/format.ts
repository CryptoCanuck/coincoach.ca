export function formatUsd(value: number): string {
  if (value >= 1) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  if (value === 0) return '$0.00'
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

export function formatPercent(value: number | null | undefined): string {
  const n = typeof value === 'number' ? value : 0
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function changeDirection(value: number | null | undefined): 'up' | 'down' | 'flat' {
  if (typeof value !== 'number' || value === 0) return 'flat'
  return value > 0 ? 'up' : 'down'
}
