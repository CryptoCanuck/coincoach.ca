# Frontmatter Templates

All articles live in `data/blog/<slug>.mdx`. `postType` is required and must be one of:
`news`, `guide`, `breakdown`, `review`. New AI drafts MUST set `draft: true`.
Articles are served at the canonical URL `/blog/<slug>`; the section pages
(`/news`, `/guides`, `/breakdowns`, `/reviews`) are filtered archive views.

## Cover images

Each article may set an optional cover image used by cards and the article hero:

```yaml
images: ['/static/images/my-cover.jpg']
```

Place the file under `public/static/images/`. When `images` is omitted, a
category-coloured gradient placeholder is shown automatically.

## News
```yaml
---
title: ''
date: 'YYYY-MM-DD'
postType: news
tags: []
summary: ''
authors: ['default']
draft: true
---
```

## Guide
```yaml
---
title: ''
date: 'YYYY-MM-DD'
postType: guide
tags: []
summary: ''
authors: ['default']
draft: true
---
```

## Token Breakdown
```yaml
---
title: ''
date: 'YYYY-MM-DD'
postType: breakdown
tags: []
summary: ''
authors: ['default']
draft: true
---
```

## Review
```yaml
---
title: ''
date: 'YYYY-MM-DD'
postType: review
reviewedItem: ''   # name of the product/service being reviewed
rating: 4          # 1-5, optional; enables star rich snippets
tags: []
summary: ''
authors: ['default']
draft: true
---
```
