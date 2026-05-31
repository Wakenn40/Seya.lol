<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$auth = '';
$tokenFromQuery = $_GET['token'] ?? '';

if (!empty($tokenFromQuery)) {
    $token = $tokenFromQuery;
} else {
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
    if (empty($auth) || !preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    $token = $matches[1];
}

require_once '../config.php';

if (!isset($pdo)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database not available']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id, username FROM users WHERE token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $name = trim($data['name'] ?? '');
    $tags = $data['tags'] ?? [];
    $description = trim($data['description'] ?? '');
    $pageData = $data['pageData'] ?? null;

    if (!$name) {
        http_response_code(400);
        echo json_encode(['error' => 'Template name is required']);
        exit;
    }

    if (!$pageData) {
        http_response_code(400);
        echo json_encode(['error' => 'Page data is required']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO templates (user_id, name, tags, description, page_data) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        $user['id'],
        $name,
        json_encode($tags),
        $description,
        json_encode($pageData)
    ]);

    echo json_encode([
        'success' => true,
        'template_id' => $pdo->lastInsertId()
    ]);
} catch (Exception $e) {
    error_log('save-template error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
