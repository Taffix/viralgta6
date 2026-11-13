// Daily job for viralgta6.com: collects today's viral videos and writes data/videos.json.
// Runs on GitHub Actions (Node 20+, no packages needed).
// Secrets (GitHub → Settings → Secrets → Actions): YT_KEY, APIFY_TOKEN.
// If a source fails (no key, credit used up, error), yesterday's videos for that platform are kept.

import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../data/videos.json', import.meta.url);
const env = process.env;
const YT_KEY = env.YT_KEY || '';
const APIFY_TOKEN = env.APIFY_TOKEN || '';

// The site is all about GTA 6: every source only collects GTA 6 videos.
// Keep Apify numbers small to stay inside the free $5 per month.
const list = (v, d) => (v || d).split(',').map(s => s.trim()).filter(Boolean);
const YT_QUERIES = list(env.YT_QUERIES, 'GTA 6,GTA VI,Grand Theft Auto VI');   // 100 quota units per query (10,000 free per day)
const YT_PER_QUERY = +env.YT_PER_QUERY || 25;
const TT_HASHTAGS = list(env.TT_HASHTAGS, 'gta6,gtavi,gta6trailer');
const TT_PER_HASHTAG = +env.TT_PER_HASHTAG || 10;
const IG_HASHTAGS = list(env.IG_HASHTAGS, 'gta6,gtavi');
const IG_PER_HASHTAG = +env.IG_PER_HASHTAG || 6;
const MAX_AGE_DAYS = +env.MAX_AGE_DAYS || 10;  // older posts are not "viral now"
const KEEP_PER_PLATFORM = 30;
// a video only counts when its title/caption/tags are really about GTA 6
const isGTA6 = (...texts) => /\bgta\s*-?\s*(6|vi)\b|grand\s*theft\s*auto\s*(6|vi)\b|#gta6|#gtavi|\bleonida\b/i.test(texts.filter(Boolean).join(' '));

const log = (...a) => console.log('[viralgta6]', ...a);
const num = v => (v == null || v === '' || isNaN(+v) || +v < 0) ? null : +v;
const fresh = iso => !iso || (Date.now() - new Date(iso)) < MAX_AGE_DAYS * 864e5;
const perHour = it => it.views ? it.views / Math.max(1, (Date.now() - new Date(it.published || Date.now() - 7 * 864e5)) / 36e5) : 0;

async function getJSON(url, opts) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = null; }
  if (!r.ok) throw new Error(`${r.status} ${(j && (j.error?.message || j.error?.type)) || text.slice(0, 200)}`);
  return j;
}

/* ---------------- YouTube (free API key) ---------------- */
async function youtube() {
  if (!YT_KEY) throw new Error('no YT_KEY secret');
  const yt = (path, params) => getJSON(`https://www.googleapis.com/youtube/v3/${path}?` + new URLSearchParams({ ...params, key: YT_KEY }));
  // search the most viewed GTA 6 videos of the last days, then fetch their full stats
  const after = new Date(Date.now() - MAX_AGE_DAYS * 864e5).toISOString();
  const found = new Set();
  for (const q of YT_QUERIES) {
    const j = await yt('search', { part: 'snippet', type: 'video', q, order: 'viewCount', publishedAfter: after, maxResults: YT_PER_QUERY, relevanceLanguage: 'en', safeSearch: 'moderate' });
    for (const s of j.items || []) if (s.id?.videoId) found.add(s.id.videoId);
  }
  const vids = new Map();
  const ids0 = [...found];
  for (let i = 0; i < ids0.length; i += 50) {
    const j = await yt('videos', { part: 'snippet,statistics,contentDetails,status', id: ids0.slice(i, i + 50).join(','), maxResults: 50 });
    for (const v of j.items || []) if (isGTA6(v.snippet.title, v.snippet.description?.slice(0, 500), (v.snippet.tags || []).join(' '))) vids.set(v.id, v);
  }
  const ids = [...new Set([...vids.values()].map(v => v.snippet.channelId))];
  const chans = {};
  for (let i = 0; i < ids.length; i += 50) {
    const j = await yt('channels', { part: 'snippet,statistics', id: ids.slice(i, i + 50).join(','), maxResults: 50 });
    for (const c of j.items || []) chans[c.id] = c;
  }
  return [...vids.values()].map(v => {
    const sn = v.snippet, st = v.statistics || {}, c = chans[sn.channelId] || {}, cs = c.snippet || {}, cst = c.statistics || {};
    const th = sn.thumbnails || {};
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(v.contentDetails?.duration || '') || [];
    const h = +m[1] || 0, mi = +m[2] || 0, s = +m[3] || 0;
    const secs = h * 3600 + mi * 60 + s;
    return {
      uid: 'yt-' + v.id, platform: 'youtube', vid: v.id, url: `https://www.youtube.com/watch?v=${v.id}`, source: 'live',
      title: sn.title, thumb: (th.maxres || th.standard || th.high || th.medium || {}).url || '',
      views: num(st.viewCount), likes: num(st.likeCount), comments: num(st.commentCount),
      published: sn.publishedAt, embeddable: v.status ? v.status.embeddable !== false : true,
      duration: secs ? (h ? h + ':' + String(mi).padStart(2, '0') : mi) + ':' + String(s).padStart(2, '0') : '',
      vertical: secs > 0 && secs <= 180 && /#shorts/i.test(sn.title + ' ' + sn.description),
      creator: {
        name: cs.title || sn.channelTitle, handle: cs.customUrl || '', url: `https://www.youtube.com/channel/${sn.channelId}`,
        avatar: (cs.thumbnails?.medium || cs.thumbnails?.default || {}).url || '',
        followers: cst.hiddenSubscriberCount ? null : num(cst.subscriberCount), followersHidden: !!cst.hiddenSubscriberCount,
        videos: num(cst.videoCount), totalViews: num(cst.viewCount),
        country: cs.country || '', since: cs.publishedAt || null, bio: (cs.description || '').slice(0, 600)
      }
    };
  });
}

/* ---------------- Apify (free $5 credit per month) ---------------- */
async function apify(actor, input) {
  if (!APIFY_TOKEN) throw new Error('no APIFY_TOKEN secret');
  // run-sync waits for the run (max 300 s) and returns the dataset items
  return getJSON(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=280&token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
  });
}

async function tiktok() {
  const rows = await apify('clockworks~tiktok-hashtag-scraper', {
    hashtags: TT_HASHTAGS, resultsPerPage: TT_PER_HASHTAG,
    shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadSubtitles: false, shouldDownloadSlideshowImages: false
  });
  return (Array.isArray(rows) ? rows : []).filter(r => r && r.id && !r.error && isGTA6(r.text, (r.hashtags || []).map(h => '#' + (h.name || h)).join(' '))).map(r => {
    const a = r.authorMeta || {};
    return {
      uid: 'tt-' + r.id, platform: 'tiktok', vid: String(r.id), url: r.webVideoUrl || `https://www.tiktok.com/@${a.name}/video/${r.id}`, source: 'live',
      title: (r.text || '').slice(0, 220), thumb: r.videoMeta?.coverUrl || r.videoMeta?.originalCoverUrl || '',
      views: num(r.playCount), likes: num(r.diggCount), comments: num(r.commentCount), shares: num(r.shareCount),
      published: r.createTimeISO || (r.createTime ? new Date(r.createTime * 1000).toISOString() : null),
      duration: r.videoMeta?.duration ? `0:${String(r.videoMeta.duration).padStart(2, '0')}` : '', vertical: true,
      creator: {
        name: a.nickName || a.name || '', handle: a.name ? '@' + a.name : '', url: a.profileUrl || (a.name ? `https://www.tiktok.com/@${a.name}` : ''),
        avatar: a.avatar || '', followers: num(a.fans), videos: num(a.video), totalViews: null, totalLikes: num(a.heart),
        verified: !!a.verified, country: '', since: null, bio: a.signature || ''
      }
    };
  });
}

async function instagram() {
  const rows = await apify('apify~instagram-hashtag-scraper', {
    hashtags: IG_HASHTAGS, resultsLimit: IG_PER_HASHTAG, resultsType: 'reels'
  });
  return (Array.isArray(rows) ? rows : []).filter(r => r && r.shortCode && !r.error && isGTA6(r.caption, (r.hashtags || []).map(h => '#' + h).join(' ')) && (r.type === 'Video' || r.videoUrl || r.videoPlayCount != null)).map(r => ({
    uid: 'ig-' + r.shortCode, platform: 'instagram', vid: r.shortCode, kind: 'reel', url: r.url || `https://www.instagram.com/reel/${r.shortCode}/`, source: 'live',
    title: (r.caption || '').slice(0, 220), thumb: r.displayUrl || '',
    views: num(r.videoPlayCount ?? r.igPlayCount ?? r.videoViewCount), likes: num(r.likesCount), comments: num(r.commentsCount),
    published: r.timestamp || null, vertical: true,
    creator: {
      name: r.ownerFullName || r.ownerUsername || '', handle: r.ownerUsername ? '@' + r.ownerUsername : '',
      url: r.ownerUsername ? `https://www.instagram.com/${r.ownerUsername}/` : '', avatar: '',
      followers: null, videos: null, totalViews: null, country: '', since: null, bio: ''
    }
  }));
}

/* ---------------- main ---------------- */
let old = { items: [] };
try { old = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
const keepOld = p => (old.items || []).filter(i => i.platform === p && fresh(i.published));

// YouTube is free, so it refreshes every hour. TikTok + Instagram cost Apify credit,
// so they only refresh on the morning run (FULL=1) and are kept the rest of the day.
const FULL = env.FULL === '1';
const sources = { youtube, tiktok, instagram };
const result = { updated: new Date().toISOString(), sources: {}, items: [] };
for (const [name, fn] of Object.entries(sources)) {
  if (!FULL && name !== 'youtube') {
    const prev = keepOld(name);
    result.items.push(...prev);
    result.sources[name] = { ...(old.sources?.[name] || {}), kept: prev.length, refreshed: old.sources?.[name]?.refreshed || old.updated };
    log(name, 'kept', prev.length, 'from the morning run');
    continue;
  }
  try {
    const items = (await fn()).filter(i => fresh(i.published) && i.views);
    items.sort((a, b) => perHour(b) - perHour(a));
    const unique = [...new Map(items.map(i => [i.uid, i])).values()].slice(0, KEEP_PER_PLATFORM);
    if (!unique.length) throw new Error('0 usable videos');
    result.items.push(...unique);
    result.sources[name] = { ok: true, count: unique.length, refreshed: result.updated };
    log(name, 'ok', unique.length);
  } catch (e) {
    const prev = keepOld(name);
    result.items.push(...prev);
    result.sources[name] = { ok: false, kept: prev.length, error: String(e.message || e).slice(0, 200) };
    log(name, 'FAILED, kept', prev.length, 'from yesterday:', e.message || e);
  }
}
await writeFile(OUT, JSON.stringify(result, null, 1) + '\n');
log('written', result.items.length, 'videos');
