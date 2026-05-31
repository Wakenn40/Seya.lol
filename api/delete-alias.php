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
    echo json_encode(['error' => 'Invalid alias']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM user_aliases WHERE alias = ? AND user_id = ?');
$stmt->execute([$alias, $user['id']]);
$aliasRow = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$aliasRow) {
    http_response_code(404);
    echo json_encode(['error' => 'Alias not found']);
    exit;
}

$stmt = $pdo->prepare('DELETE FROM user_aliases WHERE id = ?');
$stmt->execute([$aliasRow['id']]);

echo json_encode(['success' => true]);
