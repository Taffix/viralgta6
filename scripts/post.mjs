// Makes today's Instagram carousel for viralgta6.com from data/videos.json:
// 1 cover + top 5 videos (1080x1350 PNG) + caption.txt with full credits.
// Renders with headless Chrome (preinstalled on GitHub's Ubuntu runners) or Edge on Windows.
// Usage: node scripts/post.mjs [outDir]   (default: out/post)

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const OUT = resolve(process.argv[2] || 'out/post');
const data = JSON.parse(await readFile(new URL('data/videos.json', root), 'utf8'));
const TOP = 5;

const perHour = it => it.views ? it.views / Math.max(1, (Date.now() - new Date(it.published || Date.now() - 7 * 864e5)) / 36e5) : 0;
const items = (data.items || []).filter(i => i.views).sort((a, b) => perHour(b) - perHour(a)).slice(0, TOP);
if (!items.length) { console.log('[post] no videos yet, nothing to make'); process.exit(0); }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => n == null ? '' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const PF = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram' };
const handle = c => c?.handle ? (c.handle.startsWith('@') ? c.handle : '@' + c.handle) : (c?.name || 'unknown creator');
const ago = iso => {
  if (!iso) return '';
  const h = (Date.now() - new Date(iso)) / 36e5;
  return h < 1 ? 'just posted' : h < 24 ? Math.floor(h) + (Math.floor(h) === 1 ? ' hour ago' : ' hours ago') : Math.floor(h / 24) === 1 ? 'yesterday' : Math.floor(h / 24) + ' days ago';
};
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
const dateLine = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const palm = `<svg viewBox="0 0 300 420"><path d="M150 420c6-90 2-170-14-250l12-2c18 82 22 164 16 252z"/><path d="M142 168c-30-40-80-52-132-30 46-6 86 6 120 40z"/><path d="M142 166c-50-6-96 18-122 64 34-30 76-48 120-50z"/><path d="M146 164c-14-46-50-80-104-90 44 18 74 50 92 94z"/><path d="M148 162c10-50 46-84 102-92-44 18-74 52-90 96z"/><path d="M150 166c40-30 92-34 140-6-46-8-90 0-128 22z"/><path d="M150 170c46 4 86 34 104 82-28-34-64-56-108-66z"/><path d="M146 168c-6 44-26 82-62 106 26-30 42-66 48-108z"/></svg>`;

const css = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;background:#110626;color:#fff;font-family:'Barlow',sans-serif}
.slide{position:relative;width:1080px;height:1350px;overflow:hidden;isolation:isolate}
.sky{position:absolute;inset:0;z-index:-3;background:linear-gradient(180deg,#0c0424 0%,#2a0b5c 26%,#7a1a8c 46%,#e0307f 61%,#ff7a4d 71%,#ffc560 78%,#1a0638 78.3%,#0c0424 100%)}
.sun{position:absolute;z-index:-2;left:50%;top:78%;width:640px;height:640px;transform:translate(-50%,-50%);border-radius:50%;background:linear-gradient(180deg,#fff2a8,#ffb347 45%,#ff4d7d 85%);
  -webkit-mask:linear-gradient(#000 0 50%,transparent 50%),repeating-linear-gradient(180deg,#000 0 16px,transparent 16px 24px)}
.grid{position:absolute;left:-50%;right:-50%;top:78.3%;height:60%;z-index:-1;transform-origin:50% 0;transform:perspective(320px) rotateX(62deg);
  background:linear-gradient(90deg,rgba(255,63,164,.95) 2px,transparent 2px) 50% 0/80px 100%,linear-gradient(180deg,rgba(255,63,164,.95) 2px,transparent 2px) 0 0/100% 50px;filter:drop-shadow(0 0 5px #ff3fa4)}
.palm{position:absolute;bottom:21.7%;z-index:-1;fill:#0c0424}
.palm svg{display:block;width:100%}
.scan{position:absolute;inset:0;z-index:5;pointer-events:none;background:repeating-linear-gradient(180deg,rgba(0,0,0,.12) 0 1px,transparent 1px 3px)}
.script{font-family:'Yellowtail',cursive;color:#ffe9f6;text-shadow:0 0 8px rgba(255,63,164,.95),0 0 24px rgba(255,63,164,.7),0 0 60px rgba(255,63,164,.4)}
.chrome{font-family:'Anton',sans-serif;font-style:italic;text-transform:uppercase;background:linear-gradient(180deg,#fff 0%,#d9f4ff 38%,#6b4fb3 50%,#ffb3dc 56%,#fff 92%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(5px 5px 0 #8a3ffc) drop-shadow(0 0 18px rgba(47,243,224,.45));padding-right:.1em}
.teal{color:#2ff3e0;text-shadow:0 0 8px rgba(47,243,224,.9),0 0 22px rgba(47,243,224,.5)}
.brand{position:absolute;left:0;right:0;bottom:46px;text-align:center;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:40px;letter-spacing:3px;text-transform:uppercase;z-index:6}
.cover .wrap{position:absolute;left:80px;right:80px;top:150px}
.cover .s{font-size:190px;line-height:.9;transform:rotate(-7deg);transform-origin:left bottom;display:block;margin-bottom:-30px;position:relative;z-index:1}
.cover .c{font-size:230px;line-height:.9;display:block}
.cover .d{margin-top:34px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:44px;letter-spacing:3px;text-transform:uppercase}
.cover .k{margin-top:22px;display:inline-block;padding:14px 26px;background:linear-gradient(90deg,#ff3fa4,#ff8f4a);color:#1a0820;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:44px;letter-spacing:1px;text-transform:uppercase;box-shadow:0 0 30px -6px #ff3fa4}
.vid .sky{background:linear-gradient(180deg,#0c0424 0%,#1d0846 50%,#3a0f6b 82%,#7a1a8c 100%)}
.vid .sun{display:none}
.vid .grid{top:86%}
.vid .rank{position:absolute;left:64px;top:44px;font-size:200px;line-height:1}
.vid .pf{position:absolute;right:64px;top:84px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:40px;letter-spacing:2px;text-transform:uppercase;padding:10px 22px;border-radius:8px}
.pf.youtube{background:#ff2b2b}.pf.tiktok{background:#2ff3e0;color:#120a1f}.pf.instagram{background:#ff4fa3;color:#120a1f}
.vbody{position:absolute;top:280px;left:72px;right:72px;bottom:130px;display:flex;flex-direction:column;align-items:center;gap:56px}
.frame{position:relative;flex:none;transform:rotate(-1.5deg);border:5px solid #ffe3f3;box-shadow:0 0 10px rgba(255,63,164,.9),0 0 30px rgba(255,63,164,.5),16px 16px 0 #2ff3e0,32px 32px 0 #ff3fa4;background:#1a0b36;overflow:hidden}
.frame.w{width:880px;height:495px}
.frame.t{width:390px;height:520px}
.frame img{width:100%;height:100%;object-fit:cover;display:block}
.frame .art{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(140deg,#8a3ffc,#ff3fa4 60%,#ff8f4a);font-family:'Anton',sans-serif;font-size:90px;text-transform:uppercase;color:rgba(255,255,255,.4)}
.info{width:100%;margin-top:auto}
.info .t{font-family:'Anton',sans-serif;text-transform:uppercase;font-size:58px;line-height:1.04;text-shadow:0 4px 0 rgba(12,4,36,.6);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.info .st{margin-top:22px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:40px;letter-spacing:1.5px;text-transform:uppercase}
.credit{margin-top:24px;display:flex;align-items:center;gap:20px;padding:20px 26px;background:rgba(12,4,36,.78);border:2px solid rgba(47,243,224,.8);box-shadow:0 0 24px -6px #2ff3e0}
.credit .av{width:84px;height:84px;border-radius:50%;object-fit:cover;flex:none;border:3px solid #fff;background:#251049;display:grid;place-items:center;font-family:'Anton';font-size:40px}
.credit small{display:block;font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:28px;letter-spacing:2px;text-transform:uppercase;color:#c9b8e8}
.credit b{display:block;font-size:44px;line-height:1.1}
.credit span{display:block;font-size:30px;color:#c9b8e8;margin-top:2px}
`;

const shell = (cls, inner, bg = true) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Yellowtail&family=Barlow+Condensed:wght@600;700&family=Barlow:wght@500;700&display=swap" rel="stylesheet">
<style>${css}</style></head><body><div class="slide ${cls}">
${bg ? `<div class="sky"></div><div class="sun"></div><div class="grid"></div>` : ''}
${inner}<div class="brand teal">viralgta6.com</div><div class="scan"></div></div></body></html>`;

const cover = shell('cover', `
  <div class="palm" style="left:-60px;width:400px">${palm}</div>
  <div class="palm" style="right:-50px;width:340px;transform:scaleX(-1)">${palm}</div>
  <div class="wrap">
    <span class="s script">Viral</span><span class="c chrome">Today</span>
    <div class="d teal">${esc(dateLine)}</div>
    <div class="k">Top ${items.length} going viral now</div>
  </div>`);

const slide = (it, i) => {
  const c = it.creator || {};
  const tall = it.vertical || it.platform !== 'youtube';
  const unit = it.platform === 'youtube' ? 'subscribers' : 'followers';
  const pic = it.thumb ? `<img src="${esc(it.thumb)}" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=art>${PF[it.platform]}</div>'">` : `<div class="art">${PF[it.platform]}</div>`;
  const av = c.avatar ? `<img class="av" src="${esc(c.avatar)}" referrerpolicy="no-referrer" onerror="this.outerHTML='<span class=av>${esc((c.name || '?')[0])}</span>'">` : `<span class="av">${esc((c.name || '?')[0])}</span>`;
  return shell('vid', `
    <div class="rank chrome">#${i + 1}</div>
    <div class="pf ${it.platform}">${PF[it.platform]}</div>
    <div class="vbody"><div class="frame ${tall ? 't' : 'w'}">${pic}</div>
    <div class="info">
      <div class="t">${esc(clip(it.title, tall ? 70 : 80))}</div>
      <div class="st teal">${num(it.views)} views${it.published ? ' · ' + esc(ago(it.published)) : ''}</div>
      <div class="credit">${av}<div><small>Credit</small><b>${esc(handle(c))}</b><span>${esc([c.name && c.name !== handle(c).slice(1) ? c.name : '', c.followers ? num(c.followers) + ' ' + unit : ''].filter(Boolean).join(' · ') || PF[it.platform])}</span></div></div>
    </div></div>`);
};

/* caption with full credits */
const tags = ['#viral', '#trending', '#viralvideos', '#fyp', '#explorepage', '#reels', '#tiktokviral', '#youtube', '#gta6', '#vicecity', '#retrowave', '#80s'];
const caption = [
  `Top ${items.length} going viral today 🌴🔥 ${dateLine}`,
  '',
  ...items.map((it, i) => `${i + 1}. ${clip(it.title, 70)} — by ${handle(it.creator)} on ${PF[it.platform]} (${num(it.views)} views)`),
  '',
  'All videos belong to their creators. Go show them some love and follow them! 🙌',
  'Watch every video + the full daily list at viralgta6.com (link in bio)',
  '',
  'Want your video removed or credited differently? DM us.',
  '',
  tags.join(' ')
].join('\n');

/* render */
const chrome = process.env.CHROME || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser'
].find(p => existsSync(p));
if (!chrome) throw new Error('No Chrome/Edge found; set CHROME=/path/to/chrome');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const profile = join(OUT, '.profile');
const pages = [cover, ...items.map(slide)];
for (const [i, html] of pages.entries()) {
  const file = join(OUT, `slide-${i + 1}.html`);
  await writeFile(file, html);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${profile}`,
    '--window-size=1080,1350', '--force-device-scale-factor=1', '--virtual-time-budget=9000',
    `--screenshot=${join(OUT, `slide-${i + 1}.png`)}`, pathToFileURL(file).href], { stdio: 'ignore', timeout: 60000 });
  await rm(file);
}
await rm(profile, { recursive: true, force: true });
await writeFile(join(OUT, 'caption.txt'), caption + '\n');
console.log(`[post] made ${pages.length} slides + caption in ${OUT}`);
