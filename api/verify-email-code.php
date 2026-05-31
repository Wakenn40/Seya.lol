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

// Accept token OR email (for password reset flow)
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

$isPasswordReset = isset($input['forReset']) && $input['forReset'] === true;

if ($isPasswordReset) {
    $email = isset($input['email']) ? trim($input['email']) : '';
    if (!$email) {
        http_response_code(400);
        echo json_encode(['error' => 'Email required']);
        exit;
    }
    $stmt = $pdo->prepare('SELECT id, username FROM users WHERE email = ? AND email_verified = 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'No verified account with this email']);
        exit;
    }
} else {
    $stmt = $pdo->prepare('SELECT id, username FROM users WHERE token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }
}

$code = isset($input['code']) ? trim($input['code']) : '';

if (!$code || !preg_match('/^\d{6}$/', $code)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid code format']);
    exit;
}

$stmt = $pdo->prepare('SELECT email_code, email_code_expires FROM users WHERE id = ?');
$stmt->execute([$user['id']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row || $row['email_code'] !== $code) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid code']);
    exit;
}

if (time() > (int)$row['email_code_expires']) {
    http_response_code(400);
    echo json_encode(['error' => 'Code expired']);
    exit;
}

// Mark email as verified if not already
$pdo->prepare('UPDATE users SET email_verified = 1, email_code = NULL, email_code_expires = NULL WHERE id = ?')->execute([$user['id']]);

echo json_encode(['success' => true, 'username' => $user['username']]);
