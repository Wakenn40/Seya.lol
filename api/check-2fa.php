<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config.php';

$input = json_decode(file_get_contents('php://input'), true);
$username = isset($input['username']) ? trim($input['username']) : '';

if (!$username) {
    http_response_code(400);
    echo json_encode(['error' => 'Username required']);
    exit;
}

$stmt = $pdo->prepare('SELECT totp_secret FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

echo json_encode([
    'requires2fa' => $user['totp_secret'] !== null
]);
