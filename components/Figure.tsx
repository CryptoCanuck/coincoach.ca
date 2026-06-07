// Captioned figure for article prose: <Figure src="/x.png" alt="" caption="Figure 1 — ..." />
export default function Figure({
  src,
  alt = '',
  caption,
}: {
  src: string
  alt?: string
  caption?: string
}) {
  return (
    <figure className="not-prose my-7">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full rounded-[10px]" />
      {caption ? (
        <figcaption className="text-ink-3 mt-2 text-xs font-semibold">{caption}</figcaption>
      ) : null}
    </figure>
  )
}
