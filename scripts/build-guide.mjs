// Builds guide.html (viralgta6.com/tips/guide) from data/guide.json.
// Static HTML on purpose: search engines read every tip directly.
// Layout: top 5, sticky category sidebar (desktop), categories as blocks with subgroups,
// categories fold open/closed on phones.
// Run: node scripts/build-guide.mjs
import { readFile, writeFile } from 'node:fs/promises';

const G = JSON.parse(await readFile(new URL('../data/guide.json', import.meta.url), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const total = G.categories.reduce((n, c) => n + c.tips.length, 0);
const URL_ = 'https://viralgta6.com/tips/guide';
const title = `GTA 6 Tips & Tricks: ${total} Things to Know (Money, Weapons, Cars, Police) | ViralGTA6`;
const desc = `${total} practical GTA 6 tips by category: make and keep money, weapons and combat, cars, losing the police, missions you can miss, hidden mechanics and Jason & Lucia's stats.`;
const COLORS = { money: '#ffd65a', weapons: '#ff8f4a', cars: '#2ff3e0', police: '#ff3fa4', story: '#b48cff', controls: '#7ee0ff', stats: '#8dff9c' };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ld = {
  '@context': 'https://schema.org', '@type': 'Article', headline: `GTA 6 tips & tricks: ${total} things to know`, description: desc,
  url: URL_, dateModified: G.updated, image: 'https://viralgta6.com/share.png',
  about: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' },
  publisher: { '@type': 'Organization', name: 'ViralGTA6', url: 'https://viralgta6.com/' },
  hasPart: G.categories.map(c => ({ '@type': 'ItemList', name: c.name, itemListElement: c.tips.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.t, description: t.d })) })),
};

const src = ids => ids.map(id => G.sources[id]).filter(Boolean).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(' · ');
const tipHTML = (c, t) => `
          <li id="${esc(c.id)}-${slug(t.t)}">
            <h4>${esc(t.t)}</h4>
            <p>${esc(t.d)}</p>${t.n ? `
            <p class="note">${esc(t.n)}</p>` : ''}
            <p class="src">${src(t.s)}</p>
          </li>`;

const sections = G.categories.map((c, ci) => {
  const groups = [...new Set(c.tips.map(t => t.g))];
  return `
    <details class="cat" id="${esc(c.id)}" style="--c:${COLORS[c.id] || '#fff'}" open>
      <summary>
        <span class="ic">${c.icon}</span>
        <span class="tt"><h2>${esc(c.name)}</h2><span class="intro">${esc(c.intro)}</span></span>
        <span class="count">${c.tips.length}</span>
      </summary>
      <div class="groups">${groups.map(g => `
        <div class="group">
          <h3>${esc(g)}</h3>
          <ul class="tips">${c.tips.filter(t => t.g === g).map(t => tipHTML(c, t)).join('')}
          </ul>
        </div>`).join('')}
      </div>
    </details>`;
}).join('');

const top = (G.top || []).map(([cid, tt]) => { const c = G.categories.find(x => x.id === cid); const t = c && c.tips.find(x => x.t === tt); return c && t ? { c, t } : null; }).filter(Boolean);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#140a24">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${URL_}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ViralGTA6">
<meta property="og:url" content="${URL_}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://viralgta6.com/share.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Yellowtail&family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--ink:#110626;--ink2:#1a0b36;--ink3:#221043;--line:#3b1d6b;--pink:#ff3fa4;--orange:#ff8f4a;--yellow:#ffd65a;--teal:#2ff3e0;--muted:#c9b8e8;--dim:#8f7bb5;
  --chrome:linear-gradient(180deg,#fff 0%,#e6fdff 46%,#ff3fa4 50%,#ffb3dc 60%,#fff 100%);--display:'Anton',Impact,sans-serif;--cond:'Barlow Condensed',sans-serif;--body:'Barlow',system-ui,sans-serif;--top:64px}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-padding-top:calc(var(--top) + 20px);scroll-behavior:smooth}
body{background:var(--ink);color:#fff;font-family:var(--body);-webkit-font-smoothing:antialiased;line-height:1.55}
a{color:inherit}
.top{position:sticky;top:0;z-index:50;height:calc(var(--top) + env(safe-area-inset-top));padding:env(safe-area-inset-top) clamp(14px,3vw,40px) 0;display:flex;align-items:center;gap:22px;background:rgba(20,10,36,.94);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.08)}
.brand{font-size:26px;line-height:1;text-decoration:none;display:flex;align-items:baseline;gap:4px;flex:none}
.brand i{font-family:'Yellowtail',cursive;font-style:normal;font-size:1.25em;color:#ffe3f3;text-shadow:0 0 6px rgba(255,63,164,.9),0 0 18px rgba(255,63,164,.6);transform:rotate(-6deg);display:inline-block}
.brand b{font-family:var(--display);font-weight:400;font-style:italic;font-size:1.15em;color:#fff;text-shadow:0 0 8px rgba(47,243,224,.8);padding-right:.1em}
.brand small{font-family:var(--cond);font-weight:700;font-size:.5em;color:var(--teal)}
.nav{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}
.nav a{font-family:var(--cond);font-weight:600;font-size:16px;letter-spacing:.6px;text-transform:uppercase;padding:8px 12px;border-radius:4px;color:var(--muted);text-decoration:none;white-space:nowrap}
.nav a[aria-current]{color:#fff;background:rgba(255,214,90,.1);box-shadow:inset 0 -3px 0 var(--yellow)}

.wrap{max-width:1180px;margin:0 auto;padding:0 clamp(16px,3vw,40px) 60px;display:grid;grid-template-columns:240px minmax(0,1fr);gap:40px}
.hero{grid-column:1/-1;padding:44px 0 6px}
.hero h1{font-family:var(--display);font-style:italic;font-weight:400;font-size:clamp(40px,6.5vw,72px);line-height:.95;text-transform:uppercase;background:var(--chrome);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.15em}
.hero p{color:var(--muted);margin-top:12px;max-width:64ch;font-size:17px}
.hero .links{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
.btn{font-family:var(--cond);font-weight:700;font-size:15px;letter-spacing:.6px;text-transform:uppercase;padding:10px 14px;border-radius:4px;text-decoration:none;border:1.5px solid var(--teal);color:#dffffb}
.btn.hot{background:linear-gradient(90deg,var(--pink),var(--orange));color:#1a0820;border:0}

/* sidebar = table of contents */
.toc{position:sticky;top:calc(var(--top) + 24px);align-self:start;display:grid;gap:4px}
.toc b{font-family:var(--cond);font-size:13px;letter-spacing:1.2px;text-transform:uppercase;color:var(--dim);margin:0 0 6px 12px}
.toc a{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;text-decoration:none;color:var(--muted);font-weight:600;font-size:15px;border-left:3px solid transparent}
.toc a span:last-child{margin-left:auto;font-size:13px;color:var(--dim)}
.toc a:hover{background:rgba(255,255,255,.04);color:#fff}
.toc a.on{background:rgba(255,255,255,.06);color:#fff;border-left-color:var(--c)}

.content{display:grid;gap:22px;min-width:0}
/* top 5 */
.top5{border-radius:16px;padding:20px 22px;background:linear-gradient(135deg,rgba(255,63,164,.18),rgba(47,243,224,.08));border:1px solid rgba(255,255,255,.12)}
.top5 h2{font-family:var(--cond);font-weight:700;font-size:24px;text-transform:uppercase;letter-spacing:.4px}
.top5 ol{list-style:none;counter-reset:t;display:grid;gap:10px;margin-top:12px}
.top5 li{counter-increment:t;display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start}
.top5 li::before{content:counter(t);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-family:var(--cond);font-weight:700;background:var(--pink);color:#1a0820}
.top5 a{text-decoration:none}
.top5 strong{font-family:var(--cond);font-size:18px;text-transform:uppercase;letter-spacing:.3px}
.top5 span{display:block;color:#e9dcff;font-size:15px}

/* category block */
.cat{border-radius:16px;background:var(--ink2);border:1px solid var(--line);overflow:hidden}
.cat summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:18px 20px;border-bottom:1px solid transparent;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 16%,transparent),transparent 70%)}
.cat summary::-webkit-details-marker{display:none}
.cat[open] summary{border-bottom-color:var(--line)}
.cat .ic{font-size:26px;width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:rgba(0,0,0,.25);flex:none;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 50%,transparent)}
.cat .tt{flex:1;min-width:0}
.cat h2{font-family:var(--cond);font-weight:700;font-size:26px;line-height:1.05;text-transform:uppercase;letter-spacing:.4px;color:#fff}
.cat .intro{display:block;color:var(--muted);font-size:14.5px;margin-top:2px}
.cat .count{flex:none;font-family:var(--cond);font-weight:700;font-size:14px;color:#14081f;background:var(--c);border-radius:999px;padding:3px 10px}
.groups{padding:6px 20px 18px}
.group{padding-top:14px}
.group h3{font-family:var(--cond);font-weight:700;font-size:15px;letter-spacing:1.2px;text-transform:uppercase;color:var(--c);margin-bottom:8px}
.tips{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.tips li{padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-left:3px solid var(--c)}
.tips h4{font-family:var(--cond);font-weight:700;font-size:18px;line-height:1.15;text-transform:uppercase;letter-spacing:.3px}
.tips p{font-size:14.5px;color:#e9dcff;margin-top:4px}
.tips .note{font-size:13px;color:#ffe3a6;background:rgba(255,214,90,.08);padding:6px 9px;border-radius:6px}
.tips .src{font-size:11.5px;color:var(--dim)}
.tips .src a{color:var(--dim)}
.disc{color:var(--dim);font-size:13.5px;margin-top:6px}
footer{border-top:1px solid var(--line);padding:22px clamp(16px,4vw,48px) 40px;color:var(--dim);font-size:13px;text-align:center}

@media (max-width:900px){
  .wrap{grid-template-columns:1fr;gap:18px}
  .toc{position:static;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .toc b{grid-column:1/-1;margin-left:2px}
  .toc a{background:var(--ink2);border:1px solid var(--line);border-left:3px solid var(--c);padding:9px 10px;font-size:14px}
  .tips{grid-template-columns:1fr}
}
@media (max-width:760px){:root{--top:56px}.brand{font-size:22px}.nav a{font-size:14px;padding:7px 9px}.hero{padding-top:26px}.cat summary{padding:14px 14px;gap:12px}.cat .ic{width:40px;height:40px;font-size:22px}.cat h2{font-size:22px}.groups{padding:4px 14px 14px}.top5{padding:16px}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<header class="top">
  <a class="brand" href="/" aria-label="viralgta6.com home"><i>Viral</i><b>GTA6</b><small>.com</small></a>
  <nav class="nav" aria-label="Site"><a href="/">Viral now</a><a href="/secrets">Secrets</a><a href="/tips" aria-current="page">Tips</a><a href="/map">Map</a></nav>
</header>
<div class="wrap">
  <div class="hero">
    <h1>GTA 6 tips &amp; tricks</h1>
    <p>${total} practical tips for Leonida in ${G.categories.length} groups: keep your money, buy the right guns, steal the right cars, lose the police and don't miss the one-time moments.</p>
    <div class="links"><a class="btn hot" href="/tips">Watch tip Shorts</a><a class="btn" href="/map">Secrets map</a></div>
  </div>
  <nav class="toc" aria-label="Categories"><b>Categories</b>${G.categories.map(c => `<a href="#${esc(c.id)}" style="--c:${COLORS[c.id]}"><span>${c.icon}</span><span>${esc(c.name)}</span><span>${c.tips.length}</span></a>`).join('')}</nav>
  <main class="content">
    <section class="top5" aria-labelledby="top5h">
      <h2 id="top5h">Start here: the 5 most important tips</h2>
      <ol>${top.map(({ c, t }) => `<li><a href="#${esc(c.id)}-${slug(t.t)}"><strong>${esc(t.t)}</strong><span>${esc(t.d)}</span></a></li>`).join('')}</ol>
    </section>${sections}
    <p class="disc">Collected from beginner and money guides by ${Object.values(G.sources).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(', ')}, rewritten and grouped by ViralGTA6. Updated ${esc(G.updated)}. Patches can change details such as prices and limits. Where guides disagree, the tip says so.</p>
  </main>
</div>
<footer>viralgta6.com · Fan-made, not affiliated with Rockstar Games or Take-Two Interactive.</footer>
<script>
(function () {
  var cats = [].slice.call(document.querySelectorAll('details.cat'));
  // phones: only the first category open, so the page stays short
  if (matchMedia('(max-width:760px)').matches && !location.hash) cats.forEach(function (d, i) { if (i) d.removeAttribute('open'); });
  // a link to a category or tip always opens its block
  function openFor(id) { var el = id && document.getElementById(id); var d = el && el.closest('details'); if (d) d.setAttribute('open', ''); }
  openFor(location.hash.slice(1));
  document.addEventListener('click', function (e) { var a = e.target.closest('a[href^="#"]'); if (a) openFor(a.getAttribute('href').slice(1)); });
  // sidebar shows where you are
  var links = {}; [].slice.call(document.querySelectorAll('.toc a')).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) Object.keys(links).forEach(function (k) { links[k].classList.toggle('on', k === e.target.id); }); }); }, { rootMargin: '-30% 0px -60% 0px' });
  cats.forEach(function (d) { io.observe(d); });
})();
</script>
</body>
</html>
`;
await writeFile(new URL('../guide.html', import.meta.url), html);
console.log('guide.html written:', total, 'tips in', G.categories.length, 'categories');
