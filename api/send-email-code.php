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
require_once __DIR__ . '/../lib/smtp-config.php';

$input = json_decode(file_get_contents('php://input'), true);
$token = $_GET['token'] ?? $input['token'] ?? '';
if (empty($token)) {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($auth)) {
        $headers = getallheaders();
        if (is_array($headers)) {
            $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
    }
    if (empty($auth)) {
        foreach ($_SERVER as $key => $value) {
            if (stripos($key, 'Authorization') !== false) {
                $auth = $value;
                break;
            }
        }
    }
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        $token = $matches[1];
    }
}

$isPasswordReset = isset($input['forReset']) && $input['forReset'] === true;

if (!$token && !$isPasswordReset) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($isPasswordReset) {
    $email = isset($input['email']) ? trim($input['email']) : '';
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email']);
        exit;
    }
    $stmt = $pdo->prepare('SELECT id, username, email FROM users WHERE email = ? AND email_verified = 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'No verified account with this email']);
        exit;
    }
} else {
    $stmt = $pdo->prepare('SELECT id, username, email FROM users WHERE token = ?');
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid token']);
        exit;
    }
}

$code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expires = time() + 600;

$stmt = $pdo->prepare('UPDATE users SET email_code = ?, email_code_expires = ? WHERE id = ?');
$stmt->execute([$code, $expires, $user['id']]);

require_once __DIR__ . '/../lib/smtp-mailer.php';

$to = $user['email'];
$subject = 'Your verification code — seya.lol';
$body = '
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#080808;color:#f0f0f0;padding:40px;">
<div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #222;border-radius:16px;padding:32px;">
<div style="font-size:22px;font-weight:800;color:#d6d6d6;margin-bottom:24px;">seya.lol</div>
<p style="font-size:15px;color:#888;margin-bottom:20px;">Your verification code is:</p>
<div style="font-size:48px;font-weight:800;letter-spacing:12px;text-align:center;color:#d6d6d6;padding:24px;background:#1a1a1a;border-radius:12px;margin-bottom:24px;font-family:monospace;">' . $code . '</div>
<p style="font-size:13px;color:#555;">This code expires in <strong style="color:#888;">10 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
</div></body></html>';

try {
    $mailer = new SmtpMailer(SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME);
    $mailer->send($to, $subject, $body);
    echo json_encode(['success' => true, 'message' => 'Code sent to ' . substr($to, 0, 3) . '***@' . substr(strstr($to, '@'), 1)]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email: ' . $e->getMessage() . ' | Log: ' . (method_exists($mailer, 'getLastLog') ? $mailer->getLastLog() : '')]);
}
