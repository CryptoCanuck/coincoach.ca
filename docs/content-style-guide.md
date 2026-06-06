# CoinCoach Content Style Guide

Audience: crypto-curious readers from beginner to intermediate. Voice: clear,
trustworthy, plain-English, no hype, no financial advice.

## Rules
- One H1 is the title (from frontmatter). Body starts at `##`.
- `summary` is 1-2 sentences and doubles as the meta description (keep < 160 chars).
- Use 3-7 relevant lowercase, hyphenated tags. Reuse existing tags where possible.
- Lead with the answer (inverted pyramid) for SEO and skimmability.
- Define jargon on first use. Link to related guides where helpful.
- News: include what happened, when, and why it matters. Use `postType: news`.
- Guides: step-by-step, evergreen. Use `postType: guide`.
- Breakdowns: what the token does, how it works, value drivers, risks. Use `postType: breakdown`.
- Reviews: hands-on, set `reviewedItem` and an honest `rating` (1-5). Use `postType: review`.
- Never publish without human review: new drafts ship with `draft: true`.

## AI authoring workflow
1. Claude Code writes a complete `.mdx` draft (`draft: true`) into `data/blog/`.
2. Human reviews and edits.
3. Set `draft: false` to publish.
