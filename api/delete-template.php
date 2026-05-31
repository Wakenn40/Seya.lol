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

$stmt = $pdo->prepare('SELECT id FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$templateId = (int)($data['template_id'] ?? 0);

if (!$templateId) {
    http_response_code(400);
    echo json_encode(['error' => 'Template ID is required']);
    exit;
}

// Verify ownership
$stmt = $pdo->prepare('SELECT id FROM templates WHERE id = ? AND user_id = ?');
$stmt->execute([$templateId, $user['id']]);
$template = $stmt->fetch();

if (!$template) {
    http_response_code(404);
    echo json_encode(['error' => 'Template not found or access denied']);
    exit;
}

$pdo->prepare('DELETE FROM templates WHERE id = ?')->execute([$templateId]);

echo json_encode(['success' => true]);