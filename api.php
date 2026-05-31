<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';
$allowed = [
    'login', 'register', 'logout', 'check-session',
    'save-page', 'storage-info', 'check-upload',
    'public-page', 'list-users', 'analytics',
    'change-password', 'proxy-image',
    'get-aliases', 'add-alias', 'delete-alias', 'check-alias',
    'link-stats', 'track-click',
    'get-email-status', 'premium-status',
    'create-payment', 'check-payment',
    'setup-totp', 'verify-totp-setup', 'disable-totp',
    'send-email-code', 'reset-password-by-email',
    'verify-2fa-login', 'verify-totp-for-action',
    'list-templates', 'get-template', 'apply-template', 'save-template', 'delete-template',
    'user-rank', 'discord-unlink', 'discord-link', 'discord-callback',
    'link-email', 'unlink-email',
    'verify-email-code', 'crypto-webhook', 'grant-premium',
    'check-2fa', 'toggle-2fa',
];

if (!in_array($action, $allowed)) {
    http_response_code(404);
    echo json_encode(['error' => 'Invalid action: ' . $action]);
    exit;
}

$file = __DIR__ . '/api/' . $action . '.php';
if (!file_exists($file)) {
    http_response_code(404);
    echo json_encode(['error' => 'Handler not found: ' . $action]);
    exit;
}

require $file;
