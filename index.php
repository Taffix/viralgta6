<?php
// Serves index.html with search-engine extras filled in on the server:
// - today's videos as real HTML links + structured video data (JSON-LD)
// - /v/<id> pages: own title, description and preview image per video
// The list comes from GitHub (updated every hour) and is cached here for 10 minutes.
const SITE = 'https://viralgta6.com';
const SRC  = 'https://raw.githubusercontent.com/Taffix/viralgta6/main/data/videos.json';
$cache = __DIR__ . '/../vg-videos-cache.json';

function fetch_list($cache) {
  if (is_file($cache) && time() - filemtime($cache) < 600) return json_decode(file_get_contents($cache), true);
  $ch = curl_init(SRC);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_FOLLOWLOCATION => true]);
  $body = curl_exec($ch); $ok = curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200; curl_close($ch);
  if ($ok && ($j = json_decode($body, true)) && !empty($j['items'])) { @file_put_contents($cache, $body); return $j; }
  return is_file($cache) ? json_decode(file_get_contents($cache), true) : ['items' => []];
}
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function num($n) { $n = (float)$n; return $n >= 1e6 ? round($n / 1e6, 1) . 'M' : ($n >= 1e3 ? round($n / 1e3, 1) . 'K' : (string)(int)$n); }
function who($it) { $c = $it['creator'] ?? []; return $c['handle'] ?? '' ? (str_starts_with($c['handle'], '@') ? $c['handle'] : '@' . $c['handle']) : ($c['name'] ?? ''); }
function plat($it) { return ['youtube' => 'YouTube', 'tiktok' => 'TikTok', 'instagram' => 'Instagram'][$it['platform'] ?? ''] ?? ''; }
function vurl($it) { return SITE . '/v/' . rawurlencode($it['uid']); }
function embed($it) {
  $v = $it['vid'] ?? '';
  if (($it['platform'] ?? '') === 'youtube' && $v) return 'https://www.youtube.com/embed/' . $v;
  if (($it['platform'] ?? '') === 'tiktok' && $v) return 'https://www.tiktok.com/player/v1/' . $v;
  return null;
}
function video_ld($it, $pos = null) {
  $c = $it['creator'] ?? [];
  $o = ['@type' => 'VideoObject', 'name' => $it['title'] ?? 'GTA 6 video',
    'description' => trim(($it['title'] ?? '') . ' — a viral GTA 6 video on ' . plat($it) . ' by ' . who($it) . '.'),
    'thumbnailUrl' => $it['thumb'] ?? '', 'uploadDate' => $it['published'] ?? date('c'), 'url' => vurl($it), 'contentUrl' => $it['url'] ?? ''];
  if ($e = embed($it)) $o['embedUrl'] = $e;
  if (!empty($it['views'])) $o['interactionStatistic'] = ['@type' => 'InteractionCounter', 'interactionType' => ['@type' => 'WatchAction'], 'userInteractionCount' => (int)$it['views']];
  if (!empty($c['name'])) $o['author'] = ['@type' => 'Person', 'name' => $c['name'], 'url' => $c['url'] ?? ''];
  return $pos === null ? $o : ['@type' => 'ListItem', 'position' => $pos, 'item' => $o];
}

$html  = file_get_contents(__DIR__ . '/index.html');
$data  = fetch_list($cache);
$items = array_values(array_filter($data['items'] ?? [], fn($i) => !empty($i['uid'])));
usort($items, function ($a, $b) {
  $r = fn($i) => ($i['views'] ?? 0) / max(1, (time() - strtotime($i['published'] ?? 'now')) / 3600);
  return $r($b) <=> $r($a);
});

$vid = $_GET['v'] ?? '';
$one = null;
if ($vid !== '') {
  foreach ($items as $i) if ($i['uid'] === $vid) { $one = $i; break; }
  if (!$one) { header('Location: ' . SITE . '/', true, 302); exit; }   // video no longer in the list
}

if ($one) {
  $title = ($one['title'] ?? 'GTA 6 video') . ' · ' . who($one) . ' | ViralGTA6';
  $desc  = 'Watch "' . ($one['title'] ?? '') . '" by ' . who($one) . ' on ' . plat($one) . (empty($one['views']) ? '' : ' · ' . num($one['views']) . ' views') . '. One of today\'s most viral GTA 6 videos, with full credit to the creator.';
  $url = vurl($one); $img = $one['thumb'] ?? SITE . '/share.png';
  $ld = ['@context' => 'https://schema.org'] + video_ld($one);
} else {
  $title = 'GTA 6 Videos Going Viral Today · YouTube, TikTok & Instagram | ViralGTA6';
  $desc  = 'The most viral GTA 6 videos right now from YouTube, TikTok and Instagram, ranked by views per hour and updated every hour. Trailers, gameplay, leaks, memes and reactions, with full credit to every creator.';
  $url = SITE . '/'; $img = SITE . '/share.png';
  $list = []; foreach (array_slice($items, 0, 30) as $n => $i) $list[] = video_ld($i, $n + 1);
  $ld = ['@context' => 'https://schema.org', '@graph' => [
    ['@type' => 'WebSite', 'name' => 'ViralGTA6', 'url' => SITE . '/', 'description' => $desc],
    ['@type' => 'ItemList', 'name' => 'Most viral GTA 6 videos today', 'itemListOrder' => 'https://schema.org/ItemListOrderDescending', 'numberOfItems' => count($list), 'itemListElement' => $list]]];
}

// head: title, description, canonical, social preview, structured data, base for /v/ pages
$rep = function ($pattern, $value) use (&$html) { $html = preg_replace($pattern, $value, $html, 1); };
$rep('#<title>.*?</title>#s', '<title>' . h($title) . '</title>');
$rep('#<meta name="description" content="[^"]*">#', '<meta name="description" content="' . h($desc) . '">');
$rep('#<link rel="canonical" href="[^"]*">#', '<link rel="canonical" href="' . h($url) . '">');
foreach (['og:title' => $title, 'og:description' => $desc, 'og:url' => $url, 'og:image' => $img] as $k => $v)
  $rep('#<meta property="' . $k . '" content="[^"]*">#', '<meta property="' . $k . '" content="' . h($v) . '">');
foreach (['twitter:title' => $title, 'twitter:description' => $desc, 'twitter:image' => $img] as $k => $v)
  $rep('#<meta name="' . $k . '" content="[^"]*">#', '<meta name="' . $k . '" content="' . h($v) . '">');
if ($one) $html = str_replace('<meta property="og:type" content="website">', '<meta property="og:type" content="video.other">', $html);
$html = str_replace('<meta charset="utf-8">', '<meta charset="utf-8">' . "\n<base href=\"/\">", $html);
$html = str_replace('</head>', '<script type="application/ld+json">' . json_encode($ld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "</script>\n</head>", $html);

// body: today's list as plain links inside the grid (the page script replaces it with the full feed)
$li = '';
foreach (array_slice($items, 0, 30) as $n => $i)
  $li .= '<li><a href="' . h(vurl($i)) . '">' . h($i['title'] ?? 'GTA 6 video') . '</a> <span>by ' . h(who($i)) . ' on ' . plat($i) . (empty($i['views']) ? '' : ' · ' . num($i['views']) . ' views') . '</span></li>';
if ($li) $html = preg_replace('#(<div[^>]*id="grid"[^>]*>)#', '$1<ol class="seo-list">' . $li . '</ol>', $html, 1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300');
echo $html;
