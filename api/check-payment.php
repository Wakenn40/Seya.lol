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
require_once __DIR__ . '/../lib/cryptobot.php';

$user = getUserFromToken($pdo);
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Check if already premium
if (isPremium($pdo, $user['id'])) {
    echo json_encode(['success' => true, 'premium' => true, 'status' => 'paid']);
    exit;
}

// Get invoice ID from DB
$stmt = $pdo->prepare('SELECT invoice_id FROM premium_users WHERE user_id = ? AND activated = 0');
$stmt->execute([$user['id']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row || !$row['invoice_id']) {
    echo json_encode(['success' => false, 'premium' => false, 'status' => 'no_invoice']);
    exit;
}

if (empty(CRYPTOBOT_API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => 'CryptoBot not configured']);
    exit;
}

try {
    $crypto = new CryptoPay(CRYPTOBOT_API_KEY);
    $invoices = $crypto->getInvoices([(int)$row['invoice_id']]);

    $invoice = $invoices[0] ?? null;
    if (!$invoice) {
        echo json_encode(['success' => false, 'premium' => false, 'status' => 'not_found']);
        exit;
    }

    $status = $invoice['status'];

    if ($status === 'paid') {
        $stmt = $pdo->prepare('UPDATE premium_users SET activated = 1 WHERE user_id = ?');
        $stmt->execute([$user['id']]);
        echo json_encode(['success' => true, 'premium' => true, 'status' => 'paid']);
    } else {
        echo json_encode(['success' => false, 'premium' => false, 'status' => $status]);
    }
} catch (Exception $e) {
    error_log('check-payment error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Payment check failed']);
}
