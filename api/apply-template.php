<?php
error_reporting(0);
ini_set('display_errors', 0);
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

$stmt = $pdo->prepare('SELECT page_data FROM templates WHERE id = ?');
$stmt->execute([$templateId]);
$template = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$template) {
    http_response_code(404);
    echo json_encode(['error' => 'Template not found']);
    exit;
}

$rawPageData = $template['page_data'];
$pageData = (is_string($rawPageData) ? json_decode($rawPageData, true) : $rawPageData) ?? [];

// Save only the bg field and accent color from the template
// to avoid schema mismatch with the massive UPDATE query
$bgValue = $pageData['bg'] ?? 'bg-black';
$accentValue = $pageData['accentColor'] ?? '#d6d6d6';
$fontValue = $pageData['font'] ?? 'Syne';
$nameSizeValue = $pageData['nameSize'] ?? 22;
$btnStyleValue = $pageData['btnStyle'] ?? '';
$phoneBorderRadiusValue = $pageData['phoneBorderRadius'] ?? 42;

try {
    $simpleStmt = $pdo->prepare('UPDATE pages SET bg = ?, accent_color = ?, font = ?, name_size = ?, btn_style = ?, phone_border_radius = ? WHERE user_id = ?');
    $simpleStmt->execute([$bgValue, $accentValue, $fontValue, $nameSizeValue, $btnStyleValue, $phoneBorderRadiusValue, $user['id']]);

    // Increment usage count
    $pdo->prepare('UPDATE templates SET usage_count = usage_count + 1 WHERE id = ?')->execute([$templateId]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
