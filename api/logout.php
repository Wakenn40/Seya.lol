<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config.php';

$token = getBearerToken();
if ($token) {
    $stmt = $pdo->prepare('UPDATE users SET token = NULL WHERE token = ?');
    $stmt->execute([$token]);
}

echo json_encode(['success' => true]);