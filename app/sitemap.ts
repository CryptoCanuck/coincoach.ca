import { MetadataRoute } from 'next'
import { allBlogs, allGlossaries, allLessons } from 'contentlayer/generated'
import siteMetadata from '@/data/siteMetadata'
import { SECTIONS } from '@/lib/sections'
import { TOPICS } from '@/lib/topics'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = siteMetadata.siteUrl

  const blogRoutes = allBlogs
    .filter((post) => !post.draft)
    .map((post) => ({
      url: `${siteUrl}/${post.path}`,
      lastModified: post.lastmod || post.date,
    }))

  const lastModified = new Date().toISOString().split('T')[0]
  const staticRoutes = ['', 'blog', 'tags', 'charts', 'topics', 'glossary', 'learn'].map(
    (route) => ({
      url: `${siteUrl}/${route}`,
      lastModified,
    })
  )
  const sectionRoutes = SECTIONS.map((section) => ({
    url: `${siteUrl}${section.route}`,
    lastModified,
  }))
  const topicRoutes = TOPICS.map((topic) => ({
    url: `${siteUrl}/topics/${topic.slug}`,
    lastModified,
  }))
  const glossaryRoutes = allGlossaries
    .filter((t) => !t.draft)
    .map((t) => ({
      url: `${siteUrl}/glossary/${t.slug}`,
      lastModified,
    }))
  const lessonRoutes = allLessons
    .filter((l) => !l.draft)
    .map((l) => ({
      url: `${siteUrl}/learn/${l.slug}`,
      lastModified,
    }))

  return [
    ...staticRoutes,
    ...sectionRoutes,
    ...topicRoutes,
    ...glossaryRoutes,
    ...lessonRoutes,
    ...blogRoutes,
  ]
}
