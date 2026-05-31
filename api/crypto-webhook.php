<?php
/**
 * Вебхук от CryptoBot.
 * CryptoBot будет слать POST запросы сюда при обновлении статуса инвойса.
 *
 * Настройка: вызови /api/set-crypto-webhook или задай вручную через API CryptoBot.
 * Требуется публичный HTTPS URL.
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../config.php';

// Получаем сырое тело запроса
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (!$data || !isset($data['payload'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$payload = $data['payload'];

// CryptoBot шлёт update_id и данные инвойса
$invoiceId = $payload['invoice_id'] ?? null;
$status = $payload['status'] ?? null;

if (!$invoiceId || !$status) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing invoice_id or status']);
    exit;
}

error_log("crypto-webhook: invoice_id=$invoiceId status=$status");

if ($status === 'paid') {
    // Найти пользователя по invoice_id и активировать премиум
    $stmt = $pdo->prepare('SELECT user_id FROM premium_users WHERE invoice_id = ?');
    $stmt->execute([$invoiceId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $stmt = $pdo->prepare('UPDATE premium_users SET activated = 1 WHERE invoice_id = ?');
        $stmt->execute([$invoiceId]);
        error_log("crypto-webhook: premium activated for user_id=" . $row['user_id']);
    } else {
        error_log("crypto-webhook: no user found for invoice_id=$invoiceId");
    }
}

echo json_encode(['ok' => true]);
