# CoinCoach

Cryptocurrency and blockchain news, guides, token breakdowns, and reviews.
Built on Next.js (App Router) + Contentlayer2 + Tailwind.

## Develop
This project uses Yarn Berry (via corepack). 
- `corepack enable` (once)
- `yarn install`
- `yarn dev` — local dev server
- `yarn test` — unit tests (Vitest)
- `yarn build && yarn serve` — production build + serve

## Content authoring
Articles are MDX files in `data/blog/`. See `docs/content-style-guide.md` and
`docs/frontmatter-templates.md`. The section field is `postType`
(news | guide | breakdown | review). New drafts use `draft: true` and are excluded
from the build, sitemap, feeds, and search until published. Articles are served at
`/blog/<slug>`; `/news`, `/guides`, `/breakdowns`, `/reviews` are filtered section pages.

## Deployment
Self-hosted via Portainer. The app builds to a standalone Next.js server
(`output: 'standalone'`, with `sharp` for image optimization), packaged by `Dockerfile`
and deployed as the `docker-compose.yml` stack, behind a reverse proxy (Caddy/nginx)
terminating TLS for coincoach.ca.

---

_Based on [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) (MIT)._

## Licence

[MIT](https://github.com/timlrx/tailwind-nextjs-starter-blog/blob/main/LICENSE) © [Timothy Lin](https://www.timlrx.com)
