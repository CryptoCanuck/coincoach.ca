import type { PostType } from '@/lib/structuredData'

const GRADIENTS: Record<PostType, string> = {
  news: 'from-blue-700 to-base',
  guide: 'from-emerald-700 to-base',
  breakdown: 'from-purple-700 to-base',
  review: 'from-amber-700 to-base',
}

export default function CoverImage({
  src,
  type,
  className = '',
}: {
  src?: string
  type: PostType
  className?: string
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`object-cover ${className}`} />
  }
  return <div className={`bg-gradient-to-br ${GRADIENTS[type]} ${className}`} />
}
