# tools/

Small Node scripts (no dependencies, Node 18+). Run them from the project root.

## Run on every deploy

```sh
node tools/validate-posts.mjs   # gate: errors out on a broken posts.json
node tools/build-locales.mjs    # regenerate assets/locales/locales.js
node tools/build-feeds.mjs      # regenerate sitemap.xml + feed.xml
node tools/check-site.mjs       # gate: i18n keys, dead links, head tags, script order
```

`validate-posts` and `check-site` exit non-zero on an error, so they work as a
CI or pre-deploy gate. The other two only write files.

**Rebuild the feeds daily, not just on deploy.** Posts publish themselves by
date (`assets/js/blog.js` only shows posts whose `date` has arrived), so a post
going live on Wednesday morning will not be in `sitemap.xml` or `feed.xml` until
`build-feeds` runs again. A once-a-day scheduled run is enough; on GitHub Pages
that is a `schedule:` workflow that runs the two build scripts and commits the
result.

## Writing the blog

```sh
node tools/new-post.mjs "How often should you visit the dentist?"
node tools/new-post.mjs "Title" --date 2026-10-09 --source https://www.mouthhealthy.org/all-topics-a-z/checkups
```

Scaffolds the entry in `assets/data/posts.json` and, with no `--date`, picks the
next free Monday/Wednesday/Friday after the last queued post. It deliberately
leaves `excerpt` and `body` empty — per the brief the prose is written by the
client or a hired writer, not generated, and `validate-posts` fails until they
are filled in. See `assets/data/README.md` for the content rules.

## One-time setup

```sh
node tools/set-domain.mjs https://drhusseinidental.com
```

Replaces the `SITE-DOMAIN-TBD` placeholder in every canonical/Open Graph tag,
`robots.txt`, the feeds, and the notification email's From address. Run it once
the domain is registered, then `build-feeds` again. `check-site` warns on every
page until this is done.

## Already applied — safe to delete

These were one-shot migrations. They are idempotent (re-running them reports
"already…" and changes nothing), kept only so the changes are auditable. Delete
them whenever you like:

| Script | What it did |
| --- | --- |
| `patch-heads.mjs` | Gave all 7 pages the shared canonical/hreflang/OG/Twitter/favicon/JSON-LD head block, and fixed the loader `<video>` (its `poster` was root-relative and 404'd on `file://` and from `blog/`). Still the place to edit that block — re-run it after changing it. |
| `patch-booking.mjs` | Rebuilt the booking side panel: patient fields, slot summary, status line, real submit button, backend scripts. |
| `patch-contact.mjs` | Wired the contact form, which was an inert stub that told visitors so. |
| `patch-locales.mjs` | Added the booking-form strings to all three locales and rewrote the hero line that promised "no forms". |
| `patch-rtl.mjs` | Arabic: mirrors the tooth nav's x positions, plus the directional CSS that `direction: rtl` alone misses. |
| `patch-final.mjs` | Gave the calendar an `.sr-only` heading; taught `check-site` about the keys `contact.js` reads. |
| `fix-blogjs-regex.mjs`, `fix-meta-setter.mjs` | Repaired two defects in the per-post metadata helper (regex literals mangled by a shell one-liner; the meta-tag setter only copying the first attribute out of its selector, which collapsed the four `hreflang` alternates onto one tag). |
| `patch-nav.mjs`, `patch-nav-js.mjs` | **P0 mobile nav.** `.nav-toggle` existed in 0 of 7 pages and `.nav-open` had 0 CSS rules, so `initMobileNav()` was a permanent no-op and the desktop nav never hid on phones. Adds the button everywhere, the `common.nav.menu` locale key, `data-i18n-aria` support, drawer close-on-link/Escape/breakpoint, and a rotation listener for `initMouthWindow()`. |
| `patch-mobile-css.mjs` | Rewrote the mobile block: nav drawer, footer collapse and page-local grids all at **matched specificity**, `overflow-x` backstop, 44px targets, >=13px text, WhatsApp float cleared, `:hover` gated behind `@media (hover: hover)`. New mobile rules go here. |
| `patch-loader-mobile.mjs`, `patch-preload.mjs` | Mobile intro: skips the 16:9 video (it loses ~74% of the frame in portrait), runs the stills path, makes the zoom a `--loader-zoom` variable, honours the per-session guard on phones, and ships `preload="none"` so the clip is never fetched where it is not used. |
| `patch-cleanup.mjs` | Removed the dead `.mouth-hero` CSS section (66 lines) and `initMouthHero()` (23 lines) — their markup exists in no page — plus three regressions from the first mobile pass (a no-op rule with a wrong comment, a duplicate `font-size`, a duplicate RTL rule). |
| `patch-responsive-specificity.mjs` | Gave the Responsive-section rules `.mouth-window`-prefixed variants so they are not outranked by the base rules in the mouth section. |
| `patch-check-specificity.mjs`, `fix-check-specificity.mjs` | Added the specificity and `.nav-toggle` gate rules. The `fix-` script replaced a first cut that produced ~50 false positives (comments parsed as selectors; rules targeting different elements compared). |
| `patch-mobile.mjs` | Added the consolidated `── MOBILE: page-local layouts ──` block to `style.css`: collapsed the booking/contact/services page-local grids, fixed the calendar tap targets, and raised form inputs to 16px so iOS stops zooming on focus. New page-local mobile rules go in that block. |
| `patch-check-mobile.mjs`, `patch-check-fallbacks.mjs` | Added the two standing `check-site` rules: a page-local multi-column grid must have a mobile breakpoint, and the hardcoded English in a `data-i18n` element must match `en.json`. |
| `patch-hero-fallback.mjs` | Synced the booking hero's pre-JS fallback with `en.json` (it still promised "no forms"). |
| `patch-phone-labels.mjs` | Gave the bare `tel:` links an accessible name on all 7 pages and named the home trust list, using the three locale strings the gate had flagged as unused (`common.callClinic`, `common.callMobile`, `home.trust.title`). Attribute-only, so desktop and mobile both. |
| `set-preview-noindex.mjs` | `on` / `off`. Keeps the client preview out of search engines while the 13 copy placeholders are still visible: meta robots on all 7 pages **and** a `robots.txt` Disallow, since either alone leaks. Keeps the Sitemap line so `build-feeds.mjs` can still read the site base. Run `off` at launch. |
| `set-interim-copy.mjs`, `interim-copy.json` | `on` / `off`. Stands interim copy in for the 13 strings the client still owes, so he reviews the design instead of reading bracketed notes to himself. Invents nothing verifiable - no school, year, membership or address - and routes the unknown address/hours to WhatsApp, the site's primary CTA; the map block is hidden. Records the originals in `assets/locales/.interim-copy-active.json`, which `off` consumes and `check-site.mjs` warns on for as long as it exists. Round-trip tested: `off` restores the tree byte for byte. |
| `normalize-eol.mjs` | Settled the pre-existing CRLF/LF mix: CRLF for markup/styles/scripts, LF for JSON. Worth re-running if the mix creeps back. |

`lib/edit.mjs` is shared by all of them: it normalises CRLF before matching and
restores it on write. Any future script that edits these files should use it —
without it every multi-line pattern silently fails to match.
