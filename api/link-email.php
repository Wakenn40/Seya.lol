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

$stmt = $pdo->prepare('SELECT id, username FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

$email = isset($input['email']) ? trim($input['email']) : '';

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit;
}

// Check if email already used by another user
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
$stmt->execute([$email, $user['id']]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'This email is already linked to another account']);
    exit;
}

// Store email (not verified yet)
$pdo->prepare('UPDATE users SET email = ? WHERE id = ?')->execute([$email, $user['id']]);

echo json_encode(['success' => true]);
