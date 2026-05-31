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
    echo json_encode(['allowed' => false, 'error' => 'Not logged in']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(['allowed' => false, 'error' => 'Invalid token']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$dataSize = (int)($data['dataSize'] ?? 0);

// Get current storage
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

foreach ($fields as $dataUrl) {
    if ($dataUrl && strpos($dataUrl, 'data:') === 0) {
        $base64 = substr($dataUrl, strpos($dataUrl, ',') + 1);
        $totalSize += (int)(strlen($base64) * 3 / 4);
    }
}

$maxSize = 500 * 1024 * 1024;
$allowed = ($totalSize + $dataSize) <= $maxSize;

echo json_encode([
    'allowed' => $allowed,
    'maxSize' => $maxSize,
    'maxSizeMB' => round($maxSize / 1024 / 1024)
]);