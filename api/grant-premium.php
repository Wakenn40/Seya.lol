<?php
/**
 * Админ-функция: выдать premium указанным пользователям.
 *
 * Использование:
 *   POST /api/grant-premium
 *   Body: {
 *     "secret": "change_this_to_random_secret",
 *     "users": ["username1", "username2"]
 *   }
 *
 *   Или через GET для быстрого теста:
 *   GET /api/grant-premium?secret=...&user=username
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config.php';

// Проверка секретного ключа
$secret = $_POST['secret'] ?? $_GET['secret'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);
$secret = $secret ?: ($input['secret'] ?? '');

if ($secret !== PREMIUM_ADMIN_SECRET) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid secret']);
    exit;
}

// Собираем список username
$usernames = [];
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $user = $_GET['user'] ?? '';
    if ($user) $usernames = [$user];
} else {
    $usernames = $input['users'] ?? [];
    if (!is_array($usernames)) $usernames = [$usernames];
}

if (empty($usernames)) {
    http_response_code(400);
    echo json_encode(['error' => 'No users specified. Use ?user=username or {"users":["u1","u2"]}']);
    exit;
}

$granted = [];
$notFound = [];

foreach ($usernames as $username) {
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $notFound[] = $username;
        continue;
    }

    $stmt = $pdo->prepare('INSERT INTO premium_users (user_id, invoice_id, activated) VALUES (?, NULL, 1)
        ON DUPLICATE KEY UPDATE activated = 1');
    $stmt->execute([$user['id']]);
    $granted[] = $username;
}

echo json_encode([
    'success' => true,
    'granted' => $granted,
    'not_found' => $notFound,
]);
