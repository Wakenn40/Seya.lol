<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config.php';

$token = getBearerToken();
if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

// Calculate storage
$stmt = $pdo->prepare('SELECT * FROM pages WHERE user_id = ?');
$stmt->execute([$user['id']]);
$page = $stmt->fetch(PDO::FETCH_ASSOC);

$totalSize = 0;
$fields = [
    $page['avatar'] ?? '',
    $page['music_src'] ?? '',
    $page['bg_image_global'] ?? '',
    $page['bg_image_phone'] ?? '',
    $page['phone_frame_image'] ?? '',
    $page['cursor_image'] ?? ''
];

$customObjects = json_decode($page['custom_objects'] ?? '[]', true);
foreach ($customObjects as $obj) {
    $fields[] = $obj['src'] ?? '';
}

foreach ($fields as $dataUrl) {
    if ($dataUrl && strpos($dataUrl, 'data:') === 0) {
        $base64 = substr($dataUrl, strpos($dataUrl, ',') + 1);
        $totalSize += (int)(strlen($base64) * 3 / 4);
    }
}

$maxSize = 500 * 1024 * 1024;

echo json_encode([
    'used' => $totalSize,
    'max' => $maxSize,
    'usedMB' => round($totalSize / 1024 / 1024),
    'maxMB' => round($maxSize / 1024 / 1024),
    'remainingMB' => round(($maxSize - $totalSize) / 1024 / 1024)
]);