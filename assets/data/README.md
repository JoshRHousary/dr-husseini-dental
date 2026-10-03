# Blog content pipeline

Posts live in `posts.json` as a plain array — no CMS, no server needed. Add one object per post:

```json
{
  "slug": "how-often-should-you-visit-the-dentist",
  "date": "2026-10-05",
  "sourceUrl": "https://www.mouthhealthy.org/all-topics-a-z/checkups",
  "sourceLabel": "ADA MouthHealthy",
  "lang": {
    "en": { "title": "...", "excerpt": "...", "body": "<p>...</p>" },
    "ar": { "title": "...", "excerpt": "...", "body": "<p>...</p>" },
    "fr": { "title": "...", "excerpt": "...", "body": "<p>...</p>" }
  }
}
```

## How Mon/Wed/Fri scheduling works without a backend

The site only shows posts whose `date` is today or earlier (`assets/js/blog.js`). So you can write and queue several weeks of posts in one sitting with future `date` values, and each one "publishes" itself automatically the day it's due — no cron job, no login, no CMS.

## Rules (do not skip)

- `body` text must be original writing (not copied from ADA MouthHealthy or anywhere else) — ADA's terms of use prohibit republishing/excerpting their content without written permission. Cite them via `sourceUrl`/`sourceLabel` instead.
- `body` is not AI-generated — written by the client or a hired writer per the project brief.
- `lang.ar` and `lang.fr` are optional per post; if missing, the post falls back to `lang.en`. For full trilingual parity, fill in all three.
- `slug` must be unique and URL-safe (lowercase, hyphens, no spaces).
