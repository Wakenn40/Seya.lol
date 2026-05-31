<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

ob_start();
ini_set('display_errors', '0');

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
    ob_clean();
echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$tokenFromQuery = $_GET['token'] ?? '';
if (!empty($tokenFromQuery)) {
    $token = $tokenFromQuery;
} else {
    $auth = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['Authorization'])) {
        $auth = $_SERVER['Authorization'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
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
    $token = '';
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        $token = $matches[1];
    }
}
if (!$token) {
    http_response_code(401);
    ob_clean();
echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, username FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    ob_clean();
echo json_encode(['error' => 'Invalid token']);
    exit;
}

// Premium required for link analytics
$pStmt = $pdo->prepare("SELECT 1 FROM premium_users WHERE user_id = ? AND activated = 1");
$pStmt->execute([$user['id']]);
if (!$pStmt->fetchColumn()) {
    http_response_code(403);
    ob_clean();
echo json_encode(['error' => 'Link analytics require premium subscription', 'premium_required' => true]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$period = $input['period'] ?? '7d';

try {
    $whereClause = '';
    $params = [$user['id']];

    if ($period === '24h') {
        $whereClause = 'AND clicked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
    } elseif ($period === '7d') {
        $whereClause = 'AND clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } elseif ($period === '30d') {
        $whereClause = 'AND clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } elseif ($period === '365d') {
        $whereClause = 'AND clicked_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)';
    }

    $statsStmt = $pdo->prepare("
        SELECT link_url, link_title, COUNT(*) as clicks
        FROM link_clicks_log
        WHERE user_id = ? $whereClause
        GROUP BY link_url, link_title
        ORDER BY clicks DESC
    ");
    $statsStmt->execute($params);
    $clickRows = $statsStmt->fetchAll(PDO::FETCH_ASSOC);

    $linksStmt = $pdo->prepare('SELECT links FROM pages WHERE user_id = ?');
    $linksStmt->execute([$user['id']]);
    $linksJson = $linksStmt->fetchColumn();
    $definedLinks = $linksJson ? json_decode($linksJson, true) : [];

    $clickByUrl = [];
    foreach ($clickRows as $r) {
        $clickByUrl[$r['link_url']] = (int)$r['clicks'];
    }

    $links = [];
    foreach ($definedLinks as $link) {
        $url = $link['url'] ?? '';
        $label = $link['label'] ?? '';
        $emoji = $link['emoji'] ?? '';
        $style = $link['style'] ?? '';
        $icon = $link['icon'] ?? '';
        $color = $link['color'] ?? '';
        $glow = $link['glow'] ?? false;
        $type = $link['type'] ?? '';
        $clicks = $clickByUrl[$url] ?? 0;
        $links[] = [
            'url' => $url,
            'title' => $label,
            'emoji' => $emoji,
            'style' => $style,
            'icon' => $icon,
            'color' => $color,
            'glow' => $glow,
            'type' => $type,
            'clicks' => $clicks
        ];
    }

    foreach ($clickRows as $r) {
        $found = false;
        foreach ($links as $l) {
            if ($l['url'] === $r['link_url']) {
                $found = true;
                break;
            }
        }
        if (!$found) {
            $links[] = [
                'url' => $r['link_url'],
                'title' => $r['link_title'],
                'emoji' => '',
                'style' => '',
                'icon' => '',
                'color' => '',
                'glow' => false,
                'type' => '',
                'clicks' => (int)$r['clicks']
            ];
        }
    }

    usort($links, function ($a, $b) {
        return $b['clicks'] - $a['clicks'];
    });

    $totalClicks = array_sum(array_column($links, 'clicks'));

    ob_clean();
echo json_encode([
        'success' => true,
        'links' => $links,
        'totalClicks' => $totalClicks,
        'period' => $period
    ]);
} catch (Exception $e) {
    error_log('link-stats.php error: ' . $e->getMessage());
    http_response_code(500);
    ob_clean();
echo json_encode(['error' => 'Failed to load link stats']);
}
