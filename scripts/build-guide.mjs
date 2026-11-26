// Builds guide.html (viralgta6.com/tips/guide) from data/guide.json.
// Static HTML on purpose: search engines read every tip directly.
// Run: node scripts/build-guide.mjs
import { readFile, writeFile } from 'node:fs/promises';

const G = JSON.parse(await readFile(new URL('../data/guide.json', import.meta.url), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const total = G.categories.reduce((n, c) => n + c.tips.length, 0);
const URL_ = 'https://viralgta6.com/tips/guide';
const title = `GTA 6 Tips & Tricks: ${total} Things to Know (Money, Weapons, Cars, Police) | ViralGTA6`;
const desc = `${total} practical GTA 6 tips by category: make and keep money, weapons and combat, cars, losing the police, missions you can miss, hidden mechanics and Jason & Lucia's stats.`;

const ld = {
  '@context': 'https://schema.org', '@type': 'Article', headline: `GTA 6 tips & tricks: ${total} things to know`, description: desc,
  url: URL_, dateModified: G.updated, image: 'https://viralgta6.com/share.png',
  about: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' },
  publisher: { '@type': 'Organization', name: 'ViralGTA6', url: 'https://viralgta6.com/' },
  hasPart: G.categories.map(c => ({ '@type': 'ItemList', name: c.name, itemListElement: c.tips.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.t, description: t.d })) })),
};

const src = ids => ids.map(id => G.sources[id]).filter(Boolean).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(' · ');
let n = 0;
const sections = G.categories.map(c => `
  <section class="cat" id="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
    <h2 id="h-${esc(c.id)}"><span>${c.icon}</span>${esc(c.name)} <small>${c.tips.length} tips</small></h2>
    <p class="intro">${esc(c.intro)}</p>
    <ol class="tips">${c.tips.map(t => `
      <li id="${esc(c.id)}-${++n}">
        <h3>${esc(t.t)}</h3>
        <p>${esc(t.d)}</p>${t.n ? `
        <p class="note">${esc(t.n)}</p>` : ''}
        <p class="src">Source: ${src(t.s)}</p>
      </li>`).join('')}
    </ol>
  </section>`).join('');

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
:root{--ink:#110626;--ink2:#1a0b36;--line:#3b1d6b;--pink:#ff3fa4;--orange:#ff8f4a;--yellow:#ffd65a;--teal:#2ff3e0;--purple:#8a3ffc;--muted:#c9b8e8;--dim:#8f7bb5;
  --chrome:linear-gradient(180deg,#fff 0%,#e6fdff 46%,#ff3fa4 50%,#ffb3dc 60%,#fff 100%);--display:'Anton',Impact,sans-serif;--cond:'Barlow Condensed',sans-serif;--body:'Barlow',system-ui,sans-serif;--top:64px}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-padding-top:130px;scroll-behavior:smooth}
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
.hero{padding:48px clamp(16px,4vw,48px) 28px;max-width:980px;margin:0 auto}
.hero h1{font-family:var(--display);font-style:italic;font-weight:400;font-size:clamp(40px,7vw,76px);line-height:.95;text-transform:uppercase;background:var(--chrome);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:.15em}
.hero p{color:var(--muted);margin-top:14px;max-width:62ch;font-size:17px}
.hero .links{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.btn{font-family:var(--cond);font-weight:700;font-size:15px;letter-spacing:.6px;text-transform:uppercase;padding:10px 14px;border-radius:4px;text-decoration:none;border:1.5px solid var(--teal);color:#dffffb}
.btn.hot{background:linear-gradient(90deg,var(--pink),var(--orange));color:#1a0820;border:0}
.chips{position:sticky;top:calc(var(--top) + env(safe-area-inset-top));z-index:40;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:12px clamp(16px,4vw,48px);background:rgba(17,6,38,.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.chips a{flex:none;font-family:var(--cond);font-weight:700;font-size:14px;letter-spacing:.5px;text-transform:uppercase;padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.16);text-decoration:none;white-space:nowrap}
.chips a:hover{border-color:var(--teal)}
main{max-width:980px;margin:0 auto;padding:10px clamp(16px,4vw,48px) 60px}
.cat{padding-top:34px}
.cat h2{display:flex;align-items:center;gap:12px;font-family:var(--cond);font-weight:700;font-size:30px;text-transform:uppercase;letter-spacing:.4px}
.cat h2 small{font-size:15px;color:var(--dim);font-weight:600;letter-spacing:.5px}
.intro{color:var(--muted);margin:6px 0 16px}
.tips{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;counter-reset:t}
.tips li{position:relative;padding:16px 16px 14px 52px;border-radius:12px;background:linear-gradient(160deg,rgba(138,63,252,.12),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08);counter-increment:t}
.tips li::before{content:counter(t);position:absolute;left:14px;top:14px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-family:var(--cond);font-weight:700;font-size:15px;background:var(--pink);color:#1a0820}
.tips h3{font-family:var(--cond);font-weight:700;font-size:20px;line-height:1.15;text-transform:uppercase;letter-spacing:.3px}
.tips p{font-size:15px;color:#e9dcff;margin-top:6px}
.tips .note{font-size:13.5px;color:#ffe3a6;background:rgba(255,214,90,.08);border-left:3px solid var(--yellow);padding:6px 9px;border-radius:0 6px 6px 0}
.tips .src{font-size:12px;color:var(--dim)}
.tips .src a{color:var(--dim)}
.disc{max-width:980px;margin:0 auto;padding:0 clamp(16px,4vw,48px) 50px;color:var(--dim);font-size:13.5px}
footer{border-top:1px solid var(--line);padding:22px clamp(16px,4vw,48px) 40px;color:var(--dim);font-size:13px;text-align:center}
@media (max-width:760px){:root{--top:56px}.brand{font-size:22px}.nav a{font-size:14px;padding:7px 9px}.hero{padding-top:28px}.tips{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style>
</head>
<body>
<header class="top">
  <a class="brand" href="/" aria-label="viralgta6.com home"><i>Viral</i><b>GTA6</b><small>.com</small></a>
  <nav class="nav" aria-label="Site"><a href="/">Viral now</a><a href="/secrets">Secrets</a><a href="/tips" aria-current="page">Tips</a><a href="/map">Map</a></nav>
</header>
<div class="hero">
  <h1>GTA 6 tips &amp; tricks</h1>
  <p>${total} practical tips for Leonida, sorted by category: keep your money, buy the right guns, steal the right cars, lose the police and don't miss the one-time moments. Short, to the point, with sources.</p>
  <div class="links"><a class="btn hot" href="/tips">Watch tip Shorts</a><a class="btn" href="/map">Secrets map</a></div>
</div>
<nav class="chips" aria-label="Categories">${G.categories.map(c => `<a href="#${esc(c.id)}">${c.icon} ${esc(c.name)}</a>`).join('')}</nav>
<main>${sections}
</main>
<p class="disc">Collected from beginner and money guides by ${Object.values(G.sources).map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(', ')}, rewritten and sorted by ViralGTA6. Updated ${esc(G.updated)}. Patches can change details such as prices and limits. Where guides disagree, the tip says so.</p>
<footer>viralgta6.com · Fan-made, not affiliated with Rockstar Games or Take-Two Interactive.</footer>
</body>
</html>
`;
await writeFile(new URL('../guide.html', import.meta.url), html);
console.log('guide.html written:', total, 'tips in', G.categories.length, 'categories');
