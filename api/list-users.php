<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

$range = $_GET['range'] ?? 'all';

try {
    $dbName = $pdo->query("SELECT DATABASE()")->fetchColumn();
    $checkCols = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$dbName' AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'views_24h'")->fetch();
    $hasRangeCols = $checkCols !== false;

    $currentHour = (int)date('G');
    $currentDay = (int)date('j');
    $currentMonth = (int)date('n');

    if ($hasRangeCols) {
        $pdo->prepare("UPDATE pages SET views_24h = 0, last_reset_24h = ? WHERE last_reset_24h != ? AND last_reset_24h != 0")->execute([$currentHour, $currentHour]);
        $pdo->prepare("UPDATE pages SET views_month = 0, last_reset_month = ? WHERE last_reset_month != ? AND last_reset_month != 0")->execute([$currentDay, $currentDay]);
        $pdo->prepare("UPDATE pages SET views_year = 0, last_reset_year = ? WHERE last_reset_year != ? AND last_reset_year != 0")->execute([$currentMonth, $currentMonth]);
    }

    if ($range === '24h' && $hasRangeCols) {
        $sql = "SELECT u.username, p.display_name, p.avatar, p.bio, p.published, COALESCE(p.views_24h, 0) as views, p.last_reset_24h 
                FROM users u 
                JOIN pages p ON u.id = p.user_id 
                WHERE p.published = 1 AND p.display_name IS NOT NULL AND p.display_name != '' 
                ORDER BY COALESCE(p.views_24h, 0) DESC 
                LIMIT 50";
        $stmt = $pdo->query($sql);
    } elseif ($range === 'month' && $hasRangeCols) {
        $sql = "SELECT u.username, p.display_name, p.avatar, p.bio, p.published, COALESCE(p.views_month, 0) as views, p.last_reset_month 
                FROM users u 
                JOIN pages p ON u.id = p.user_id 
                WHERE p.published = 1 AND p.display_name IS NOT NULL AND p.display_name != '' 
                ORDER BY COALESCE(p.views_month, 0) DESC 
                LIMIT 50";
        $stmt = $pdo->query($sql);
    } elseif ($range === 'year' && $hasRangeCols) {
        $sql = "SELECT u.username, p.display_name, p.avatar, p.bio, p.published, COALESCE(p.views_year, 0) as views, p.last_reset_year 
                FROM users u 
                JOIN pages p ON u.id = p.user_id 
                WHERE p.published = 1 AND p.display_name IS NOT NULL AND p.display_name != '' 
                ORDER BY COALESCE(p.views_year, 0) DESC 
                LIMIT 50";
        $stmt = $pdo->query($sql);
    } else {
        $sql = "SELECT u.username, p.display_name, p.avatar, p.bio, p.published, COALESCE(p.views, 0) as views 
                FROM users u 
                JOIN pages p ON u.id = p.user_id 
                WHERE p.published = 1 AND p.display_name IS NOT NULL AND p.display_name != '' 
                ORDER BY COALESCE(p.views, 0) DESC 
                LIMIT 50";
        $stmt = $pdo->query($sql);
    }
    
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $users = array_map(function($row) {
        return [
            'username' => $row['username'],
            'displayName' => $row['display_name'] ?: '@' . $row['username'],
            'avatar' => $row['avatar'] ?: '/default_pfp.png',
            'bio' => $row['bio'] ?: '',
            'views' => (int)$row['views'],
            'url' => '/' . $row['username']
        ];
    }, $rows);

    echo json_encode(['users' => $users, 'range' => $range, 'hasRangeCols' => $hasRangeCols]);
} catch (Exception $e) {
    error_log('list-users.php error: ' . $e->getMessage());
    http_response_code(200);
    echo json_encode(['users' => [], 'error' => $e->getMessage()]);
}