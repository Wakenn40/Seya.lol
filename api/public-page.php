<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

ob_start();
ini_set('display_errors', '0');

$db_config = [
    'host' => 'localhost',
    'port' => 3306,
    'user' => 'u3516713_default',
    'password' => 'opy5C41C45P7c3W2',
    'database' => 'u3516713_default'
];

try {
    $pdo = new PDO(
        "mysql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['database']}",
        $db_config['user'],
        $db_config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    ob_clean();
echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$username = $_GET['user'] ?? '';

if (!$username || !preg_match('/^[a-z0-9_.]+$/', $username)) {
    http_response_code(400);
    ob_clean();
echo json_encode(['error' => 'Invalid username']);
    exit;
}

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
    $pdo->exec("ALTER TABLE pages ADD COLUMN click_to_enter JSON");
} catch (PDOException $e) {}

try {
    $pdo->exec("ALTER TABLE pages MODIFY COLUMN layout LONGTEXT");
} catch (PDOException $e) {}

try {
    $pdo->exec("ALTER TABLE pages MODIFY COLUMN custom_objects LONGTEXT");
} catch (PDOException $e) {}

try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN custom_fonts JSON");
} catch (PDOException $e) {}

try {
    $pdo->exec("ALTER TABLE pages ADD COLUMN cursor_trail JSON");
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widgets TINYINT(1) DEFAULT 0");
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
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_public_flags INT DEFAULT 0");
    } catch (PDOException $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_premium_type INT DEFAULT 0");
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
} catch (PDOException $e) {}

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_aliases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        alias VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} catch (PDOException $e) {}

$stmt = $pdo->prepare('SELECT u.username, p.* FROM users u JOIN pages p ON u.id = p.user_id WHERE u.username = ?');
$stmt->execute([$username]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    $stmt = $pdo->prepare('SELECT u.username, p.* FROM users u JOIN pages p ON u.id = p.user_id JOIN user_aliases a ON u.id = a.user_id WHERE a.alias = ?');
    $stmt->execute([$username]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
}

if (!$row) {
    ob_clean();
echo json_encode(['found' => false]);
    exit;
}

$hasContent = !empty($row['display_name']) && $row['display_name'] !== '@' . $username;

if (!$row['published'] || !$hasContent) {
    ob_clean();
echo json_encode([
        'found' => true,
        'published' => false,
        'message' => 'Page not found or not published'
    ]);
    exit;
}

try {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    $currentHour = (int)date('G');
    $currentDay = (int)date('j');
    $currentMonth = (int)date('n');
    
    $existingStmt = $pdo->prepare('SELECT last_reset_24h, last_reset_month, last_reset_year FROM pages WHERE user_id = ?');
    $existingStmt->execute([$row['user_id']]);
    $lastResets = $existingStmt->fetch(PDO::FETCH_ASSOC);
    
    $updates = ['views = COALESCE(views, 0) + 1'];
    $params = [];
    
    try {
        $dbName = $pdo->query("SELECT DATABASE()")->fetchColumn();
        $checkCols = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$dbName' AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'views_24h'")->fetch();
        $hasRangeCols = $checkCols !== false;
    } catch (Exception $e) {
        $hasRangeCols = false;
    }
    
    if ($hasRangeCols) {
        if (!$lastResets || $lastResets['last_reset_24h'] != $currentHour) {
            $updates[] = 'views_24h = 1';
            $updates[] = 'last_reset_24h = ?';
            $params[] = $currentHour;
        } else {
            $updates[] = 'views_24h = COALESCE(views_24h, 0) + 1';
        }
        
        if (!$lastResets || $lastResets['last_reset_month'] != $currentDay) {
            $updates[] = 'views_month = 1';
            $updates[] = 'last_reset_month = ?';
            $params[] = $currentDay;
        } else {
            $updates[] = 'views_month = COALESCE(views_month, 0) + 1';
        }
        
        if (!$lastResets || $lastResets['last_reset_year'] != $currentMonth) {
            $updates[] = 'views_year = 1';
            $updates[] = 'last_reset_year = ?';
            $params[] = $currentMonth;
        } else {
            $updates[] = 'views_year = COALESCE(views_year, 0) + 1';
        }
    }
    
    $params[] = $row['user_id'];
    $incStmt = $pdo->prepare('UPDATE pages SET ' . implode(', ', $updates) . ' WHERE user_id = ?');
    $incStmt->execute($params);
} catch (Exception $e) {
    error_log('Failed to increment views in public-page: ' . $e->getMessage());
}

try {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $logStmt = $pdo->prepare('INSERT INTO page_views_log (user_id, viewed_at, ip_address, user_agent) VALUES (?, NOW(), ?, ?)');
    $logStmt->execute([$row['user_id'], $ip, $ua]);
} catch (Exception $e) {
    error_log('Failed to log page view in public-page: ' . $e->getMessage());
}

$premium = false;
$stmt = $pdo->prepare("SELECT 1 FROM premium_users WHERE user_id = ? AND activated = 1");
$stmt->execute([$row['user_id']]);
$premium = (bool)$stmt->fetchColumn();

ob_clean();
echo json_encode([
    'found' => true,
    'published' => true,
    'pageData' => [
        'premium' => $premium,
        'displayName' => $row['display_name'],
        'displayNameHtml' => $row['display_name_html'],
        'bio' => $row['bio'],
        'bioHtml' => $row['bio_html'],
        'avatar' => $row['avatar'],
        'music' => [
            'src' => $row['music_src'],
            'name' => $row['music_name'],
            'gain' => (float)$row['music_gain'],
            'volume' => (float)$row['music_volume']
        ],
        'linksEnabled' => (bool)$row['links_enabled'],
        'links' => json_decode($row['links'] ?: '[]', true),
        'bg' => $row['bg'],
        'bgImageGlobal' => $row['bg_image_global'],
        'bgImagePhone' => $row['bg_image_phone'],
        'bgPhoneOpacity' => (float)$row['bg_phone_opacity'],
        'deleted' => [
            'avatar' => (bool)$row['deleted_avatar'],
            'name' => (bool)$row['deleted_name'],
            'bio' => (bool)$row['deleted_bio'],
            'phone' => (bool)$row['deleted_phone']
        ],
        'btnStyle' => $row['btn_style'],
        'accentColor' => $row['accent_color'],
        'font' => $row['font'],
        'nameSize' => (int)$row['name_size'],
        'textManualSize' => json_decode($row['text_manual_size'] ?: '{}', true),
        'customObjects' => json_decode($row['custom_objects'] ?: '[]', true),
        'customObjectCounter' => (int)$row['custom_object_counter'],
        'animations' => json_decode($row['animations'] ?: '[]', true),
        'effects' => json_decode($row['effects'] ?: '{}', true),
        'phoneFrameImage' => $row['phone_frame_image'],
        'phoneBlur' => (bool)$row['phone_blur'],
        'phoneBlurStrength' => (int)$row['phone_blur_strength'],
        'phoneBorderRadius' => (int)$row['phone_border_radius'],
        'cursorImage' => $row['cursor_image'],
        'cursorSize' => (int)$row['cursor_size'],
        'cursorTrail' => $row['cursor_trail'] ? json_decode($row['cursor_trail'], true) : ['mode' => 'none', 'image' => '', 'config' => new stdClass],
        'clickToEnter' => $row['click_to_enter'] ? json_decode($row['click_to_enter'], true) : ['enabled' => false, 'text' => 'Click to enter'],
        'customFonts' => $row['custom_fonts'] ? json_decode($row['custom_fonts'], true) : [],
        'discordWidgets' => (bool)($row['discord_widgets'] ?? false),
        'discordWidgetScale' => (float)($row['discord_widget_scale'] ?? 1),
        'discordWidgetOpacity' => (float)($row['discord_widget_opacity'] ?? 1),
        'discordWidgetBgColor' => $row['discord_widget_bg_color'] ?? '#1a1a1a',
        'discordWidgetTilt' => (bool)($row['discord_widget_tilt'] ?? false),
        'spotifyWidget' => $row['spotify_widget'] ? json_decode($row['spotify_widget'], true) : null,
        'spotifyWidgetScale' => (float)($row['spotify_widget_scale'] ?? 1),
        'spotifyWidgetTilt' => (bool)($row['spotify_widget_tilt'] ?? false),
        'customPlayer' => $row['custom_player'] ? json_decode($row['custom_player'], true) : null,
        'customPlayerScale' => (float)($row['custom_player_scale'] ?? 1),
        'layers' => $row['layers'] ? json_decode($row['layers'], true) : null,
        'fadeIn' => (bool)($row['fade_in'] ?? false),
        'visualizer' => $row['visualizer'] ? json_decode($row['visualizer'], true) : null,
        'visualizerScale' => (float)($row['visualizer_scale'] ?? 1),
        'layout' => json_decode($row['layout'] ?: '{}', true),
        'discord' => [
            'id' => $row['discord_id'] ?? '',
            'username' => $row['discord_username'] ?? '',
            'avatar' => $row['discord_avatar'] ?? '',
            'discriminator' => $row['discord_discriminator'] ?? '0',
            'public_flags' => (int)($row['discord_public_flags'] ?? 0),
            'premium_type' => (int)($row['discord_premium_type'] ?? 0)
        ]
    ]
]);