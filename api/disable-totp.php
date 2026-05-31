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

$stmt = $pdo->prepare('SELECT id, totp_secret FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

$code = isset($input['code']) ? trim($input['code']) : '';

if ($user['totp_secret']) {
    if (!$code) {
        http_response_code(400);
        echo json_encode(['error' => 'Enter a code from your authenticator app to disable 2FA', 'requireCode' => true]);
        exit;
    }
    require_once __DIR__ . '/../lib/totp.php';
    if (!TOTP::verifyCode($user['totp_secret'], $code)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid code. 2FA not disabled.', 'requireCode' => true]);
        exit;
    }
}

$stmt = $pdo->prepare('UPDATE users SET totp_secret = NULL WHERE id = ?');
$stmt->execute([$user['id']]);

echo json_encode(['success' => true, 'message' => '2FA disabled']);
