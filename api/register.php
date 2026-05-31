<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db_config = [
    'host' => 'localhost',
    'port' => 3306,
    'user' => 'u3516713_default',
    'password' => 'opy5C41C45P7c3W2',
    'database' => 'u3516713_default',
    'charset' => 'utf8mb4'
];

try {
    $pdo = new PDO(
        "mysql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['database']};charset={$db_config['charset']}",
        $db_config['user'],
        $db_config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed', 'details' => $e->getMessage()]);
    exit;
}

$input = file_get_contents('php://input');
if (empty($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Empty request body']);
    exit;
}

$data = json_decode($input, true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if (!$username || strlen($username) < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Username must be at least 1 character']);
    exit;
}

if (!$password || strlen($password) < 4) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 4 characters']);
    exit;
}

$cleanUsername = strtolower(preg_replace('/[^a-z0-9_.]/', '', $username));

$stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
$stmt->execute([$cleanUsername]);
if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode(['error' => 'Username already taken']);
    exit;
}

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);
$token = bin2hex(random_bytes(32));

try {
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare('INSERT INTO users (username, password, token) VALUES (?, ?, ?)');
    $stmt->execute([$cleanUsername, $hashedPassword, $token]);
    $userId = $pdo->lastInsertId();
    
    $stmt = $pdo->prepare('INSERT INTO pages (user_id) VALUES (?)');
    $stmt->execute([$userId]);
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'token' => $token,
        'username' => $cleanUsername,
        'message' => 'Account created!'
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create user']);
}