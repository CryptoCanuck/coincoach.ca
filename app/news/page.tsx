import SectionPage, { sectionMetadata } from '../_sectionPage'

export const metadata = sectionMetadata('news')
export default function Page() {
  return <SectionPage type="news" />
}
