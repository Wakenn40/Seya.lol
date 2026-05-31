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

ini_set('display_errors', '0');
ob_start();

$tokenFromQuery = $_GET['token'] ?? '';
if (!empty($tokenFromQuery)) {
    $token = $tokenFromQuery;
} else {
    $auth = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['Authorization'])) {
        $auth = $_SERVER['Authorization'];
    } else {
        $headers = getallheaders();
        if ($headers !== false && is_array($headers)) {
            foreach ($headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    $auth = $value;
                    break;
                }
            }
        }
    }
    if (empty($auth)) {
        foreach ($_SERVER as $key => $value) {
            if (stripos($key, 'authorization') !== false) {
                $auth = $value;
                break;
            }
        }
    }
    $token = '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        $token = $matches[1];
    }
}
if (!$token) {
    http_response_code(401);
    ob_clean();
echo json_encode(['error' => 'Not authenticated']);
    exit;
}

if (!isset($pdo) || !$pdo) {
    http_response_code(500);
    ob_clean();
echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, password FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    ob_clean();
echo json_encode(['error' => 'Invalid session']);
    exit;
}

$input = file_get_contents('php://input');
if (empty($input)) {
    http_response_code(400);
    ob_clean();
echo json_encode(['error' => 'Empty request body']);
    exit;
}

$data = json_decode($input, true);
if (!$data) {
    http_response_code(400);
    ob_clean();
echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$action = $data['action'] ?? '';

if ($action === 'verify') {
    $currentPassword = $data['currentPassword'] ?? '';

    if (!$currentPassword) {
        http_response_code(400);
        ob_clean();
echo json_encode(['error' => 'Current password is required']);
        exit;
    }

    if (!password_verify($currentPassword, $user['password'])) {
        http_response_code(400);
        ob_clean();
echo json_encode(['error' => 'Current password is incorrect']);
        exit;
    }

    ob_clean();
echo json_encode(['success' => true, 'message' => 'Password verified']);
} elseif ($action === 'update') {
    $newPassword = $data['newPassword'] ?? '';

    if (!$newPassword || strlen($newPassword) < 4) {
        http_response_code(400);
        ob_clean();
echo json_encode(['error' => 'New password must be at least 4 characters']);
        exit;
    }

    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $newToken = bin2hex(random_bytes(32));

    $stmt = $pdo->prepare('UPDATE users SET password = ?, token = ? WHERE id = ?');
    $stmt->execute([$hashedPassword, $newToken, $user['id']]);

    ob_clean();
echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
} else {
    http_response_code(400);
    ob_clean();
echo json_encode(['error' => 'Invalid action']);
}
