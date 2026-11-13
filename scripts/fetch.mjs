// Daily job for viralgta6.com: collects today's viral videos and writes data/videos.json.
// Runs on GitHub Actions (Node 20+, no packages needed).
// Secrets (GitHub → Settings → Secrets → Actions): YT_KEY, APIFY_TOKEN.
// If a source fails (no key, credit used up, error), yesterday's videos for that platform are kept.

import { readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../data/videos.json', import.meta.url);
const env = process.env;
const YT_KEY = env.YT_KEY || '';
const APIFY_TOKEN = env.APIFY_TOKEN || '';

// Keep these small to stay inside Apify's free $5 per month.
const YT_REGIONS = (env.YT_REGIONS || 'US,GB').split(',').map(s => s.trim()).filter(Boolean);
const YT_PER_REGION = +env.YT_PER_REGION || 25;
const TT_HASHTAGS = (env.TT_HASHTAGS || 'fyp,viral').split(',').map(s => s.trim()).filter(Boolean);
const TT_PER_HASHTAG = +env.TT_PER_HASHTAG || 10;
const IG_HASHTAGS = (env.IG_HASHTAGS || 'viral,reels').split(',').map(s => s.trim()).filter(Boolean);
const IG_PER_HASHTAG = +env.IG_PER_HASHTAG || 5;
const MAX_AGE_DAYS = +env.MAX_AGE_DAYS || 7;   // older posts are not "viral now"
const KEEP_PER_PLATFORM = 30;

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
  const vids = new Map();
  for (const region of YT_REGIONS) {
    const j = await yt('videos', { part: 'snippet,statistics,contentDetails,status', chart: 'mostPopular', regionCode: region, maxResults: YT_PER_REGION });
    for (const v of j.items || []) if (!vids.has(v.id)) vids.set(v.id, v);
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
  return (Array.isArray(rows) ? rows : []).filter(r => r && r.id && !r.error).map(r => {
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
  return (Array.isArray(rows) ? rows : []).filter(r => r && r.shortCode && !r.error && (r.type === 'Video' || r.videoUrl || r.videoPlayCount != null)).map(r => ({
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

const sources = { youtube, tiktok, instagram };
const result = { updated: new Date().toISOString(), sources: {}, items: [] };
for (const [name, fn] of Object.entries(sources)) {
  try {
    const items = (await fn()).filter(i => fresh(i.published) && i.views);
    items.sort((a, b) => perHour(b) - perHour(a));
    const unique = [...new Map(items.map(i => [i.uid, i])).values()].slice(0, KEEP_PER_PLATFORM);
    if (!unique.length) throw new Error('0 usable videos');
    result.items.push(...unique);
    result.sources[name] = { ok: true, count: unique.length };
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
