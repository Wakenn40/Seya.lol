<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed', 'details' => $e->getMessage()]);
    exit;
}

$input = file_get_contents('php://input');
if (empty($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Empty request body']);
    exit;
}

$data = json_decode($input, true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if (!$username || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password required']);
    exit;
}

$cleanUsername = strtolower(preg_replace('/[^a-z0-9_.]/', '', $username));

$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
$stmt->execute([$cleanUsername]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid username or password']);
    exit;
}

$newToken = bin2hex(random_bytes(32));
$stmt = $pdo->prepare('UPDATE users SET token = ? WHERE id = ?');
$stmt->execute([$newToken, $user['id']]);

// Ensure phone blur/radius columns exist
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN phone_blur TINYINT(1) DEFAULT 0");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN phone_blur_strength INT DEFAULT 3");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN phone_border_radius INT DEFAULT 42");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN bg_phone_opacity DECIMAL(3,2) DEFAULT 1");
} catch (PDOException $e) {}
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
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_access_token TEXT DEFAULT NULL");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_refresh_token TEXT DEFAULT NULL");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_token_expires INT DEFAULT 0");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_tilt TINYINT(1) DEFAULT 0");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN spotify_widget_tilt TINYINT(1) DEFAULT 0");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN custom_player JSON");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN custom_player_scale DECIMAL(3,2) DEFAULT 1.00");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN layers JSON");
} catch (PDOException $e) {}

$stmt = $pdo->prepare('SELECT * FROM pages WHERE user_id = ?');
$stmt->execute([$user['id']]);
$page = $stmt->fetch(PDO::FETCH_ASSOC);

// Refresh Discord data on login if tokens exist
if ($page && !empty($page['discord_id'])) {
    refreshDiscordData($pdo, $user['id']);
    $stmt = $pdo->prepare('SELECT * FROM pages WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $page = $stmt->fetch(PDO::FETCH_ASSOC);
}

$pageData = null;
if ($page) {
    $pageData = [
        'published' => (bool)$page['published'],
        'displayName' => $page['display_name'] ?? '',
        'displayNameHtml' => $page['display_name_html'] ?? '',
        'bio' => $page['bio'] ?? 'Hey, this is my page ✨',
        'bioHtml' => $page['bio_html'] ?? 'Hey, this is my page ✨',
        'avatar' => $page['avatar'] ?? '',
        'music' => [
            'src' => $page['music_src'] ?? '',
            'name' => $page['music_name'] ?? '',
            'gain' => (float)($page['music_gain'] ?? 1),
            'volume' => (float)($page['music_volume'] ?? 1)
        ],
        'linksEnabled' => (bool)($page['links_enabled'] ?? false),
        'links' => $page['links'] ? json_decode($page['links'], true) : [],
        'bg' => $page['bg'] ?? 'bg-black',
        'bgImageGlobal' => $page['bg_image_global'] ?? '',
        'bgImagePhone' => $page['bg_image_phone'] ?? '',
        'bgPhoneOpacity' => (float)($page['bg_phone_opacity'] ?? 1),
        'deleted' => [
            'avatar' => (bool)($page['deleted_avatar'] ?? false),
            'name' => (bool)($page['deleted_name'] ?? false),
            'bio' => (bool)($page['deleted_bio'] ?? false),
            'phone' => (bool)($page['deleted_phone'] ?? false)
        ],
        'btnStyle' => $page['btn_style'] ?? '',
        'accentColor' => $page['accent_color'] ?? '#d6d6d6',
        'font' => $page['font'] ?? 'Syne',
        'nameSize' => (int)($page['name_size'] ?? 22),
        'textManualSize' => $page['text_manual_size'] ? json_decode($page['text_manual_size'], true) : [],
        'customObjects' => $page['custom_objects'] ? json_decode($page['custom_objects'], true) : [],
        'customObjectCounter' => (int)($page['custom_object_counter'] ?? 0),
        'animations' => $page['animations'] ? json_decode($page['animations'], true) : [],
        'phoneFrameImage' => $page['phone_frame_image'] ?? '',
        'phoneBlur' => (bool)($page['phone_blur'] ?? false),
        'phoneBlurStrength' => (int)($page['phone_blur_strength'] ?? 3),
        'phoneBorderRadius' => (int)($page['phone_border_radius'] ?? 42),
        'cursorImage' => $page['cursor_image'] ?? '',
        'cursorSize' => (int)($page['cursor_size'] ?? 32),
        'discordWidgetTilt' => (bool)($page['discord_widget_tilt'] ?? false),
        'spotifyWidgetTilt' => (bool)($page['spotify_widget_tilt'] ?? false),
        'customPlayer' => $page['custom_player'] ? json_decode($page['custom_player'], true) : null,
        'customPlayerScale' => (float)($page['custom_player_scale'] ?? 1),
        'layers' => $page['layers'] ? json_decode($page['layers'], true) : null,
        'layout' => $page['layout'] ? json_decode($page['layout'], true) : [],
        'discord' => [
            'id' => $page['discord_id'] ?? '',
            'username' => $page['discord_username'] ?? '',
            'avatar' => $page['discord_avatar'] ?? '',
            'discriminator' => $page['discord_discriminator'] ?? '0',
            'public_flags' => (int)($page['discord_public_flags'] ?? 0),
            'premium_type' => (int)($page['discord_premium_type'] ?? 0)
        ]
    ];
}

function refreshDiscordData($pdo, $userId) {
    $stmt = $pdo->prepare('SELECT discord_access_token, discord_refresh_token, discord_token_expires, discord_id FROM pages WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || empty($row['discord_id'])) return false;

    $token = $row['discord_access_token'];
    $refresh = $row['discord_refresh_token'];
    $expires = (int)$row['discord_token_expires'];

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

try {
    $pdo->exec("ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT NULL");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN email_code VARCHAR(6) DEFAULT NULL");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN email_code_expires INT DEFAULT 0");
} catch (PDOException $e) {}
try {
    $pdo->exec("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) DEFAULT NULL");
} catch (PDOException $e) {}

// Check 2FA — if TOTP secret exists, require code before returning token
if (!empty($user['totp_secret'])) {
    echo json_encode([
        'success' => true,
        'requires2fa' => true
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'token' => $newToken,
    'username' => $cleanUsername,
    'pageData' => $pageData
]);