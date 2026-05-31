<?php

// API routing via index.php (nginx fallback — all unknown routes go here)
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
if (preg_match('#^/api/([a-z-]+)(?:\?(.*))?$#', $requestUri, $m)) {
    $action = $m[1];
    if (!empty($m[2])) {
        parse_str($m[2], $qp);
        $_GET = array_merge($_GET, $qp);
        $_REQUEST = array_merge($_REQUEST, $qp);
    }
    require_once __DIR__ . '/config.php';
    $apiFile = __DIR__ . '/api/' . $action . '.php';
    if (file_exists($apiFile)) {
        require $apiFile;
    } else {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'API endpoint not found: ' . $action]);
    }
    exit;
}

$path = $_GET['username'] ?? '';
$authParam = $_GET['auth'] ?? '';

// API URL rewrite snippet — patches fetch/sendBeacon for nginx where /api/ returns 404
$apiRewrite = '<script>
(function(){'."
var f=window.fetch;window.fetch=function(u,o){if(typeof u=='string'&&u.startsWith('/api/')&&!u.startsWith('/api.php')){u='/api.php?action='+u.substring(5).replace('?','&')}return f.call(this,u,o)};
var s=navigator.sendBeacon;if(s){navigator.sendBeacon=function(u,d){if(typeof u=='string'&&u.startsWith('/api/')&&!u.startsWith('/api.php')){u='/api.php?action='+u.substring(5).replace('?','&')}return s.call(this,u,d)}}
".'}());</script>';

function injectApiRewrite($html, $rewrite) {
    return str_replace('<script src="app.js">', $rewrite . '<script src="app.js">', $html);
}

// Reserved page routes
$reservedPages = ['auth', 'dashboard', 'builder', 'hub'];

if ($path && preg_match('/^[a-z0-9_.]+$/', $path)) {
    // Reserved pages (auth, dashboard, builder, hub)
    if (in_array($path, $reservedPages)) {
        $htmlFile = __DIR__ . '/' . $path . '.html';
        if ($path === 'hub') {
            // Hub is part of landing; redirect to landing with leaderboard
            header('Location: /');
            exit;
        }
        if (file_exists($htmlFile)) {
            echo injectApiRewrite(file_get_contents($htmlFile), $apiRewrite) . '<script>window.__AUTH_PARAM__ = "' . htmlspecialchars($authParam) . '";</script>';
        } else {
            echo injectApiRewrite(file_get_contents(__DIR__ . '/index.html'), $apiRewrite) . '<script>window.__AUTH_PARAM__ = "' . htmlspecialchars($authParam) . '";</script>';
        }
        exit;
    }

    require_once 'config.php';

    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN phone_blur TINYINT(1) DEFAULT 0");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN phone_blur_strength INT DEFAULT 3");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN phone_border_radius INT DEFAULT 42");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN click_to_enter JSON");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN fade_in TINYINT(1) DEFAULT 0");
    } catch (Exception $e) {}
    
    try {
        $pdo->exec("ALTER TABLE pages MODIFY COLUMN layout LONGTEXT");
    } catch (Exception $e) {}
    
    try {
        $pdo->exec("ALTER TABLE pages MODIFY COLUMN custom_objects LONGTEXT");
    } catch (Exception $e) {}
    
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN custom_fonts JSON");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN cursor_trail JSON");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widgets TINYINT(1) DEFAULT 0");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_scale DECIMAL(3,2) DEFAULT 1.00");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_opacity DECIMAL(3,2) DEFAULT 1.00");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widget_bg_color VARCHAR(32) DEFAULT '#1a1a1a'");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN spotify_widget JSON");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN spotify_widget_scale DECIMAL(3,2) DEFAULT 1.00");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN custom_player JSON");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN custom_player_scale DECIMAL(3,2) DEFAULT 1.00");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE pages ADD COLUMN layers JSON");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT NULL");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 0");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN email_code VARCHAR(6) DEFAULT NULL");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN email_code_expires INT DEFAULT 0");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64) DEFAULT NULL");
    } catch (Exception $e) {}

    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS user_aliases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            alias VARCHAR(50) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {}

    $stmt = $pdo->prepare('SELECT u.username, p.* FROM users u JOIN pages p ON u.id = p.user_id WHERE u.username = ?');
    $stmt->execute([$path]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        $stmt = $pdo->prepare('SELECT u.username, p.* FROM users u JOIN pages p ON u.id = p.user_id JOIN user_aliases a ON u.id = a.user_id WHERE a.alias = ?');
        $stmt->execute([$path]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if ($row) {
        $decodedLayout = json_decode($row['layout'] ?: '{}', true);
        
        $premium = false;
        try {
            $pStmt = $pdo->prepare("SELECT 1 FROM premium_users WHERE user_id = ? AND activated = 1");
            $pStmt->execute([$row['user_id']]);
            $premium = (bool)$pStmt->fetchColumn();
        } catch (Exception $e) {}
        
        $pageData = json_encode([
            'displayName' => $row['display_name'] ?: '@' . $path,
            'displayNameHtml' => $row['display_name_html'] ?: '@' . htmlspecialchars($path),
            'bio' => $row['bio'] ?: '',
            'bioHtml' => $row['bio_html'] ?: '',
            'avatar' => $row['avatar'] ?: '',
            'bg' => $row['bg'] ?: 'bg-black',
            'bgImageGlobal' => $row['bg_image_global'] ?: '',
            'bgImagePhone' => $row['bg_image_phone'] ?: '',
            'accentColor' => $row['accent_color'] ?: '#d6d6d6',
            'font' => $row['font'] ?: 'Syne',
            'nameSize' => (int)($row['name_size'] ?: 22),
            'linksEnabled' => (bool)($row['links_enabled'] ?? false),
            'links' => json_decode($row['links'] ?: '[]', true),
            'customObjects' => json_decode($row['custom_objects'] ?: '[]', true),
            'customFonts' => json_decode($row['custom_fonts'] ?: '[]', true),
            'layout' => json_decode($row['layout'] ?: '{}', true),
            'animations' => json_decode($row['animations'] ?: '[]', true),
            'effects' => json_decode($row['effects'] ?: '[]', true),
            'music' => [
                'src' => $row['music_src'] ?: '',
                'name' => $row['music_name'] ?: '',
                'gain' => (float)($row['music_gain'] ?: 1),
                'volume' => (float)($row['music_volume'] ?: 1)
            ],
            'phoneFrameImage' => $row['phone_frame_image'] ?: '',
            'phoneBlur' => (bool)($row['phone_blur'] ?? false),
            'phoneBlurStrength' => (int)($row['phone_blur_strength'] ?: 3),
            'phoneBorderRadius' => (int)($row['phone_border_radius'] ?: 42),
            'premium' => $premium,
            'bgPhoneOpacity' => (float)($row['bg_phone_opacity'] ?: 1),
            'cursorImage' => $row['cursor_image'] ?: '',
            'cursorSize' => (int)($row['cursor_size'] ?: 32),
            'cursorTrail' => $row['cursor_trail'] ? json_decode($row['cursor_trail'], true) : ['mode' => 'none', 'image' => '', 'config' => new stdClass],
            'clickToEnter' => $row['click_to_enter'] ? json_decode($row['click_to_enter'], true) : ['enabled' => false, 'text' => 'Click to enter'],
            'customFonts' => $row['custom_fonts'] ? json_decode($row['custom_fonts'], true) : [],
            'deleted' => [
                'avatar' => (bool)($row['deleted_avatar'] ?? false),
                'name' => (bool)($row['deleted_name'] ?? false),
                'bio' => (bool)($row['deleted_bio'] ?? false),
                'phone' => (bool)($row['deleted_phone'] ?? false)
            ],
            'discordWidgets' => (bool)($row['discord_widgets'] ?? false),
            'discordWidgetScale' => (float)($row['discord_widget_scale'] ?? 1),
            'discordWidgetOpacity' => (float)($row['discord_widget_opacity'] ?? 1),
            'discordWidgetBgColor' => $row['discord_widget_bg_color'] ?? '#1a1a1a',
            'spotifyWidget' => $row['spotify_widget'] ? json_decode($row['spotify_widget'], true) : null,
            'spotifyWidgetScale' => (float)($row['spotify_widget_scale'] ?? 1),
            'customPlayer' => $row['custom_player'] ? json_decode($row['custom_player'], true) : null,
            'customPlayerScale' => (float)($row['custom_player_scale'] ?? 1),
            'layers' => $row['layers'] ? json_decode($row['layers'], true) : null,
            'fadeIn' => (bool)($row['fade_in'] ?? false),
            'discord' => [
                'id' => $row['discord_id'] ?? '',
                'username' => $row['discord_username'] ?? '',
                'avatar' => $row['discord_avatar'] ?? '',
                'discriminator' => $row['discord_discriminator'] ?? '0',
                'public_flags' => (int)($row['discord_public_flags'] ?? 0),
                'premium_type' => (int)($row['discord_premium_type'] ?? 0)
            ]
        ]);

        $html = file_get_contents(__DIR__ . '/public.html');
        $script = '<script>window.__PAGE_DATA__ = ' . $pageData . ';window.__PUBLIC_USER__ = "' . htmlspecialchars($path) . '";window.__AUTH_PARAM__ = "' . htmlspecialchars($authParam) . '";</script>';
        $html = str_replace('</body>', $script . '</body>', $html);

        try {
            $dbName = $pdo->query("SELECT DATABASE()")->fetchColumn();
            $stmt = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$dbName' AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'views_24h'");
            $hasRangeCols = $stmt->fetch() !== false;
            
            $currentHour = (int)date('G');
            $currentDay = (int)date('j');
            $currentMonth = (int)date('n');
            
            $pageData = $pdo->prepare('SELECT last_reset_24h, last_reset_month, last_reset_year FROM pages WHERE user_id = ?');
            $pageData->execute([$row['user_id']]);
            $lastResets = $pageData->fetch(PDO::FETCH_ASSOC);
            
            $updates = ['views = COALESCE(views, 0) + 1'];
            $params = [];
            
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
            error_log('Failed to increment views: ' . $e->getMessage());
        }

        try {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
            $logStmt = $pdo->prepare('INSERT INTO page_views_log (user_id, viewed_at, ip_address, user_agent) VALUES (?, NOW(), ?, ?)');
            $logStmt->execute([$row['user_id'], $ip, $ua]);
        } catch (Exception $e) {
            error_log('Failed to log page view: ' . $e->getMessage());
        }

        echo injectApiRewrite($html, $apiRewrite);
        exit;
    }
}

echo injectApiRewrite(file_get_contents(__DIR__ . '/index.html'), $apiRewrite) . '<script>window.__AUTH_PARAM__ = "' . htmlspecialchars($authParam) . '";</script>';
