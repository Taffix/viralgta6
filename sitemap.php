<?php
// /sitemap.xml: the home page + a page for every video in today's list (same cache as index.php)
$cache = __DIR__ . '/../vg-videos-cache.json';
$items = is_file($cache) ? (json_decode(file_get_contents($cache), true)['items'] ?? []) : [];
$cacheS = __DIR__ . '/../vg-secrets-cache.json';
$items = array_merge($items, is_file($cacheS) ? (json_decode(file_get_contents($cacheS), true)['items'] ?? []) : []);
$cacheT = __DIR__ . '/../vg-tips-cache.json';
$items = array_merge($items, is_file($cacheT) ? (json_decode(file_get_contents($cacheT), true)['items'] ?? []) : []);
header('Content-Type: application/xml; charset=utf-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
echo '  <url><loc>https://viralgta6.com/</loc><lastmod>' . date('c', is_file($cache) ? filemtime($cache) : time()) . '</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>' . "\n";
echo '  <url><loc>https://viralgta6.com/secrets</loc><lastmod>' . date('c', is_file($cacheS) ? filemtime($cacheS) : time()) . '</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>' . "\n";
echo '  <url><loc>https://viralgta6.com/tips/guide</loc><lastmod>' . date('c', is_file(__DIR__ . '/guide.html') ? filemtime(__DIR__ . '/guide.html') : time()) . '</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>' . "\n";
echo '  <url><loc>https://viralgta6.com/tips</loc><lastmod>' . date('c', is_file($cacheT) ? filemtime($cacheT) : time()) . '</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>' . "\n";
$map = is_file(__DIR__ . '/data/map.json') ? json_decode(file_get_contents(__DIR__ . '/data/map.json'), true) : [];
if (!empty($map['image'])) {
  echo '  <url><loc>https://viralgta6.com/map</loc><lastmod>' . date('c', filemtime(__DIR__ . '/data/map.json')) . '</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>' . "\n";
  foreach ($map['pins'] ?? [] as $p) if (!empty($p['slug'])) echo '  <url><loc>https://viralgta6.com/map/' . htmlspecialchars(rawurlencode($p['slug']), ENT_XML1) . '</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>' . "\n";
}
foreach ($items as $i) {
  if (empty($i['uid'])) continue;
  $d = !empty($i['published']) ? date('c', strtotime($i['published'])) : date('c');
  echo '  <url><loc>https://viralgta6.com/v/' . htmlspecialchars(rawurlencode($i['uid']), ENT_XML1) . '</loc><lastmod>' . $d . '</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>' . "\n";
}
echo '</urlset>' . "\n";
