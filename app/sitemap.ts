import { MetadataRoute } from 'next'
import { allBlogs } from 'contentlayer/generated'
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
  const staticRoutes = ['', 'blog', 'tags', 'charts', 'topics'].map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified,
  }))
  const sectionRoutes = SECTIONS.map((section) => ({
    url: `${siteUrl}${section.route}`,
    lastModified,
  }))
  const topicRoutes = TOPICS.map((topic) => ({
    url: `${siteUrl}/topics/${topic.slug}`,
    lastModified,
  }))

  return [...staticRoutes, ...sectionRoutes, ...topicRoutes, ...blogRoutes]
}
