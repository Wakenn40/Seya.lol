<?php
// ============================================================
// deploy.php — self-updater for seya.lol
// Upload this file to the server root, then visit:
//   https://seya.lol/deploy.php?go=1
// It will download the latest files from GitHub and update them.
// ============================================================

header('Content-Type: text/plain; charset=utf-8');

$token = $_GET['token'] ?? '';
// Simple guard to prevent accidental triggers
if ($token !== 'seya2024') {
    echo "ERROR: Invalid or missing token.\n";
    echo "Usage: /deploy.php?go=1\n";
    exit;
}

$repo = 'https://raw.githubusercontent.com/Wakenn40/Seya.lol/main/';
$files = [
    'index.php',
    'index.html',
    'dashboard.html',
    'auth.html',
    'builder.html',
    'landing.html',
    'public.html',
    'app.js',
    'api.php',
    'discord-callback.php',
    'api/index.php',
    'api/discord-callback.php',
    'api/login.php',
    'api/register.php',
    'api/check-session.php',
    'api/save-page.php',
    'api/logout.php',
    'api/analytics.php',
    'api/change-password.php',
    'api/proxy-image.php',
    'api/public-page.php',
    'api/discord-unlink.php',
    'api/discord-callback.php',
    'api/link-stats.php',
    'api/premium-status.php',
    'api/create-payment.php',
    'api/check-payment.php',
    'api/setup-totp.php',
    'api/verify-totp-setup.php',
    'api/disable-totp.php',
    'api/verify-2fa-login.php',
    'api/verify-totp-for-action.php',
    'api/send-email-code.php',
    'api/reset-password-by-email.php',
    'api/get-email-status.php',
    'api/list-templates.php',
    'api/get-template.php',
    'api/apply-template.php',
    'api/save-template.php',
    'api/delete-template.php',
    'api/user-rank.php',
    'api/list-users.php',
    'api/get-aliases.php',
    'api/add-alias.php',
    'api/delete-alias.php',
    'api/check-alias.php',
    'api/track-click.php',
    'api/storage-info.php',
    'api/check-upload.php',
    'api/discord-link.php',
    'api/link-email.php',
    'api/unlink-email.php',
    'api/verify-email-code.php',
    'api/crypto-webhook.php',
    'api/grant-premium.php',
    'api/check-2fa.php',
    'api/toggle-2fa.php',
];

$success = 0;
$errors = [];

foreach ($files as $file) {
    $url = $repo . $file;
    $content = @file_get_contents($url);
    if ($content === false) {
        $errors[] = "FAILED to download: $file";
        continue;
    }
    
    $dir = dirname($file);
    if ($dir !== '.' && $dir !== '/') {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
    
    $written = file_put_contents($file, $content);
    if ($written === false) {
        $errors[] = "FAILED to write: $file";
        continue;
    }
    
    $success++;
}

echo "=== Deploy Complete ===\n";
echo "Files updated: $success / " . count($files) . "\n";
if (count($errors) > 0) {
    echo "Errors:\n";
    foreach ($errors as $e) {
        echo "  - $e\n";
    }
}
echo "\nDone. The site should now work.\n";
