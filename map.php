<?php
// /map and /map/<pin>: serves map.html with title, description, preview image and
// structured data filled in per pin. Hidden from Google until the map image is online.
const SITE = 'https://viralgta6.com';
$local = __DIR__ . '/data/map.json';
$cache = __DIR__ . '/../vg-map-cache.json';

function load_map($local, $cache) {
  if (is_file($local)) return json_decode(file_get_contents($local), true) ?: [];
  if (is_file($cache) && time() - filemtime($cache) < 600) return json_decode(file_get_contents($cache), true) ?: [];
  $ch = curl_init('https://raw.githubusercontent.com/Taffix/viralgta6/main/data/map.json');
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6]);
  $body = curl_exec($ch); $ok = curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200; curl_close($ch);
  if ($ok && json_decode($body, true)) { @file_put_contents($cache, $body); return json_decode($body, true); }
  return is_file($cache) ? (json_decode(file_get_contents($cache), true) ?: []) : [];
}
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function yt_id($u) {
  if (preg_match('#(?:youtu\.be/|[?&]v=|/(?:shorts|embed|live)/)([\w-]{11})#', (string)$u, $m)) return $m[1];
  return '';
}

$M = load_map($local, $cache);
$pins = array_values(array_filter($M['pins'] ?? [], fn($p) => !empty($p['slug'])));
$cats = $M['categories'] ?? [];
$ready = !empty($M['image']);
$slug = $_GET['pin'] ?? '';
$pin = null;
if ($slug !== '') {
  foreach ($pins as $p) if ($p['slug'] === $slug) { $pin = $p; break; }
  if (!$pin) { header('Location: ' . SITE . '/map', true, 302); exit; }
}

$html = file_get_contents(__DIR__ . '/map.html');
if ($pin) {
  $cat = $cats[$pin['cat'] ?? '']['name'] ?? 'Secret';
  $title = $pin['title'] . (!empty($pin['place']) ? ' in ' . $pin['place'] : '') . ' · GTA 6 ' . $cat . ' location | ViralGTA6';
  $desc = trim(($pin['text'] ?? '') . ' Where to find it on the GTA 6 map' . (!empty($pin['creator']['name']) ? ', found by ' . $pin['creator']['name'] : '') . '.');
  $url = SITE . '/map/' . rawurlencode($pin['slug']);
  $id = yt_id($pin['youtube'] ?? '');
  $img = $id ? 'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg' : SITE . '/share.png';
  $ld = ['@context' => 'https://schema.org', '@type' => 'Article', 'headline' => $pin['title'], 'description' => $desc, 'url' => $url, 'image' => $img,
    'about' => ['@type' => 'VideoGame', 'name' => 'Grand Theft Auto VI']];
  if ($id) $ld['video'] = ['@type' => 'VideoObject', 'name' => $pin['title'], 'description' => $desc, 'thumbnailUrl' => $img, 'embedUrl' => 'https://www.youtube.com/embed/' . $id, 'contentUrl' => $pin['youtube'], 'uploadDate' => $pin['date'] ?? date('c')];
} else {
  $title = 'GTA 6 Secrets Map · Hidden Locations & Easter Eggs | ViralGTA6';
  $desc = 'Interactive GTA 6 map with secret locations, easter eggs, weapons, cars and collectibles in Leonida. Every pin links to the creator who found it.';
  $url = SITE . '/map'; $img = SITE . '/share.png';
  $ld = ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'GTA 6 secrets map', 'url' => $url, 'description' => $desc,
    'hasPart' => array_map(fn($p) => ['@type' => 'Article', 'headline' => $p['title'], 'url' => SITE . '/map/' . rawurlencode($p['slug'])], array_slice($pins, 0, 50))];
}

$rep = function ($pattern, $value) use (&$html) { $html = preg_replace($pattern, $value, $html, 1); };
$rep('#<title>.*?</title>#s', '<title>' . h($title) . '</title>');
$rep('#<meta name="description" content="[^"]*">#', '<meta name="description" content="' . h($desc) . '">');
$rep('#<link rel="canonical" href="[^"]*">#', '<link rel="canonical" href="' . h($url) . '">');
foreach (['og:title' => $title, 'og:description' => $desc, 'og:url' => $url, 'og:image' => $img] as $k => $v)
  $rep('#<meta property="' . $k . '" content="[^"]*">#', '<meta property="' . $k . '" content="' . h($v) . '">');
$extra = '<script type="application/ld+json">' . json_encode($ld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "</script>\n";
if (!$ready) $extra .= "<meta name=\"robots\" content=\"noindex\">\n";   // nothing to show yet
$html = str_replace('</head>', $extra . '</head>', $html);

// pins as plain links for search engines (the page script replaces this)
$li = '';
foreach ($pins as $p) $li .= '<li><a href="' . h(SITE . '/map/' . rawurlencode($p['slug'])) . '">' . h($p['title']) . '</a></li>';
$html = str_replace('<!--SEO-LIST-->', $li ? '<ul class="list">' . $li . '</ul>' : '', $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
echo $html;
