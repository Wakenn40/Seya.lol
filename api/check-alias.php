<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

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

$alias = isset($_GET['alias']) ? trim($_GET['alias']) : '';

if (!$alias || !preg_match('/^[a-z0-9_.]+$/', $alias)) {
    http_response_code(400);
    echo json_encode(['available' => false, 'error' => 'Invalid alias format']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
$stmt->execute([$alias]);
if ($stmt->fetch()) {
    echo json_encode(['available' => false, 'error' => 'Already a primary username']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM user_aliases WHERE alias = ?');
$stmt->execute([$alias]);
if ($stmt->fetch()) {
    echo json_encode(['available' => false, 'error' => 'Already taken']);
    exit;
}

echo json_encode(['available' => true]);
