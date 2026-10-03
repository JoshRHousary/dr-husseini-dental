/* Blog: renders from assets/data/posts.json. Posts "publish" automatically once
   their `date` reaches today — so a writer can queue Mon/Wed/Fri posts ahead of
   time with future dates and no server/cron is needed. See assets/data/README.md. */

async function loadPosts() {
  const res = await fetch(`${window.DH_BASE}assets/data/posts.json`);
  if (!res.ok) return [];
  const all = await res.json();
  const todayISO = new Date().toISOString().slice(0, 10);
  return all
    .filter(p => p.date <= todayISO)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function formatPostDate(iso, lang) {
  const d = new Date(iso + "T00:00:00");
  const localeMap = { en: "en-US", ar: "ar-LB", fr: "fr-FR" };
  return new Intl.DateTimeFormat(localeMap[lang] || "en-US", { year: "numeric", month: "long", day: "numeric" }).format(d);
}

function renderBlogList(lang, dict, posts) {
  const grid = document.getElementById("blogGrid");
  const empty = document.getElementById("blogEmpty");
  if (!grid) return;
  grid.innerHTML = "";

  if (!posts.length) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  posts.forEach(post => {
    const content = post.lang[lang] || post.lang.en;
    const card = document.createElement("a");
    card.href = `${window.DH_BASE}blog/post.html?slug=${encodeURIComponent(post.slug)}`;
    card.className = "card";
    card.style.display = "block";
    card.innerHTML = `
      <div class="icon">${formatPostDate(post.date, lang).split(" ")[0].slice(0,3).toUpperCase()}</div>
      <h3>${content.title}</h3>
      <p>${content.excerpt}</p>
      <span class="learn-more">${dict.blog.readMore}</span>
    `;
    grid.appendChild(card);
  });
}

/* The post page renders client side, so its crawlable metadata has to be set
   here rather than in the HTML: title, description, canonical, Open Graph, and
   an Article/MedicalWebPage block. Google renders JS, so this is indexable —
   but it is also why every post keeps a real <meta name="description"> in
   blog/post.html as the fallback. */
function applyPostMeta(post, content, lang) {
  const origin = (document.querySelector("link[rel=canonical]") || {}).href || location.href;
  const site = origin.replace(/\/blog\/post\.html.*$/, "").replace(/\/$/, "");
  const url = site + "/blog/post.html?slug=" + encodeURIComponent(post.slug);
  const plain = (content.body || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const description = (content.excerpt || plain).slice(0, 300);

  document.title = content.title + " — Dr. Jihad S. Husseini";
  document.documentElement.lang = lang;

  const set = (selector, attr, value) => {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement(selector.startsWith("link") ? "link" : "meta");
      // Copy EVERY attribute out of the selector, not just the first — otherwise
      // link[rel="alternate"][hreflang="ar"] is created without its hreflang and
      // the next lookup misses it again.
      for (const m of selector.matchAll(/\[([a-z-]+)="([^"]+)"\]/g)) {
        el.setAttribute(m[1], m[2]);
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  set('meta[name="description"]', "content", description);
  set('link[rel="canonical"]', "href", url);
  set('meta[property="og:type"]', "content", "article");
  set('meta[property="og:url"]', "content", url);
  set('meta[property="og:title"]', "content", content.title);
  set('meta[property="og:description"]', "content", description);
  set('meta[name="twitter:title"]', "content", content.title);
  set('meta[name="twitter:description"]', "content", description);
  ["en", "ar", "fr", "x-default"].forEach(l =>
    set('link[rel="alternate"][hreflang="' + l + '"]', "href", url));

  // Article data, kept separate from the site-wide Dentist block in the HTML head.
  let ld = document.getElementById("postLd");
  if (!ld) {
    ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "postLd";
    document.head.appendChild(ld);
  }
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    headline: content.title,
    description: description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: lang,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: { "@type": "Person", name: "Dr. Jihad S. Husseini" },
    publisher: { "@type": "Dentist", name: "Dr. Jihad S. Husseini", url: site + "/" },
    citation: post.sourceUrl || undefined
  });
}

function renderSinglePost(lang, dict, posts) {
  const container = document.getElementById("postContainer");
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const post = posts.find(p => p.slug === slug);

  if (!post) {
    const robots = document.head.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute("content", "noindex,follow");
    container.innerHTML = `<p>${dict.blog.empty}</p><a href="${window.DH_BASE}blog.html" class="btn btn-outline">${dict.blog.backToBlog}</a>`;
    return;
  }

  const content = post.lang[lang] || post.lang.en;
  applyPostMeta(post, content, lang);

  let sourceHtml = "";
  if (post.sourceUrl) {
    sourceHtml = `<p style="margin-top:32px;font-size:13.5px;color:var(--ink-soft);">
      <strong>${dict.blog.sourceLabel}</strong>
      <a href="${post.sourceUrl}" target="_blank" rel="noopener">${post.sourceLabel || post.sourceUrl}</a>
    </p>`;
  }

  container.innerHTML = `
    <div class="eyebrow">${formatPostDate(post.date, lang)}</div>
    <h1>${content.title}</h1>
    <div class="post-body">${content.body}</div>
    ${sourceHtml}
    <a href="${window.DH_BASE}blog.html" class="btn btn-outline" style="margin-top:32px;">${dict.blog.backToBlog}</a>
  `;
}

async function initBlogPage(lang, dict) {
  const posts = await loadPosts();
  if (document.getElementById("blogGrid")) renderBlogList(lang, dict, posts);
  if (document.getElementById("postContainer")) renderSinglePost(lang, dict, posts);
}

document.addEventListener("dh:langchange", (e) => initBlogPage(e.detail.lang, e.detail.dict));
document.addEventListener("DOMContentLoaded", () => {
  if (window.DH_STATE.dict) initBlogPage(window.DH_STATE.lang, window.DH_STATE.dict);
});
