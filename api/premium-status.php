<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config.php';

$user = getUserFromToken($pdo);
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$premium = isPremium($pdo, $user['id']);

$stmt = $pdo->prepare('SELECT purchase_date FROM premium_users WHERE user_id = ? AND activated = 1');
$stmt->execute([$user['id']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    'premium' => $premium,
    'purchase_date' => $row ? $row['purchase_date'] : null,
]);
