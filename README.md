# Dr. Jihad S. Husseini — dental website

Static trilingual (EN / AR / FR) site for a Beirut dental practice. No build step
and no framework: plain HTML, CSS and JS, which also means it opens straight off
disk for review (`index.html`).

The signature concept is the mouth. A Higgsfield clip opens the mouth as the
loader, the whole desktop page then lives inside it — the menu sits on the upper
teeth — and on the booking page the 32 teeth *are* the calendar, one date each.
Under 900px the mouth collapses to a banner and the page reverts to normal flow,
so desktop and mobile are two genuinely different layouts.

## Layout
| Path | What it is |
| --- | --- |
| `*.html`, `blog/post.html` | the seven pages |
| `assets/css/style.css` | all styling, desktop stage + the mobile branches |
| `assets/js/` | `main.js` (loader + stage), `booking*.js`, `blog.js`, `contact.js`, `drill.js` |
| `assets/locales/` | `en/ar/fr.json` + the generated `locales.js` (the site opens from `file://`, where `fetch` is blocked) |
| `assets/data/` | `posts.json`, and the measured tooth map |
| `backend/` | Supabase schema + booking-notification function (not yet provisioned) |
| `tools/` | the gate, the scaffolders and the one-off patch scripts |

## Working on it
```sh
node tools/check-site.mjs      # the standing gate — must pass
node tools/build-locales.mjs   # after editing any locale JSON
node tools/new-post.mjs        # scaffold the next Mon/Wed/Fri post
node tools/validate-posts.mjs  # gate the posts
node tools/build-feeds.mjs     # sitemap.xml + feed.xml
```

Two standing rules: **every change lands on all seven pages**, and **on both the
desktop and the mobile layout**. `CLAUDE.md` carries the full brief, the build
log and the open items.

## Deployment
Pushing to `main` runs the gate and publishes to GitHub Pages
(`.github/workflows/pages.yml`). The workflow also runs daily, because posts go
live by date and the feeds have to catch up.

Before launch: point the canonical/OG/feed URLs at the real address with
`node tools/set-domain.mjs https://<domain>` (a GitHub Pages project URL with a
sub-path works too), then `node tools/build-feeds.mjs`.
