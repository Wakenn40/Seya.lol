<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config.php';

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$linkUrl = $input['linkUrl'] ?? '';
$linkTitle = $input['linkTitle'] ?? '';

if (!$username || !$linkUrl) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing username or linkUrl']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $logStmt = $pdo->prepare('INSERT INTO link_clicks_log (user_id, link_url, link_title, clicked_at, ip_address) VALUES (?, ?, ?, NOW(), ?)');
    $logStmt->execute([$user['id'], $linkUrl, $linkTitle, $ip]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    error_log('track-click.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to track click']);
}
