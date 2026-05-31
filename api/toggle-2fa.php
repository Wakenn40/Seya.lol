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
if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, username, email, email_verified FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

$enable = isset($input['enable']) ? (bool)$input['enable'] : false;

if ($enable && (!$user['email'] || !$user['email_verified'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Verify your email first']);
    exit;
}

$pdo->prepare('UPDATE users SET email_2fa = ? WHERE id = ?')->execute([$enable ? 1 : 0, $user['id']]);

echo json_encode(['success' => true, 'enabled' => $enable]);
