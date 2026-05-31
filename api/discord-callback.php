<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ob_start();
ini_set('display_errors', '0');

$code = $_GET['code'] ?? null;
$error = $_GET['error'] ?? null;
$state = $_GET['state'] ?? null;

if ($error) {
    if ($state) {
        echo '<html><body><script>if(window.opener){window.opener.postMessage({type:"discord-linked",success:false},"*");}window.close();</script></body></html>';
    } else {
        header('Location: /?auth=discord-cancelled');
    }
    exit;
}

if (!$code) {
    http_response_code(400);
    ob_clean();
echo json_encode(['error' => 'No authorization code provided']);
    exit;
}

// Discord OAuth config
$clientId = '1505514252473991238';
$clientSecret = 'aRS8QZS_3g5kPGo2yeAygaQv-AuDY-ir';
// Hardcoded to match the Redirect URI configured in Discord Developer Portal
$redirectUri = 'https://seya.lol/discord-callback.php';

error_log('discord-callback: redirect_uri=' . $redirectUri);
error_log('discord-callback: code=' . substr($code ?? '', 0, 20) . '... state=' . substr($state ?? '', 0, 20) . '...');

// Exchange code for token
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
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

error_log('discord-callback: token exchange HTTP code=' . $httpCode . ' response=' . $tokenResponse);

$tokenInfo = json_decode($tokenResponse, true);

if (!isset($tokenInfo['access_token'])) {
    // Popup flow: show debug info in popup
    if ($state) {
        echo '<html><body style="background:#111;color:#fff;padding:20px;font-family:sans-serif;">';
        echo '<h2 style="color:#ff4444;font-size:16px;">Token exchange failed</h2>';
        echo '<p>HTTP ' . $httpCode . '</p>';
        echo '<pre style="font-size:12px;color:#aaa;white-space:pre-wrap;word-break:break-all;">' . htmlspecialchars($tokenResponse) . '</pre>';
        echo '<script>try{if(window.opener){window.opener.postMessage({type:"discord-linked",success:false},"*");}}catch(e){}window.open("","_self");window.close();</script>';
        echo '</body></html>';
        exit;
    }
    http_response_code(400);
    ob_clean();
echo json_encode(['error' => 'Failed to get access token', 'details' => $tokenResponse]);
    exit;
}

$accessToken = $tokenInfo['access_token'];
$refreshToken = $tokenInfo['refresh_token'] ?? null;
$expiresIn = $tokenInfo['expires_in'] ?? 604800;

// --- Discord data refresh helper ---
function refreshDiscordData($pdo, $userId) {
    $stmt = $pdo->prepare('SELECT discord_access_token, discord_refresh_token, discord_token_expires, discord_id FROM pages WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || empty($row['discord_id'])) return false;

    $token = $row['discord_access_token'];
    $refresh = $row['discord_refresh_token'];
    $expires = (int)$row['discord_token_expires'];

    // If token expired and we have a refresh token, get a new one
    if ($expires > 0 && time() >= $expires && $refresh) {
        $tokenData = [
            'client_id' => '1505514252473991238',
            'client_secret' => 'aRS8QZS_3g5kPGo2yeAygaQv-AuDY-ir',
            'grant_type' => 'refresh_token',
            'refresh_token' => $refresh
        ];
        $ch = curl_init('https://discord.com/api/oauth2/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($tokenData));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        $res = curl_exec($ch);
        curl_close($ch);
        $info = json_decode($res, true);
        if (isset($info['access_token'])) {
            $token = $info['access_token'];
            $refresh = $info['refresh_token'] ?? $refresh;
            $expires = time() + ($info['expires_in'] ?? 604800);
            $stmt = $pdo->prepare('UPDATE pages SET discord_access_token = ?, discord_refresh_token = ?, discord_token_expires = ? WHERE user_id = ?');
            $stmt->execute([$token, $refresh, $expires, $userId]);
        } else {
            return false;
        }
    }

    if (!$token) return false;

    // Fetch user info from Discord
    $ch = curl_init('https://discord.com/api/users/@me');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $token]);
    $res = curl_exec($ch);
    curl_close($ch);
    $user = json_decode($res, true);
    if (!isset($user['id'])) return false;

    $stmt = $pdo->prepare('UPDATE pages SET discord_id = ?, discord_username = ?, discord_avatar = ?, discord_discriminator = ?, discord_public_flags = ?, discord_premium_type = ? WHERE user_id = ?');
    $stmt->execute([
        $user['id'],
        $user['username'] ?? '',
        $user['avatar'] ?? '',
        $user['discriminator'] ?? '0',
        $user['public_flags'] ?? 0,
        $user['premium_type'] ?? 0,
        $userId
    ]);
    return true;
}

// Get user info from Discord
$userUrl = 'https://discord.com/api/users/@me';
$ch = curl_init($userUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);

$userResponse = curl_exec($ch);
curl_close($ch);

$discordUser = json_decode($userResponse, true);

if (!isset($discordUser['id'])) {
    // Popup flow: show debug info in popup
    if ($state) {
        echo '<html><body style="background:#111;color:#fff;padding:20px;font-family:sans-serif;">';
        echo '<h2 style="color:#ff4444;font-size:16px;">Failed to get Discord user info</h2>';
        echo '<pre style="font-size:12px;color:#aaa;white-space:pre-wrap;word-break:break-all;">' . htmlspecialchars($userResponse) . '</pre>';
        echo '<script>try{if(window.opener){window.opener.postMessage({type:"discord-linked",success:false},"*");}}catch(e){}window.open("","_self");window.close();</script>';
        echo '</body></html>';
        exit;
    }
    http_response_code(400);
    ob_clean();
echo json_encode(['error' => 'Failed to get user info', 'details' => $userResponse]);
    exit;
}

// ---- POPUP FLOW (already logged in, linking from dashboard) ----
if ($state) {
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

    $stmt = $pdo->prepare('SELECT id FROM users WHERE token = ?');
    $stmt->execute([$state]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo '<html><body><p>Invalid session</p><script>window.close();</script></body></html>';
        exit;
    }

    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_id VARCHAR(50) DEFAULT ''"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_username VARCHAR(100) DEFAULT ''"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_avatar VARCHAR(100) DEFAULT ''"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_discriminator VARCHAR(10) DEFAULT '0'"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_public_flags INT DEFAULT 0"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_premium_type INT DEFAULT 0"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_access_token TEXT DEFAULT NULL"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_refresh_token TEXT DEFAULT NULL"); } catch (PDOException $e) {}
    try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_token_expires INT DEFAULT 0"); } catch (PDOException $e) {}

    $expiresAt = time() + ($expiresIn ?? 604800);
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

    $username = htmlspecialchars($discordUser['username'] ?? '');
    $discordId = htmlspecialchars($discordUser['id'] ?? '');
    $discordAvatar = htmlspecialchars($discordUser['avatar'] ?? '');
    $discordDiscriminator = htmlspecialchars($discordUser['discriminator'] ?? '0');
    $publicFlags = (int)($discordUser['public_flags'] ?? 0);
    $premiumType = (int)($discordUser['premium_type'] ?? 0);
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Discord Connected</title></head>';
    echo '<body style="background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">';
    echo '<div style="text-align:center;"><p style="font-size:18px;">Discord connected</p><p style="color:#888;font-size:13px;">@' . $username . '</p></div>';
    echo '<script>';
    echo 'try{if(window.opener){window.opener.postMessage({type:"discord-linked",success:true,username:"' . addslashes($username) . '",discord:{id:"' . addslashes($discordUser['id']) . '",username:"' . addslashes($discordUser['username'] ?? '') . '",avatar:"' . addslashes($discordUser['avatar'] ?? '') . '",discriminator:"' . addslashes($discordUser['discriminator'] ?? '0') . '",public_flags:' . $publicFlags . ',premium_type:' . $premiumType . '}},"*");}}catch(e){}';
    echo 'window.open("","_self");window.close();';
    echo '</script></body></html>';
    exit;
}

// ---- REGISTRATION FLOW (not logged in, from auth screen) ----
session_start();
$_SESSION['discord_pending'] = [
    'discord_id' => $discordUser['id'],
    'discord_username' => $discordUser['username'] ?? '',
    'discord_avatar' => $discordUser['avatar'] ?? '',
    'discord_discriminator' => $discordUser['discriminator'] ?? '0',
    'discord_public_flags' => $discordUser['public_flags'] ?? 0,
    'discord_premium_type' => $discordUser['premium_type'] ?? 0
];

$discordUsername = $discordUser['username'] ?? '';
header('Location: /?auth=discord-connected&discord_user=' . urlencode($discordUsername));
exit;