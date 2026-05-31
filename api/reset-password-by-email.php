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
$email = isset($input['email']) ? trim($input['email']) : '';
$code = isset($input['code']) ? trim($input['code']) : '';
$newPassword = isset($input['password']) ? $input['password'] : '';

if (!$email || !$code || !$newPassword) {
    http_response_code(400);
    echo json_encode(['error' => 'Email, code, and new password required']);
    exit;
}

if (strlen($newPassword) < 4) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 4 characters']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, username, email_code, email_code_expires FROM users WHERE email = ? AND email_verified = 1');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'No verified account with this email']);
    exit;
}

if ($user['email_code'] !== $code) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid code']);
    exit;
}

if (time() > (int)$user['email_code_expires']) {
    http_response_code(400);
    echo json_encode(['error' => 'Code expired']);
    exit;
}

$hash = password_hash($newPassword, PASSWORD_DEFAULT);
$newToken = generateToken();

$pdo->prepare('UPDATE users SET password = ?, token = ?, email_code = NULL, email_code_expires = NULL WHERE id = ?')
    ->execute([$hash, $newToken, $user['id']]);

echo json_encode(['success' => true, 'token' => $newToken, 'username' => $user['username']]);
