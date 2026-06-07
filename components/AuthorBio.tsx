import type { ReactNode } from 'react'

// Author bio box at the foot of an article (design author `.panel`). `children`
// is the author's rendered MDX bio (optional).
export default function AuthorBio({
  name,
  avatar,
  occupation,
  children,
}: {
  name: string
  avatar?: string
  occupation?: string
  children?: ReactNode
}) {
  return (
    <div className="bg-surface border-line mt-8 flex items-start gap-4 rounded-[10px] border px-[22px] py-5">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-14 w-14 flex-none rounded-full object-cover" />
      ) : (
        <div className="bg-fill h-14 w-14 flex-none rounded-full" />
      )}
      <div>
        <div className="text-[15px] font-extrabold text-gray-100">{name}</div>
        {occupation ? (
          <div className="text-blue mt-0.5 mb-2 text-[12.5px] font-bold">{occupation}</div>
        ) : null}
        {children ? (
          <div className="prose prose-invert text-ink-2 max-w-none text-[13.5px] leading-relaxed">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  )
}
