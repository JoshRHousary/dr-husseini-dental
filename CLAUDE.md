# Dr. Jihad S. Husseini — Dental Website

## Client
- Dentist: Dr. Jihad S. Husseini
- Specialties: Cosmetic dentistry, Endodontics, Prosthetic/Implant dentistry
- Contact: Clinic 01/308206, Mobile 03/855860 (Lebanon-format numbers — region is Lebanon/MENA)
- Currently has zero online presence — this is a from-scratch build.

## Scope
Standalone project. Not related to any other client work — keep this folder self-contained (no DART/other-client context should bleed in here). Do not reuse DART's Supabase project or infrastructure — this client needs fully separate backend resources.

## Site structure
Multi-page: Home, About, Services, Booking, Contact, Blog.
Trilingual: English, Arabic, French — language switcher, Arabic needs RTL layout support.

## Booking / conversion
- WhatsApp is the **primary** booking CTA (matches the top local Beirut competitor, drzalaket.com — WhatsApp outperforms phone/contact-form there). Sticky WhatsApp CTA site-wide.
- Booking calendar is secondary but still prominent, styled as the mouth/teeth motif (see Motion section).
- Client's aspirational target: ~50% visitor-to-booking conversion. Realistic top-performer benchmark is 5-8% — treat client's number as directional ambition, not a literal spec; optimize hard regardless.

## Blog
- 3 posts/week, Monday / Wednesday / Friday, dental topics.
- **Not AI-written.** Resolved approach: link out to ADA MouthHealthy (mouthhealthy.org) as a cited source, but the actual post text is original write-up supplied by the client or a hired writer — Claude builds the template/formatting/publishing pipeline, not the prose.
  - Reason: checked mouthhealthy.org/terms-of-use directly — ADA content is copyrighted, republishing/excerpting prohibited without written permission, no syndication program exists.
- Needs a recurring posting mechanism (cron-style) once content pipeline is decided — but content itself is supplied externally, not generated.

## Design direction
- Client gave full creative control on theme/color.
- Inspiration links + design takeaways from research:
  - **elementsdentistry.com** — dental-site baseline: mint/teal + cream, soft arced hero shapes, serif headings over clean sans body, sticky book button, Google-review carousel.
  - **dbrand.com** (motion reference) — high-contrast confident motion/transitions; irreverent tone doesn't fit a dental brand, but transition smoothness is worth borrowing.
  - **deepbook.tech** — animated vertical-line field curving into an arc/wave, reusable as a "smile curve" motif for the loader.
  - **landonorris.com** — direct precedent for the brief: full-screen branded loader resolves into a mask/morph reveal, then scroll-linked animation. This is the mechanic to build the mouth-opening loader on.
  - **ousmaneballondor.fr** — alternate mood: warm, slow stroke-drawn reveal-on-load, if the mouth animation should feel elegant rather than punchy.
- Motion design to be generated via Higgsfield.
- Signature concept: mouth-opening animation as the site loading screen; same mouth motif reappears on the Booking page, calendar styled as a teeth/mouth grid, months relabeled as a pun — "Mouth of September," "Mouth of October," etc.

## Status / open items
- Design research + licensing check complete (see above).
- Tech stack: defaulting to a static multi-page site (HTML/CSS/JS, JSON-driven i18n for EN/AR/FR) unless a reason emerges to use a framework — keeps it fast and simple like the DART build, no server dependency for content.
- Booking backend not yet decided — needs its own (non-DART) backend/service.
- Actual blog post copy: pending from client/writer.

## Intro + home hero (built 2026-09-30)
- Loader: `assets/media/loader.mp4` (Kling v3.0, closed lips -> open mouth, from keyframes `mouth-closed.jpg` / `mouth-open.jpg`, generated with Higgsfield gpt_image_2_5). Currently a 480p-class draft; re-render at 1080p once approved. `loader-seedance.mp4` is the alternate (HEVC 10-bit, does not play in many browsers).
- After the clip ends, the loader mask expands from the throat and zooms in (`initLoader` in `assets/js/main.js`, `#loader` rules in `style.css`). Falls back to the two stills if the video is missing/slow. Plays once per session; skipped for reduced motion. Preview without it: `index.html?intro=off`.
- Home (`index.html`, body.home-mouth): the WHOLE page lives inside the open mouth. Fixed stage (`#mouthStage`, geometry in % of the 1344x752 `mouth-open.jpg`); menu links sit on the six upper teeth (`.tooth`, vertical labels); all sections + footer scroll inside `#mouthWindow` over the cavity. Under 900px wide it becomes a mouth banner + normal flow. Intro plays on every home load; inner pages are unchanged.
- Site opens from disk (relative paths + embedded `assets/locales/locales.js`, regenerate it after editing the locale JSON).
- Higgsfield project: "Dr Husseini Dental - loader" (id 6283eaf4-63ce-4410-9bc4-7401ac3de737). Trial credits expire 2026-10-03; auto-renewal already cancelled.

## Mouth layout on ALL pages (2026-09-30)
- Every page (home, About, Services, Booking, Contact, Blog, blog/post) uses the same stage: fixed mouth image, menu horizontal on the six upper teeth (`.tooth`), EN/AR/FR on three lower teeth (`.lang-teeth`), content scrolling inside `#mouthWindow` with NO panel background and colours remapped to the mouth palette (desktop >= 901px; see the `.mouth-window` variable block at the end of `assets/css/style.css`).
- Rule from the user: whenever a change is made, apply it to all pages. New pages must use the same stage markup (copy from any existing page) and get a tooth in the nav if they are menu items.
- Only `index.html` (body.is-home) always plays the intro; inner pages play it only if first in the session.

## Session 2026-10-01 — loader 1080p, booking backend, blog pipeline, QA pass

### Loader re-render (done)
- `assets/media/loader-1080.mp4` is the new master: Kling v3.0 `mode: "pro"`, 1920x1080, H.264/avc1, 5.04s, 5.7MB. Same keyframes and prompt as the 720p draft.
- `loader-1080-alt.mp4` is a second take from the same submission — **nobody has watched either one yet; pick one before launch** and point `data-hq` at it.
- `loader-720.mp4` (the old `loader.mp4`, 1280x720, 2.7MB) is still shipped as the default `<source>`. `upgradeLoaderQuality()` in `main.js` swaps in the 1080p only when the viewport is >=1200px and `navigator.connection` is not saveData/2g/3g — 5.7MB on a Lebanese mobile connection would wreck the first impression.
- Leftover duplicates in `assets/media/` to delete by hand: `loader.mp4`, `loader-kling.mp4` (byte-identical to `loader-720.mp4`), `loader-1080-a.mp4`, `loader-1080-b.mp4` (identical to `loader-1080.mp4` / `-alt`). `loader-seedance.mp4` is the unplayable HEVC alternate.
- Higgsfield: 2 renders at 8.75 credits each. Balance was 61.95 before, Plus plan.

### Booking backend (built, not provisioned)
- Deliberately pluggable: `assets/js/booking-config.js` (the only file to edit), `assets/js/booking-backend.js` (adapter), `backend/supabase/schema.sql`, `backend/supabase/functions/notify-booking/`, `backend/README.md`.
- `mode: "none"` is the shipped default and keeps the old WhatsApp-only behaviour exactly. `mode: "supabase"` stores requests, greys out taken slots, and emails the clinic.
- **Still needs a human:** create the Supabase project, run the SQL, paste URL + anon key. Steps are in `backend/README.md`. This project gets its OWN Supabase project — never DART's.
- The anon key is safe in the browser *only* with the RLS from `schema.sql`: anon may insert a `pending` request within 180 days and read nothing but `booked_slots` (date + time, no patient data). Don't set `mode: "supabase"` without having run the SQL.
- Booking page now collects name, phone, treatment, notes — so the hero copy no longer claims "no forms", and the WhatsApp handoff carries the details. Availability lookup fails soft (everything shows free) rather than blocking a booking.
- Contact form was an inert stub with a visible "[front-end only]" note; it now validates, stores to `contact_messages` when configured, and always hands off to WhatsApp.

### Blog pipeline (done)
- The date-gated self-publishing in `blog.js` was already right; what was missing was authoring and SEO.
- `tools/new-post.mjs` scaffolds an entry and picks the next free Mon/Wed/Fri. `tools/validate-posts.mjs` gates on slugs, dates, cadence gaps, empty bodies, missing translations. Prose is still client/writer-supplied — the scaffolder leaves it blank on purpose and validation fails until it's filled.
- `tools/build-feeds.mjs` generates `sitemap.xml` + `feed.xml`. **Run it daily, not just per deploy** — posts go live by date, so a Wednesday post is absent from the feeds until it runs again.
- `blog.js` now sets per-post title/description/canonical/OG/hreflang and a `MedicalWebPage` JSON-LD at runtime, and `noindex`es an unknown slug.

### QA pass (done)
- Fixed on all 7 pages: `poster="/assets/..."` was root-relative and 404'd on `file://` and from `blog/`.
- Added on all 7 pages: canonical, 4 hreflang alternates, robots, theme-color, favicon (`assets/media/favicon.svg`), Open Graph + Twitter cards, RSS autodiscovery, and a site-wide `Dentist` JSON-LD block. Plus `robots.txt`. The schema deliberately omits `address`/`openingHours` until the client supplies them.
- Arabic RTL: `applyTeethDirection()` mirrors each tooth's x position about the centre line so the Arabic menu reads right-to-left (CSS `direction` can't move absolutely-positioned teeth). Plus an RTL block at the end of `style.css` for nav/footer/calendar/form direction and `unicode-bidi: isolate` on Latin runs inside Arabic text.
- Line endings were a pre-existing CRLF/LF mix that broke multi-line pattern matching; now CRLF for markup/styles/scripts, LF for JSON (`tools/normalize-eol.mjs`).
- `tools/check-site.mjs` is the standing gate: every `data-i18n` key resolves in all three locales, no root-relative or missing local references, head tags present, script order correct, and the hardcoded English inside each `data-i18n` element matches `en.json`. Currently passes with 0 errors.
- That last rule caught a real one: the booking hero's pre-JS fallback still promised "no forms" after the form was added. The literal text inside a `data-i18n` element is what crawlers read before the locale bundle applies and what shows if JS fails, so it has to be kept in sync — the checker now enforces it.

### Outstanding — needs the client or a decision
1. **Domain.** Everything canonical/OG/feed-related carries the `SITE-DOMAIN-TBD` placeholder. One command once it's registered: `node tools/set-domain.mjs https://...`
2. **Supabase project** — see `backend/README.md`.
3. **Pick a loader take** (`loader-1080.mp4` vs `loader-1080-alt.mp4`).
4. **13 bracketed copy placeholders** still awaiting the client — run `node tools/check-site.mjs` for the current list. Biggest: Dr. Husseini's bio and credentials (`about.*`), clinic address and hours (footer + contact page).
5. **Blog post copy** — pipeline is ready, `posts.json` is empty.
6. **Confirm the +961 country code** assumption on the two phone numbers before launch.
7. Three locale strings are now unused leftovers: `common.callClinic`, `common.callMobile`, `home.trust.title` — either surface them in the UI or drop them.
8. **Nothing has been verified in a real browser this session** — the Chrome extension wasn't connected. All checks were static. Load the pages (especially `booking.html` and the Arabic switch) before showing the client.

## Rule: every edit lands on mobile too (2026-10-01)
User rule: "whenever we are making the edits on this website lets do the same on the mobile version." This sits alongside the existing all-pages rule — **all pages AND both layouts**.

This matters here more than on a normal responsive site, because desktop and mobile are two genuinely different layouts:
- **>= 901px** — the whole page lives inside the open mouth: fixed `#mouthStage`, nav on the six upper teeth, content scrolling inside `#mouthWindow`.
- **<= 900px** — the mouth collapses to a 42vh banner and the page reverts to normal document flow, with a sticky header, the normal nav, and the header's own language switch (`.teeth-nav` and `.lang-teeth` are hidden).

So a change made in the desktop stage does not reach mobile on its own.

### What to touch for any edit
- `assets/css/style.css`: the `max-width: 900px` / `680px` / `700px` branches, and the `min-width: 901px` ones. The consolidated **`── MOBILE: page-local layouts ──`** block at the end of the file is where page-specific mobile rules go — not in each page's `<style>`, so there is one place to maintain.
- `assets/js/main.js`: the `matchMedia("(max-width: 900px)")` guards (`initMouthWindow` is desktop-only by design).
- New UI needs its mobile sizing and tap targets checked, not assumed.

### Caught and fixed when the rule was set
Every grid declared in a page's own `<style>` block had **no breakpoint at all** — the global grids (`.grid-2/3/4`, `.footer-grid`, `.hero-grid`) were handled at 960/680px, but the page-local ones were not. On a phone that meant:
- `.booking-layout` stayed 1.3fr/.9fr, so the booking form added earlier the same day was squeezed into a ~150px column.
- `.contact-grid` stayed 1fr 1fr.
- `.service-block` kept its 90px number gutter and `.service-list` stayed two-column.
- The calendar's tooth grid had ~37px cells at 360px wide — under the 44px tap-target minimum.
- Form inputs were 14.5px, which makes **iOS Safari zoom the whole page on focus**. Now 16px under 900px.
- Submit buttons had no minimum height; now 48px.

`check-site.mjs` now enforces this: any page-local `grid-template-columns` with more than one column that no `max-width` media query collapses is reported. Verified against synthetic cases — it catches both `1.3fr .9fr` and `repeat(7, 1fr)` and ignores single-column rules.

**Still unverified by eye:** the mobile layout has not been seen in a real browser this session (Chrome extension not connected). Check it at ~390px wide before showing the client.

## Mobile parity pass (2026-10-01, later same day)

A full audit after the mobile rule was set found mobile was **substantively broken**, from one systemic mistake repeated in several places.

### Root cause: media queries carry no specificity weight
A desktop base rule prefixed `body.home-mouth` or `.mouth-window` outranks the responsive rule written to override it, and being later in the file wins twice over. Two instances, both verified:
- `body.home-mouth .primary-nav { display: flex }` (0,2,1) beat `nav.primary-nav { display: none }` (0,1,1) → **the six-link desktop nav never hid at any width.**
- `.mouth-window .footer-grid { 1fr 1fr }` (0,2,0) beat `.footer-grid { 1fr }` (0,1,0) → **footer stayed two columns at 390px.**

**Any mobile rule for an element inside `.mouth-window` must match or exceed the desktop rule's specificity.** `check-site.mjs` now enforces this.

### Fixed
- **Nav (P0).** `.nav-toggle` existed in **0 of 7 pages** and `.nav-open` had **0 CSS rules**, so `initMobileNav()` had always been a no-op — the hamburger was designed and styled but never built. With the nav stuck visible the header overflowed below ~705px and at 390px the language switch sat **entirely off-screen**, making Arabic and French unreachable. Added the button to all 7 pages (`tools/patch-nav.mjs`), wrote the drawer styles at matched specificity, added close-on-link-click / Escape / breakpoint-change, `data-i18n-aria` support for the translated label (new `common.nav.menu`), and `overflow-x: hidden` as a backstop.
- **Intro on mobile.** The 16:9 clip in portrait lost ~74% of the frame to `object-fit: cover`, then `loaderZoom` scaled 2.4× on top. Mobile now runs the existing stills path and **never fetches the video**; markup ships `preload="none"` and desktop opts back in, so inner pages stop downloading a clip they discard. Zoom is now `--loader-zoom` (2.4 desktop / 1.6 mobile).
- **Intro replay.** Home deliberately bypassed the per-session guard; that bypass is now gated on `innerWidth > 900`, so phones don't re-download 2.7MB per visit. Desktop behaviour unchanged, per the brief.
- **WhatsApp float.** ~195×48px fixed bottom-right with no compensating padding — it covered `#confirmBtn` on booking (a WhatsApp CTA obscuring the primary WhatsApp CTA), the `tel:` buttons and the copyright. Now smaller on mobile, footer cleared by 72px, and hidden on `body.page-booking` where the page's own CTA is the same action.
- **Dead code.** `#mouthHero` markup exists in **0 pages**, so `initMouthHero()` (23 lines) and `style.css`'s hero section (66 lines) were unreachable everywhere — removed, taking the stray `700px` breakpoint with them.
- **Touch.** 44px minimums on nav links, language switch, footer links and `tel:` buttons; `.brand small` 11px→13px, `.weekday-cell` 11.5px→13px; the three `:hover` transforms (`.card`, `.btn`, `.whatsapp-float`) are now behind `@media (hover: hover)` so tapped elements don't stay stuck lifted; `initMouthWindow()` re-binds on rotation instead of reading the breakpoint once.

### My own regressions from earlier the same day, now fixed
- `#loader .loader-stage { width:100%; height:100% }` was a **no-op** — the element is already `position:absolute; inset:0`. The comment claiming it prevented overflow was wrong; both removed.
- `.mouth-window { font-size: 15px }` was declared twice in the same band.
- `body[dir="rtl"] .mouth-window { text-align: right }` outranked the centred blocks, so **in Arabic on mobile every centred hero/CTA went right-aligned.** Now re-asserts `center` explicitly for `.window-hero`, `.section-head.center`, `.cta-band`, `.hero`.
- `body[dir="rtl"] .nav-row` was duplicated.

### New gate rules in `tools/check-site.mjs`
- **Error:** every page must contain `.nav-toggle`.
- **Warning:** a `max-width` rule that a higher-specificity base rule outranks — the check that would have caught both root-cause bugs. Compares selector **subjects** (rightmost compound) after stripping comments, skips `min-width`-only blocks since their ranges can't overlap, and suppresses a finding when another mobile rule already covers the property strongly enough. First cut produced ~50 false positives; all three defects are fixed and both rules were **negative-tested in a sandbox copy** — reintroducing either bug makes the gate fail.
- **Warning:** `font-size` under 13px inside a `max-width` block.

### Still unverified by eye
Chrome's native-messaging host is failing (`-101`), so the extension can't drive the browser; everything here is static analysis. **View at 320/390/680px in all three languages before showing the client.**

### Preview artefact
`preview/mobile-mouth-stage.html` measures whether the desktop mouth stage could work in portrait. Scaling to fit screen *width* gives 9–19px teeth at 2.3px labels (unusable); scaling to fill screen *height* gives 34–75px × 62px teeth at ~9px (viable, but only the central third of the mouth is visible). Decision was to keep the banner approach. **Keep this file out of the deploy; delete once recorded.**

## Session 2026-10-02 — the booking page becomes the mouth (reconstructed)

This session was never written down at the time; what follows is read back from
the files it left behind (`tools/patch-booking-*.mjs`, `tools/*teeth*`,
`assets/media/tool-*`), so treat it as a record of the code, not of the intent.

- **The teeth are the calendar.** `booking.html` no longer puts the menu on the
  upper teeth: the menu moved to the palate (`.palate-nav`), EN/AR/FR sit above
  the uvula (`.palate-langs`), the page text and form sit on the tongue
  (`.mouth-window.tongue-window`), and all 32 teeth carry the dates
  (`#dateTeeth`, rendered by `assets/js/booking-teeth.js`). Day N goes on tooth
  N — 32 teeth against a 28-31 day month, with the wisdom teeth spare.
- **The tooth map is measured, not guessed.** `tools/build-teeth-map.py` locates
  each crown in `mouth-open.jpg` and writes `assets/data/teeth.json`;
  `tools/build-teeth-js.mjs` inlines it as `teeth-data.js` because the site has
  to open from `file://`, where `fetch` is blocked. Label size follows each
  cell's real width (`data-size`), and the back molars tilt toward the arch.
- **The confirmation sequence.** On confirm: the chosen tooth shines, the shine
  ripples out to the whole arch, the mouth closes into a smile and reopens —
  `mouth-close-smile.mp4` / `mouth-smile-open.mp4`, both Higgsfield (Kling v3.0)
  from the same stills as the intro, `preload="none"` so only a patient who
  books pays for them. Capped at 7s and never on the error path: the WhatsApp
  hand-off is never gated on the animation.
- **Instrument assets.** The hand-drawn SVG drill was replaced by Higgsfield
  renders cropped and background-removed to `tool-drill/mirror/probe/scaler.webp`
  (14-27KB each), per the brief's "motion via Higgsfield".

**What it missed:** every one of those rules is desktop-only, and the mobile
rule was not applied. See below.

## Session 2026-10-03 — mobile parity for the calendar, and the repo

### The booking calendar was broken on phones (fixed)
Verified in Chromium at 390x844 — the first time any of this has been seen in a
real browser. The 32 date teeth are positioned with inline `left/top/width/
height` percentages of the stage, and **inline styles beat every media query**,
so on a phone (where the stage is a 42vh banner) the cells measured **13-34px
wide** and floated as pink bars over the month stepper and the form card. The
page was unusable, which is the page that converts.

`tools/patch-booking-mobile.mjs` gives the calendar a second layout instead of
trying to shrink the first:
- **>=901px** — absolute on the arches, exactly as built on 10-02.
- **<=900px** — the teeth leave the stage for `#teethMount` in normal flow and
  become a 7-column weekday grid, 48px minimum cells, still tooth-shaped. The
  palate menu and language pills hide (the header nav covers both).
- The same 32 buttons in the same day order, so the click handlers, `paintMonth`
  and the confirm sequence are untouched. Weekday alignment is one
  `grid-column-start` on day 1; everything flows after it.
- Crossing 900px (rotation, a resized window) throws the cached buttons away and
  rebuilds — the two layouts build different buttons.

### Page-local grids never actually collapsed (fixed)
`.booking-layout`, `.contact-grid` and `.service-list` are declared in each
page's own `<style>`, and the mobile overrides in `style.css` matched them at the
**same specificity**. The page's `<style>` is parsed later, so it won on order
and all three stayed multi-column at 390px — the order twin of the specificity
bug from 10-01, and the 10-01 fix added the breakpoints without the weight. They
now carry a `body` prefix (`tools/patch-grid-order.mjs`).

**New gate rule** (`tools/patch-check-grid-order.mjs`): a page-local grid whose
only mobile override sits in `style.css` at equal-or-lower specificity is now an
**error**, not a warning. Negative-tested — reverting `body .booking-layout`
makes the gate fail with the explanation.

### Also fixed
- Dead CSS removed: the 7-column grid calendar the date teeth replaced
  (`.weekday-row`, `.days-grid`, `.tooth-*`, `.weekday-cell`) was still styled in
  `booking.html` and still being sized by a mobile block in `style.css`.
- Tap targets: `.learn-more` (76x22) and the contact page's `tel:`/WhatsApp
  values (24px) were under the 44px minimum on phones; both now 44px.
- The weekday no longer repeats inside all 31 grid cells — the column header
  carries it. On the arches the tooth keeps it, because there is no header there.
- `booking.selectDate` is now used (the grid's `aria-label`) and is on the gate's
  JS-keys list, so the unused-key warning is gone.

### Verified in Chromium (the 10-01 "unverified by eye" item)
index / about / services / booking / contact / blog at **1440x900, 390x844 and
320x760**, plus Arabic (RTL) on home, booking, services and contact. No console
errors, no failed requests, no horizontal overflow on any of them, and every
interactive element now clears 40px on mobile. Screenshots in `preview/verify/`
(not deployed). Note the language key is `dh_lang`, not `dh-lang`.

### Repo + deployment (2026-10-03)
- The folder is now a git repo (`main`), first commit is the whole site.
- `.github/workflows/pages.yml` runs `check-site.mjs` and `validate-posts.mjs`,
  rebuilds the feeds, then deploys to GitHub Pages — a failing gate blocks the
  deploy. It also runs **daily**, because posts go live by date and the feeds
  have to catch up.
- `.gitignore` keeps the 72MB screen recording, `preview/` and `_attic/` out.
- `_attic/media/` holds everything unreferenced that was in `assets/media/`:
  the duplicate loader encodes, the HEVC alternate, `loader-1080-alt.mp4` (the
  take still awaiting a pick) and the full-size instrument/mouth sources. The
  deployed tree is 24MB.
- `tools/set-domain.mjs` now accepts a base path, so a GitHub Pages project URL
  (`https://user.github.io/repo`) works as well as a real domain;
  `build-feeds.mjs` reads the base back out of `robots.txt` the same way.
- **Open:** `gh auth login` has not been run, so nothing is pushed yet. After
  auth: create the repo, push, enable Pages, then
  `node tools/set-domain.mjs https://<user>.github.io/<repo>` and
  `node tools/build-feeds.mjs`.
