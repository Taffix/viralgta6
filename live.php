<?php
// Counts how many people had viralgta6.com open in the last 60 seconds.
// Each open page pings every 25 seconds with a random id. No cookies, no IP stored.
header('Content-Type: application/json');
header('Cache-Control: no-store');

$id = preg_replace('/[^a-z0-9]/', '', strtolower($_GET['id'] ?? ''));
$id = substr($id, 0, 16);
$file = __DIR__ . '/../live-viewers.json';   // outside public_html, so nobody can read it
$now = time();

$fp = fopen($file, 'c+');
if (!$fp) { echo '{"n":0}'; exit; }
flock($fp, LOCK_EX);
$list = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];
foreach ($list as $k => $t) if ($now - $t > 60) unset($list[$k]);
if ($id !== '' && (isset($list[$id]) || count($list) < 5000)) $list[$id] = $now;
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($list));
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['n' => count($list)]);
