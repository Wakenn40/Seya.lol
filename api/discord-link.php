<?php
$code = $_GET['code'] ?? null;
$error = $_GET['error'] ?? null;
$state = $_GET['state'] ?? null;

if ($error) {
    echo '<html><body><script>window.close();</script></body></html>';
    exit;
}

if (!$code || !$state) {
    http_response_code(400);
    echo '<html><body><p>Missing parameters</p><script>window.close();</script></body></html>';
    exit;
}

$db_config = [
    'host' => 'localhost',
    'port' => 3306,
    'user' => 'u3516713_default',
    'password' => 'opy5C41C45P7c3W2',
    'database' => 'u3516713_default',
    'charset' => 'utf8mb4'
];

try {
    $pdo = new PDO(
        "mysql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['database']};charset={$db_config['charset']}",
        $db_config['user'],
        $db_config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo '<html><body><p>DB error</p><script>window.close();</script></body></html>';
    exit;
}

// Find user by token
$stmt = $pdo->prepare('SELECT id FROM users WHERE token = ?');
$stmt->execute([$state]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo '<html><body><p>Invalid session</p><script>window.close();</script></body></html>';
    exit;
}

// Discord OAuth config
$clientId = '1505514252473991238';
$clientSecret = 'aRS8QZS_3g5kPGo2yeAygaQv-AuDY-ir';
$redirectUri = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/api/discord-link.php';

$tokenUrl = 'https://discord.com/api/oauth2/token';
$tokenData = [
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'grant_type' => 'authorization_code',
    'code' => $code,
    'redirect_uri' => $redirectUri
];

$ch = curl_init($tokenUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($tokenData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

$tokenResponse = curl_exec($ch);
curl_close($ch);

$tokenInfo = json_decode($tokenResponse, true);

if (!isset($tokenInfo['access_token'])) {
    echo '<html><body><p>Token error</p><script>window.close();</script></body></html>';
    exit;
}

$accessToken = $tokenInfo['access_token'];
$refreshToken = $tokenInfo['refresh_token'] ?? null;
$expiresIn = $tokenInfo['expires_in'] ?? 604800;

$userUrl = 'https://discord.com/api/users/@me';
$ch = curl_init($userUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);

$userResponse = curl_exec($ch);
curl_close($ch);

$discordUser = json_decode($userResponse, true);

if (!isset($discordUser['id'])) {
    echo '<html><body><p>User info error</p><script>window.close();</script></body></html>';
    exit;
}

// Ensure columns exist
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_id VARCHAR(50) DEFAULT ''");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_username VARCHAR(100) DEFAULT ''");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_avatar VARCHAR(100) DEFAULT ''");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_discriminator VARCHAR(10) DEFAULT '0'");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_public_flags INT DEFAULT 0");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_premium_type INT DEFAULT 0");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_access_token TEXT DEFAULT NULL");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_refresh_token TEXT DEFAULT NULL");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_token_expires INT DEFAULT 0");
} catch (PDOException $e) {}

// Save Discord data with tokens
$expiresAt = time() + $expiresIn;
$stmt = $pdo->prepare('UPDATE pages SET discord_id = ?, discord_username = ?, discord_avatar = ?, discord_discriminator = ?, discord_public_flags = ?, discord_premium_type = ?, discord_access_token = ?, discord_refresh_token = ?, discord_token_expires = ? WHERE user_id = ?');
$stmt->execute([
    $discordUser['id'],
    $discordUser['username'] ?? '',
    $discordUser['avatar'] ?? '',
    $discordUser['discriminator'] ?? '0',
    $discordUser['public_flags'] ?? 0,
    $discordUser['premium_type'] ?? 0,
    $accessToken,
    $refreshToken,
    $expiresAt,
    $user['id']
]);

// Return success HTML that communicates with opener and closes popup
$username = htmlspecialchars($discordUser['username'] ?? '');
$avatar = $discordUser['avatar'] ?? '';
$avatarUrl = $avatar ? "https://cdn.discordapp.com/avatars/{$discordUser['id']}/{$avatar}.png" : '';
$publicFlags = (int)($discordUser['public_flags'] ?? 0);
$premiumType = (int)($discordUser['premium_type'] ?? 0);
?>
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Discord Connected</title></head>
<body style="background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
<div style="text-align:center;">
    <p style="font-size:18px;">✓ Discord connected</p>
    <p style="color:#888;font-size:13px;">@<?php echo $username; ?></p>
</div>
<script>
try { if (window.opener) {
    window.opener.postMessage({ type: 'discord-linked', success: true, username: '<?php echo addslashes($username); ?>', discord: { id: '<?php echo addslashes($discordUser['id']); ?>', username: '<?php echo addslashes($discordUser['username'] ?? ''); ?>', avatar: '<?php echo addslashes($discordUser['avatar'] ?? ''); ?>', discriminator: '<?php echo addslashes($discordUser['discriminator'] ?? '0'); ?>', public_flags: <?php echo $publicFlags; ?>, premium_type: <?php echo $premiumType; ?> } }, '*');
} } catch(e) {}
setTimeout(() => window.close(), 1500);
</script>
</body>
</html>
