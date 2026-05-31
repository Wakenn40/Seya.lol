<?php
ob_start();

define('CRYPTOBOT_API_KEY', '589559:AA7HCv6EFNClxj5NtbVXmY6enrQqj1n5U4e');
define('SITE_URL', 'https://seya.lol');

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

    $pdo->exec("CREATE TABLE IF NOT EXISTS templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        tags JSON,
        description TEXT DEFAULT '',
        page_data JSON NOT NULL,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS user_aliases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        alias VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS page_views_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        viewed_at DATETIME NOT NULL,
        ip_address VARCHAR(45) DEFAULT '',
        user_agent TEXT DEFAULT '',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_time (user_id, viewed_at),
        INDEX idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS link_clicks_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        link_url VARCHAR(2048) NOT NULL,
        link_title VARCHAR(255) DEFAULT '',
        clicked_at DATETIME NOT NULL,
        ip_address VARCHAR(45) DEFAULT '',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_user_time (user_id, clicked_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $extraCols = ['views_24h', 'views_month', 'views_year', 'last_reset_24h', 'last_reset_month', 'last_reset_year'];
    foreach ($extraCols as $col) {
        try {
            $pdo->exec("ALTER TABLE pages ADD COLUMN {$col} INT DEFAULT 0");
        } catch (PDOException $e) {
        }
    }
    
    $phoneCols = ['phone_blur', 'phone_blur_strength', 'phone_border_radius'];
    foreach ($phoneCols as $col) {
        try {
            if ($col === 'phone_blur') {
                $pdo->exec("ALTER TABLE pages ADD COLUMN {$col} TINYINT(1) DEFAULT 0");
            } elseif ($col === 'phone_blur_strength') {
                $pdo->exec("ALTER TABLE pages ADD COLUMN {$col} INT DEFAULT 3");
            } else {
                $pdo->exec("ALTER TABLE pages ADD COLUMN {$col} INT DEFAULT 42");
            }
        } catch (PDOException $e) {
        }
    }

    $missingCols = [
        'deleted_avatar' => "ALTER TABLE pages ADD COLUMN deleted_avatar TINYINT(1) DEFAULT 0",
        'custom_fonts' => "ALTER TABLE pages ADD COLUMN custom_fonts JSON",
        'cursor_trail' => "ALTER TABLE pages ADD COLUMN cursor_trail JSON",
        'discord_widgets' => "ALTER TABLE pages ADD COLUMN discord_widgets TINYINT(1) DEFAULT 0",
        'discord_widget_scale' => "ALTER TABLE pages ADD COLUMN discord_widget_scale DECIMAL(5,3) DEFAULT 1.00",
        'discord_widget_opacity' => "ALTER TABLE pages ADD COLUMN discord_widget_opacity DECIMAL(5,3) DEFAULT 1.00",
        'discord_widget_bg_color' => "ALTER TABLE pages ADD COLUMN discord_widget_bg_color VARCHAR(20) DEFAULT '#1a1a1a'",
        'spotify_widget' => "ALTER TABLE pages ADD COLUMN spotify_widget JSON",
        'spotify_widget_scale' => "ALTER TABLE pages ADD COLUMN spotify_widget_scale DECIMAL(5,3) DEFAULT 1.00",
        'discord_widget_tilt' => "ALTER TABLE pages ADD COLUMN discord_widget_tilt TINYINT(1) DEFAULT 0",
        'spotify_widget_tilt' => "ALTER TABLE pages ADD COLUMN spotify_widget_tilt TINYINT(1) DEFAULT 0",
        'custom_player' => "ALTER TABLE pages ADD COLUMN custom_player JSON",
        'custom_player_scale' => "ALTER TABLE pages ADD COLUMN custom_player_scale DECIMAL(5,3) DEFAULT 1.00",
        'layers' => "ALTER TABLE pages ADD COLUMN layers JSON",
        'fade_in' => "ALTER TABLE pages ADD COLUMN fade_in TINYINT(1) DEFAULT 0",
        'effects' => "ALTER TABLE pages ADD COLUMN effects JSON",
    ];
    foreach ($missingCols as $col => $sql) {
        try {
            $pdo->exec($sql);
        } catch (PDOException $e) {
        }
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS premium_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        invoice_id BIGINT DEFAULT NULL,
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activated TINYINT(1) DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $hour = (int)date('G');
    $dayOfMonth = (int)date('j');
    $month = (int)date('n');

    $pdo->prepare("UPDATE pages SET views_24h = 0, last_reset_24h = ? WHERE last_reset_24h != ?")->execute([$hour, $hour]);
    $pdo->prepare("UPDATE pages SET views_month = 0, last_reset_month = ? WHERE last_reset_month != ?")->execute([$dayOfMonth, $dayOfMonth]);
    $pdo->prepare("UPDATE pages SET views_year = 0, last_reset_year = ? WHERE last_reset_year != ?")->execute([$month, $month]);
} catch (PDOException $e) {
    error_log('DB connection failed: ' . $e->getMessage());
    ob_end_clean();
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

ob_end_clean();

function generateToken() {
    return bin2hex(random_bytes(32));
}

function getUserFromToken(PDO $pdo): ?array {
    $token = getBearerToken();
    if (!$token) {
        $token = $_GET['token'] ?? $_GET['auth'] ?? '';
    }
    if (empty($token)) return null;
    $stmt = $pdo->prepare('SELECT id, username FROM users WHERE token = ?');
    $stmt->execute([$token]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Проверка: имеет ли пользователь премиум?
 * Используй это в любом API-эндпоинте для гейтинга фич.
 *
 * Пример:
 *   if (!isPremium($pdo, $userId)) {
 *       http_response_code(403);
 *       echo json_encode(['error' => 'Premium required']);
 *       exit;
 *   }
 */
function isPremium(PDO $pdo, int $userId): bool {
    $stmt = $pdo->prepare("SELECT 1 FROM premium_users WHERE user_id = ? AND activated = 1");
    $stmt->execute([$userId]);
    return (bool)$stmt->fetchColumn();
}

/**
 * Принудительная проверка премиума. Если нет — 403 и exit.
 */
function requirePremium(PDO $pdo, int $userId): void {
    if (!isPremium($pdo, $userId)) {
        http_response_code(403);
        echo json_encode(['error' => 'Premium required for this feature']);
        exit;
    }
}

function getBearerToken() {
    $headers = getallheaders();
    if ($headers === false) {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $headers[str_replace('_', '-', substr($key, 5))] = $value;
            }
        }
    }
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        return $matches[1];
    }
    return null;
}
