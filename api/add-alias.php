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

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_aliases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        alias VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} catch (PDOException $e) {}

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
$alias = isset($input['alias']) ? trim($input['alias']) : '';

if (!$alias || !preg_match('/^[a-z0-9_.]+$/', $alias)) {
    http_response_code(400);
    echo json_encode(['error' => 'Only lowercase letters, numbers, underscores, and dots allowed']);
    exit;
}

if (strlen($alias) < 1 || strlen($alias) > 50) {
    http_response_code(400);
    echo json_encode(['error' => 'Alias must be between 1 and 50 characters']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM user_aliases WHERE user_id = ?');
$stmt->execute([$user['id']]);
$existingAliases = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (count($existingAliases) >= 1) {
    http_response_code(400);
    echo json_encode(['error' => 'You can only add one additional ID at this time']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
$stmt->execute([$alias]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'This ID is already taken as a primary username']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM user_aliases WHERE alias = ?');
$stmt->execute([$alias]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['error' => 'This ID is already taken by another user']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO user_aliases (user_id, alias) VALUES (?, ?)');
$stmt->execute([$user['id'], $alias]);

echo json_encode([
    'success' => true,
    'alias' => $alias
]);
