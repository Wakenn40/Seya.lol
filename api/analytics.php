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
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, username FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$period = $input['period'] ?? '7d';

$now = new DateTime();
$days = 7;
$showMonthly = false;

switch ($period) {
    case '7d':
        $interval = new DateInterval('P7D');
        $days = 7;
        break;
    case '30d':
        $interval = new DateInterval('P30D');
        $days = 30;
        break;
    case '365d':
        $interval = new DateInterval('P365D');
        $days = 365;
        $showMonthly = true;
        break;
    default:
        $interval = new DateInterval('P7D');
}

$since = clone $now;
$since->sub($interval);

try {
    $pageStmt = $pdo->prepare('SELECT views, views_24h, views_month, views_year FROM pages WHERE user_id = ?');
    $pageStmt->execute([$user['id']]);
    $page = $pageStmt->fetch(PDO::FETCH_ASSOC);
    
    $counterTotal = (int)($page['views'] ?? 0);
    $counter24h = (int)($page['views_24h'] ?? 0);
    $counterMonth = (int)($page['views_month'] ?? 0);
    $counterYear = (int)($page['views_year'] ?? 0);

    $totalStmt = $pdo->prepare('SELECT COUNT(*) as total FROM page_views_log WHERE user_id = ? AND viewed_at >= ?');
    $totalStmt->execute([$user['id'], $since->format('Y-m-d H:i:s')]);
    $logTotal = (int)$totalStmt->fetchColumn();

    $visitorsStmt = $pdo->prepare('SELECT COUNT(DISTINCT ip_address) as visitors FROM page_views_log WHERE user_id = ? AND viewed_at >= ? AND ip_address != ""');
    $visitorsStmt->execute([$user['id'], $since->format('Y-m-d H:i:s')]);
    $totalVisitors = (int)$visitorsStmt->fetchColumn();

    if ($period === '7d') {
        $totalViews = $counter24h;
    } elseif ($period === '30d') {
        $totalViews = $counterMonth;
    } elseif ($period === '365d') {
        $totalViews = $counterYear;
    } else {
        $totalViews = $counterTotal;
    }

    $chart = [];
    if ($showMonthly) {
        $chartStmt = $pdo->prepare("
            SELECT DATE_FORMAT(viewed_at, '%Y-%m-01') as date, 
                   DATE_FORMAT(viewed_at, '%b') as dateDisplay, 
                   COUNT(*) as views 
            FROM page_views_log 
            WHERE user_id = ? AND viewed_at >= ?
            GROUP BY DATE_FORMAT(viewed_at, '%Y-%m')
            ORDER BY date ASC
        ");
        $chartStmt->execute([$user['id'], $since->format('Y-m-d H:i:s')]);
        $chartRows = $chartStmt->fetchAll(PDO::FETCH_ASSOC);

        $chartByDate = [];
        foreach ($chartRows as $r) {
            $chartByDate[$r['date']] = $r;
        }
        for ($m = 11; $m >= 0; $m--) {
            $monthDate = strtotime("-{$m} months");
            $key = date('Y-m-01', $monthDate);
            if (isset($chartByDate[$key])) {
                $chart[] = $chartByDate[$key];
            } else {
                $chart[] = [
                    'date' => $key,
                    'dateDisplay' => date('M', $monthDate),
                    'views' => 0
                ];
            }
        }
    } else {
        $chartStmt = $pdo->prepare("
            SELECT DATE(viewed_at) as date, 
                   DATE_FORMAT(viewed_at, '%d') as dateDisplay, 
                   COUNT(*) as views 
            FROM page_views_log 
            WHERE user_id = ? AND viewed_at >= ?
            GROUP BY DATE(viewed_at)
            ORDER BY date ASC
        ");
        $chartStmt->execute([$user['id'], $since->format('Y-m-d H:i:s')]);
        $chartRows = $chartStmt->fetchAll(PDO::FETCH_ASSOC);

        $chartByDate = [];
        foreach ($chartRows as $r) {
            $chartByDate[$r['date']] = $r;
        }
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            if (isset($chartByDate[$date])) {
                $chart[] = $chartByDate[$date];
            } else {
                $chart[] = [
                    'date' => $date,
                    'dateDisplay' => date('d', strtotime("-{$i} days")),
                    'views' => 0
                ];
            }
        }
    }

    $bestDay = 0;
    $bestDayDate = '—';
    foreach ($chart as $point) {
        if ($point['views'] > $bestDay) {
            $bestDay = $point['views'];
            $bestDayDate = $point['date'];
        }
    }

    $avgDaily = $days > 0 ? round($totalViews / $days, 1) : 0;

    echo json_encode([
        'totalViews' => $totalViews,
        'avgDaily' => $avgDaily,
        'bestDay' => $bestDay,
        'bestDayDate' => $bestDayDate,
        'totalVisitors' => $totalVisitors,
        'views24h' => $counter24h,
        'chart' => $chart,
        'period' => $period,
        'days' => $days,
        'showMonthly' => $showMonthly,
        'counterTotal' => $counterTotal
    ]);
} catch (Exception $e) {
    error_log('analytics.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load analytics']);
}
