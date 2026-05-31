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
    echo json_encode(['error' => 'Already premium', 'premium' => true]);
    exit;
}

if (empty(CRYPTOBOT_API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => 'CryptoBot not configured']);
    exit;
}

try {
    $crypto = new CryptoPay(CRYPTOBOT_API_KEY);

    $invoice = $crypto->createInvoice(0.0001, 'USDT', [
        'description' => 'Lifetime Premium - seya.lol (@' . $user['username'] . ')',
        'return_url' => SITE_URL . '/dashboard',
    ]);

    $invoiceId = $invoice['invoice_id'];

    // Save invoice to DB
    $stmt = $pdo->prepare('INSERT INTO premium_users (user_id, invoice_id, activated) VALUES (?, ?, 0)
        ON DUPLICATE KEY UPDATE invoice_id = VALUES(invoice_id), activated = 0');
    $stmt->execute([$user['id'], $invoiceId]);

    echo json_encode([
        'success' => true,
        'invoice_id' => $invoiceId,
        'pay_url' => $invoice['pay_url'] ?? $invoice['bot_invoice_url'] ?? '',
        'status' => $invoice['status'],
    ]);
} catch (Exception $e) {
    error_log('create-payment error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Payment creation failed: ' . $e->getMessage()]);
}
