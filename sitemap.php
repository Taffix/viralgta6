<?php
// /sitemap.xml: the home page + a page for every video in today's list (same cache as index.php)
$cache = __DIR__ . '/../vg-videos-cache.json';
$items = is_file($cache) ? (json_decode(file_get_contents($cache), true)['items'] ?? []) : [];
header('Content-Type: application/xml; charset=utf-8');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
echo '  <url><loc>https://viralgta6.com/</loc><lastmod>' . date('c', is_file($cache) ? filemtime($cache) : time()) . '</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>' . "\n";
foreach ($items as $i) {
  if (empty($i['uid'])) continue;
  $d = !empty($i['published']) ? date('c', strtotime($i['published'])) : date('c');
  echo '  <url><loc>https://viralgta6.com/v/' . htmlspecialchars(rawurlencode($i['uid']), ENT_XML1) . '</loc><lastmod>' . $d . '</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>' . "\n";
}
echo '</urlset>' . "\n";
