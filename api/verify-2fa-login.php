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
require_once __DIR__ . '/../lib/totp.php';

ini_set('display_errors', '0');
ob_start();

$input = json_decode(file_get_contents('php://input'), true);
$username = isset($input['username']) ? trim($input['username']) : '';
$code = isset($input['code']) ? trim($input['code']) : '';

if (!$username || !$code) {
    http_response_code(400);
    ob_clean();
    echo json_encode(['error' => 'Username and code required']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, username, totp_secret FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    ob_clean();
    echo json_encode(['error' => 'User not found']);
    exit;
}

if (!$user['totp_secret']) {
    http_response_code(400);
    ob_clean();
    echo json_encode(['error' => '2FA not enabled']);
    exit;
}

if (!TOTP::verifyCode($user['totp_secret'], $code)) {
    http_response_code(400);
    ob_clean();
    echo json_encode(['error' => 'Invalid code']);
    exit;
}

$newToken = bin2hex(random_bytes(32));
$stmt = $pdo->prepare('UPDATE users SET token = ? WHERE id = ?');
$stmt->execute([$newToken, $user['id']]);

$stmt = $pdo->prepare('SELECT * FROM pages WHERE user_id = ?');
$stmt->execute([$user['id']]);
$page = $stmt->fetch(PDO::FETCH_ASSOC);

$pageData = $page ? [
    'published' => (bool)$page['published'],
    'displayName' => $page['display_name'] ?? '',
    'displayNameHtml' => $page['display_name_html'] ?? '',
    'bio' => $page['bio'] ?? '',
    'bioHtml' => $page['bio_html'] ?? '',
    'avatar' => $page['avatar'] ?? '',
    'bg' => $page['bg'] ?? 'bg-black',
    'linksEnabled' => (bool)($page['links_enabled'] ?? false),
    'links' => $page['links'] ? json_decode($page['links'], true) : [],
    'customObjects' => $page['custom_objects'] ? json_decode($page['custom_objects'], true) : [],
    'effects' => $page['effects'] ? json_decode($page['effects'], true) : [],
    'layout' => $page['layout'] ? json_decode($page['layout'], true) : [],
    'discord' => [
        'id' => $page['discord_id'] ?? '',
        'username' => $page['discord_username'] ?? '',
        'avatar' => $page['discord_avatar'] ?? '',
    ]
] : null;

ob_clean();
echo json_encode([
    'success' => true,
    'token' => $newToken,
    'username' => $username,
    'pageData' => $pageData
]);
