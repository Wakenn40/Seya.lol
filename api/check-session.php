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
error_log('check-session DB error: ' . $e->getMessage());
    echo json_encode(['valid' => false, 'error' => 'DB connection failed']);
    exit;
}

$tokenFromQuery = $_GET['token'] ?? '';

if (!empty($tokenFromQuery)) {
    $token = $tokenFromQuery;
    error_log('check-session: token from query param');
} else {
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
    error_log('check-session: auth value: ' . substr($auth, 0, 50));

    if (!preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        error_log('check-session: no Bearer token found');
        echo json_encode(['valid' => false, 'error' => 'No Bearer token']);
        exit;
    }

    $token = $matches[1];
}
error_log('check-session: token: ' . substr($token, 0, 20) . '...');

$stmt = $pdo->prepare('SELECT id, username FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(['valid' => false]);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM pages WHERE user_id = ?');
$stmt->execute([$user['id']]);
$page = $stmt->fetch(PDO::FETCH_ASSOC);

// Ensure layout column is large enough
try {
    $pdo->exec("ALTER TABLE pages MODIFY COLUMN layout LONGTEXT");
} catch (PDOException $e) {}

try {
    $pdo->exec("ALTER TABLE pages MODIFY COLUMN custom_objects LONGTEXT");
} catch (PDOException $e) {}

    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN cursor_trail JSON");
    } catch (PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widgets TINYINT(1) DEFAULT 0");
    } catch (PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_scale DECIMAL(3,2) DEFAULT 1.00");
    } catch (PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_opacity DECIMAL(3,2) DEFAULT 1.00");
    } catch (PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_bg_color VARCHAR(32) DEFAULT '#1a1a1a'");
    } catch (PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN spotify_widget JSON");
    } catch (PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN spotify_widget_scale DECIMAL(3,2) DEFAULT 1.00");
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
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN fade_in TINYINT(1) DEFAULT 0");
    } catch (PDOException $e) {}

try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN cursor_trail JSON");
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widgets TINYINT(1) DEFAULT 0");
    } catch (PDOException $e) {}
} catch (PDOException $e) {}

$premium = false;
try {
    $pStmt = $pdo->prepare("SELECT 1 FROM premium_users WHERE user_id = ? AND activated = 1");
    $pStmt->execute([$user['id']]);
    $premium = (bool)$pStmt->fetchColumn();
} catch (PDOException $e) {}

$pageData = null;
if ($page) {
    $customObjectsJson = $page['custom_objects'] ?? '[]';
    error_log('check-session: custom_objects raw: ' . substr($customObjectsJson, 0, 500));
    
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
        'customObjects' => json_decode($customObjectsJson, true),
        'customObjectCounter' => (int)($page['custom_object_counter'] ?? 0),
        'animations' => $page['animations'] ? json_decode($page['animations'], true) : [],
        'effects' => $page['effects'] ? json_decode($page['effects'], true) : [],
        'phoneFrameImage' => $page['phone_frame_image'] ?? '',
        'cursorImage' => $page['cursor_image'] ?? '',
        'cursorSize' => (int)($page['cursor_size'] ?? 32),
        'cursorTrail' => $page['cursor_trail'] ? json_decode($page['cursor_trail'], true) : ['mode' => 'none', 'image' => '', 'config' => new stdClass],
        'clickToEnter' => $page['click_to_enter'] ? json_decode($page['click_to_enter'], true) : ['enabled' => false, 'text' => 'Click to enter'],
        'customFonts' => $page['custom_fonts'] ? json_decode($page['custom_fonts'], true) : [],
        'discordWidgets' => (bool)($page['discord_widgets'] ?? false),
        'discordWidgetScale' => (float)($page['discord_widget_scale'] ?? 1),
        'discordWidgetOpacity' => (float)($page['discord_widget_opacity'] ?? 1),
        'discordWidgetBgColor' => $page['discord_widget_bg_color'] ?? '#1a1a1a',
        'discordWidgetTilt' => (bool)($page['discord_widget_tilt'] ?? false),
        'spotifyWidget' => $page['spotify_widget'] ? json_decode($page['spotify_widget'], true) : null,
        'spotifyWidgetScale' => (float)($page['spotify_widget_scale'] ?? 1),
        'spotifyWidgetTilt' => (bool)($page['spotify_widget_tilt'] ?? false),
        'customPlayer' => $page['custom_player'] ? json_decode($page['custom_player'], true) : null,
        'customPlayerScale' => (float)($page['custom_player_scale'] ?? 1),
        'layers' => $page['layers'] ? json_decode($page['layers'], true) : null,
        'fadeIn' => (bool)($page['fade_in'] ?? false),
        'layout' => $page['layout'] ? json_decode($page['layout'], true) : [],
        'discord' => [
            'id' => $page['discord_id'] ?? '',
            'username' => $page['discord_username'] ?? '',
            'avatar' => $page['discord_avatar'] ?? '',
            'discriminator' => $page['discord_discriminator'] ?? '0',
            'public_flags' => (int)($page['discord_public_flags'] ?? 0),
            'premium_type' => (int)($page['discord_premium_type'] ?? 0)
        ],
        'premium' => $premium
    ];
    
    error_log('check-session: pageData customObjects: ' . json_encode($pageData['customObjects']));
    error_log('check-session: pageData effects: ' . json_encode($pageData['effects']));
    error_log('check-session: pageData.layout: ' . json_encode($pageData['layout']));
    error_log('check-session: layout.phone: ' . json_encode($pageData['layout']['phone'] ?? []));
    error_log('check-session: layout.phone.tilt3D: ' . json_encode($pageData['layout']['phone']['tilt3D'] ?? 'NOT SET'));
    error_log('check-session: customFonts: ' . json_encode($pageData['customFonts'] ?? []));
    error_log('check-session: layout string length: ' . strlen($page['layout'] ?? ''));
}

echo json_encode([
    'valid' => true,
    'username' => $user['username'],
    'pageData' => $pageData
]);