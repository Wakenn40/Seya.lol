<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$auth = '';
$tokenFromQuery = $_GET['token'] ?? $_GET['auth'] ?? '';

if (!empty($tokenFromQuery)) {
    $token = $tokenFromQuery;
} else {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['Authorization'])) {
        $auth = $_SERVER['Authorization'];
    } else {
        $headers = getallheaders();
        if ($headers !== false && is_array($headers)) {
            foreach ($headers as $key => $value) {
                if (strtolower($key) === 'authorization') {
                    $auth = $value;
                    break;
                }
            }
        }
    }
    if (empty($auth)) {
        foreach ($_SERVER as $key => $value) {
            if (stripos($key, 'authorization') !== false) {
                $auth = $value;
                break;
            }
        }
    }
    if (empty($auth)) {
        error_log('save-page: no Authorization header found');
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized', 'debug' => 'no auth header']);
        exit;
    }
    if (!preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        error_log('save-page: Bearer token not matched. auth=' . substr($auth, 0, 100));
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized', 'debug' => 'no bearer']);
        exit;
    }
    $token = $matches[1];
}
error_log('save-page: token=' . substr($token, 0, 20) . '...');

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
    error_log('save-page: DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    error_log('save-page: user not found for token');
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

$rawInput = file_get_contents('php://input');

// Gating premium features: check before processing
$inputData = json_decode($rawInput, true);
if ($inputData && isset($inputData['pageData'])) {
    $premiumCheckFields = ['customFonts', 'cursorTrail', 'customPlayer', 'layers', 'visualizer'];
    foreach ($premiumCheckFields as $f) {
        $val = $inputData['pageData'][$f] ?? null;
        if ($val !== null && !empty($val)) {
            requirePremium($pdo, $user['id']);
        }
    }
}

$data = json_decode($rawInput, true);
$pageData = $data['pageData'] ?? [];
$publish = $data['publish'] ?? false;

error_log('save-page: FULL pageData.layout: ' . json_encode($pageData['layout'] ?? []));
error_log('save-page: layout.phone: ' . json_encode($pageData['layout']['phone'] ?? []));
error_log('save-page: layout.phone.tilt3D: ' . json_encode($pageData['layout']['phone']['tilt3D'] ?? 'NOT SET'));
error_log('save-page: customFonts: ' . json_encode($pageData['customFonts'] ?? []));
error_log('save-page: customFonts count: ' . count($pageData['customFonts'] ?? []));

error_log('save-page: received custom_objects: ' . json_encode($pageData['customObjects'] ?? []));
error_log('save-page: received layout: ' . json_encode($pageData['layout'] ?? []));
error_log('save-page: phone tilt3D: ' . json_encode($pageData['layout']['phone']['tilt3D'] ?? null));
error_log('save-page: phoneBlur=' . ($pageData['phoneBlur'] ?? 'null') . ', phoneBlurStrength=' . ($pageData['phoneBlurStrength'] ?? 'null') . ', phoneBorderRadius=' . ($pageData['phoneBorderRadius'] ?? 'null'));

// Check columns exist
$cols = $pdo->query("SHOW COLUMNS FROM pages LIKE 'phone_blur'")->fetch();
if (!$cols) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN phone_blur TINYINT(1) DEFAULT 0");
}
$cols2 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'phone_blur_strength'")->fetch();
if (!$cols2) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN phone_blur_strength INT DEFAULT 3");
}
$cols3 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'phone_border_radius'")->fetch();
if (!$cols3) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN phone_border_radius INT DEFAULT 42");
}
$cols4 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'effects'")->fetch();
if (!$cols4) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN effects JSON");
}
$cols5 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'click_to_enter'")->fetch();
if (!$cols5) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN click_to_enter JSON");
}
$cols6 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'custom_fonts'")->fetch();
if (!$cols6) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN custom_fonts JSON");
}
$cols8 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'discord_widgets'")->fetch();
if (!$cols8) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widgets TINYINT(1) DEFAULT 0");
}
$cols9 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'discord_widget_scale'")->fetch();
if (!$cols9) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_scale DECIMAL(3,2) DEFAULT 1.00");
}
$cols12 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'discord_widget_opacity'")->fetch();
if (!$cols12) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_opacity DECIMAL(3,2) DEFAULT 1.00");
}
$cols13 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'discord_widget_bg_color'")->fetch();
if (!$cols13) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_bg_color VARCHAR(32) DEFAULT '#1a1a1a'");
}
$cols10 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'spotify_widget'")->fetch();
if (!$cols10) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN spotify_widget JSON");
}
$cols11 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'spotify_widget_scale'")->fetch();
if (!$cols11) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN spotify_widget_scale DECIMAL(3,2) DEFAULT 1.00");
}
$cols14 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'discord_widget_tilt'")->fetch();
if (!$cols14) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_tilt TINYINT(1) DEFAULT 0");
}
$cols15 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'spotify_widget_tilt'")->fetch();
if (!$cols15) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN spotify_widget_tilt TINYINT(1) DEFAULT 0");
}
$cols16 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'custom_player'")->fetch();
if (!$cols16) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN custom_player JSON");
}
$cols17 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'custom_player_scale'")->fetch();
if (!$cols17) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN custom_player_scale DECIMAL(3,2) DEFAULT 1.00");
}
$cols18 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'layers'")->fetch();
if (!$cols18) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN layers JSON");
}
$cols19 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'fade_in'")->fetch();
if (!$cols19) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN fade_in TINYINT(1) DEFAULT 0");
}
$cols20 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'visualizer'")->fetch();
if (!$cols20) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN visualizer JSON");
}
$cols21 = $pdo->query("SHOW COLUMNS FROM pages LIKE 'visualizer_scale'")->fetch();
if (!$cols21) {
    $pdo->exec("ALTER TABLE pages ADD COLUMN visualizer_scale DECIMAL(3,2) DEFAULT 1.00");
}

// Ensure layout column is large enough
$layoutCol = $pdo->query("SHOW COLUMNS FROM pages LIKE 'layout'")->fetch();
if ($layoutCol) {
    $colType = strtolower($layoutCol['Type']);
    if (strpos($colType, 'longtext') === false && strpos($colType, 'mediumtext') === false) {
        error_log('save-page: Altering layout column to LONGTEXT (was: ' . $layoutCol['Type'] . ')');
        $pdo->exec("ALTER TABLE pages MODIFY COLUMN layout LONGTEXT");
    }
}

// Ensure custom_objects column is large enough
$customObjectsCol = $pdo->query("SHOW COLUMNS FROM pages LIKE 'custom_objects'")->fetch();
if ($customObjectsCol) {
    $colType = strtolower($customObjectsCol['Type']);
    if (strpos($colType, 'longtext') === false && strpos($colType, 'mediumtext') === false && strpos($colType, 'json') === false) {
        error_log('save-page: Altering custom_objects column to LONGTEXT (was: ' . $customObjectsCol['Type'] . ')');
        $pdo->exec("ALTER TABLE pages MODIFY COLUMN custom_objects LONGTEXT");
    }
}

$stmt = $pdo->prepare('UPDATE pages SET 
    published = ?,
    display_name = ?, display_name_html = ?, bio = ?, bio_html = ?,
    avatar = ?, music_src = ?, music_name = ?, music_gain = ?, music_volume = ?,
    links_enabled = ?, links = ?, bg = ?, bg_image_global = ?, bg_image_phone = ?,
    bg_phone_opacity = ?, deleted_avatar = ?, deleted_name = ?, deleted_bio = ?, deleted_phone = ?,
    btn_style = ?, accent_color = ?, font = ?, name_size = ?, text_manual_size = ?,
    custom_objects = ?, custom_object_counter = ?, animations = ?, effects = ?, phone_frame_image = ?,
    cursor_image = ?, cursor_size = ?, layout = ?,
    phone_blur = ?, phone_blur_strength = ?, phone_border_radius = ?,
    click_to_enter = ?, custom_fonts = ?, cursor_trail = ?, discord_widgets = ?, discord_widget_scale = ?, discord_widget_opacity = ?, discord_widget_bg_color = ?, spotify_widget = ?, spotify_widget_scale = ?, discord_widget_tilt = ?, spotify_widget_tilt = ?, custom_player = ?, custom_player_scale = ?, layers = ?, fade_in = ?, visualizer = ?, visualizer_scale = ?
WHERE user_id = ?');

$stmt->execute([
    $publish ? 1 : 0,
    $pageData['displayName'] ?? '',
    $pageData['displayNameHtml'] ?? '',
    $pageData['bio'] ?? '',
    $pageData['bioHtml'] ?? '',
    $pageData['avatar'] ?? '',
    $pageData['music']['src'] ?? '',
    $pageData['music']['name'] ?? '',
    $pageData['music']['gain'] ?? 1,
    $pageData['music']['volume'] ?? 1,
    isset($pageData['linksEnabled']) && $pageData['linksEnabled'] ? 1 : 0,
    json_encode($pageData['links'] ?? []),
    $pageData['bg'] ?? 'bg-black',
    $pageData['bgImageGlobal'] ?? '',
    $pageData['bgImagePhone'] ?? '',
    $pageData['bgPhoneOpacity'] ?? 1,
    isset($pageData['deleted']['avatar']) && $pageData['deleted']['avatar'] ? 1 : 0,
    isset($pageData['deleted']['name']) && $pageData['deleted']['name'] ? 1 : 0,
    isset($pageData['deleted']['bio']) && $pageData['deleted']['bio'] ? 1 : 0,
    isset($pageData['deleted']['phone']) && $pageData['deleted']['phone'] ? 1 : 0,
    $pageData['btnStyle'] ?? '',
    $pageData['accentColor'] ?? '#d6d6d6',
    $pageData['font'] ?? 'Syne',
    $pageData['nameSize'] ?? 22,
    json_encode($pageData['textManualSize'] ?? []),
    json_encode($pageData['customObjects'] ?? []),
    $pageData['customObjectCounter'] ?? 0,
    json_encode($pageData['animations'] ?? []),
    json_encode($pageData['effects'] ?? []),
    $pageData['phoneFrameImage'] ?? '',
    $pageData['cursorImage'] ?? '',
    $pageData['cursorSize'] ?? 32,
    json_encode($pageData['layout'] ?? []),
    isset($pageData['phoneBlur']) && $pageData['phoneBlur'] ? 1 : 0,
    $pageData['phoneBlurStrength'] ?? 3,
    $pageData['phoneBorderRadius'] ?? 42,
    json_encode($pageData['clickToEnter'] ?? ['enabled' => false, 'text' => 'Click to enter']),
    json_encode($pageData['customFonts'] ?? []),
    json_encode($pageData['cursorTrail'] ?? ['mode' => 'none', 'image' => '', 'config' => new stdClass]),
    ($pageData['discordWidgets'] ?? false) ? 1 : 0,
    $pageData['discordWidgetScale'] ?? 1.00,
    $pageData['discordWidgetOpacity'] ?? 1.00,
    $pageData['discordWidgetBgColor'] ?? '#1a1a1a',
    isset($pageData['spotifyWidget']) && $pageData['spotifyWidget'] ? json_encode($pageData['spotifyWidget']) : null,
    $pageData['spotifyWidgetScale'] ?? 1.00,
    ($pageData['discordWidgetTilt'] ?? false) ? 1 : 0,
    ($pageData['spotifyWidgetTilt'] ?? false) ? 1 : 0,
    isset($pageData['customPlayer']) && $pageData['customPlayer'] ? json_encode($pageData['customPlayer']) : null,
    $pageData['customPlayerScale'] ?? 1.00,
    isset($pageData['layers']) && $pageData['layers'] ? json_encode($pageData['layers']) : null,
    ($pageData['fadeIn'] ?? false) ? 1 : 0,
    isset($pageData['visualizer']) && $pageData['visualizer'] ? json_encode($pageData['visualizer']) : null,
    $pageData['visualizerScale'] ?? 1.00,
    $user['id']
]);

error_log('save-page: layout JSON being saved: ' . json_encode($pageData['layout'] ?? []));
error_log('save-page: layout.phone in array: ' . json_encode($pageData['layout']['phone'] ?? 'NOT SET'));

// Verify what was actually saved
$verifyStmt = $pdo->prepare('SELECT layout FROM pages WHERE user_id = ?');
$verifyStmt->execute([$user['id']]);
$verifyRow = $verifyStmt->fetch(PDO::FETCH_ASSOC);
$verifyLayout = json_decode($verifyRow['layout'] ?? '{}', true);
error_log('save-page: VERIFIED layout.phone after save: ' . json_encode($verifyLayout['phone'] ?? 'NOT SET'));

// Verify custom fonts
$verifyFonts = json_decode($verifyRow['custom_fonts'] ?? '[]', true);
error_log('save-page: VERIFIED customFonts after save: ' . json_encode($verifyFonts));

echo json_encode([
    'success' => true,
    'debug' => [
        'layoutPhone' => $verifyLayout['phone'] ?? 'NOT SET',
        'customFonts' => $verifyFonts
    ]
]);