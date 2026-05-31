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
require_once __DIR__ . '/../lib/totp.php';

$input = json_decode(file_get_contents('php://input'), true);
$token = $_GET['token'] ?? $input['token'] ?? '';
if (empty($token)) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($auth)) {
        $headers = getallheaders();
        if (is_array($headers)) {
            $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
    }
    if (empty($auth)) {
        foreach ($_SERVER as $key => $value) {
            if (stripos($key, 'Authorization') !== false) {
                $auth = $value;
                break;
            }
        }
    }
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        $token = $matches[1];
    }
}

$stmt = $pdo->prepare('SELECT id, username FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

$secret = isset($input['secret']) ? trim($input['secret']) : '';
$code = isset($input['code']) ? trim($input['code']) : '';

if (!$secret || !$code) {
    http_response_code(400);
    echo json_encode(['error' => 'Secret and code required']);
    exit;
}

if (!TOTP::verifyCode($secret, $code)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid code. Make sure your authenticator app shows the correct code.']);
    exit;
}

$stmt = $pdo->prepare('UPDATE users SET totp_secret = ? WHERE id = ?');
$stmt->execute([$secret, $user['id']]);

echo json_encode(['success' => true, 'message' => '2FA enabled successfully']);
