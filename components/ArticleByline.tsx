import { formatDate } from 'pliny/utils/formatDate'
import siteMetadata from '@/data/siteMetadata'

interface BylineProps {
  authorName: string
  authorAvatar?: string
  occupation?: string
  date: string
  readingTime?: number
  shareUrl: string
  title: string
}

// Article byline: avatar + author/role/date/read-time + share chips (design `.byline`).
export default function ArticleByline({
  authorName,
  authorAvatar,
  occupation,
  date,
  readingTime,
  shareUrl,
  title,
}: BylineProps) {
  const readLabel = typeof readingTime === 'number' ? `${Math.ceil(readingTime)} min read` : null

  const chip =
    'border-line bg-fill text-ink-2 hover:text-ink flex h-[34px] items-center rounded-lg border px-3 text-[13px] font-bold'

  return (
    <div className="border-line my-5 flex items-center gap-3 border-b pb-5">
      {authorAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={authorAvatar} alt="" className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <div className="bg-fill h-11 w-11 rounded-full" />
      )}
      <div className="flex-1">
        <div className="text-sm font-bold text-gray-100">By {authorName}</div>
        <div className="text-ink-3 mt-0.5 text-[12.5px] font-semibold">
          {occupation ? `${occupation} · ` : ''}
          <time dateTime={date}>{formatDate(date, siteMetadata.locale)}</time>
          {readLabel ? ` · ${readLabel}` : ''}
        </div>
      </div>
      <div className="flex gap-2">
        <a
          className={chip}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
        >
          𝕏
        </a>
        <a
          className={chip}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        >
          in
        </a>
      </div>
    </div>
  )
}
