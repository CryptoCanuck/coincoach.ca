import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'

export default function ArticleMeta({
  date,
  readingTime,
  author = 'CoinCoach',
}: {
  date: string
  readingTime?: number
  author?: string
}) {
  return (
    <div className="mt-1.5 text-xs text-gray-400">
      <time dateTime={date}>{formatDate(date, siteMetadata.locale)}</time>
      {' · '}
      {author}
      {typeof readingTime === 'number' ? ` · ${Math.ceil(readingTime)} min read` : ''}
    </div>
  )
}
