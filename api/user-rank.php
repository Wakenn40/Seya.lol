<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

$username = $_GET['user'] ?? '';

if (!$username || !preg_match('/^[a-z0-9_.]+$/', $username)) {
    echo json_encode(['rank' => null, 'error' => 'Invalid username']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT u.username, COALESCE(p.views, 0) as views
        FROM users u
        JOIN pages p ON u.id = p.user_id
        WHERE p.published = 1 AND p.display_name IS NOT NULL AND p.display_name != ''
        ORDER BY COALESCE(p.views, 0) DESC");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $rank = null;
    foreach ($rows as $i => $row) {
        if (strtolower($row['username']) === strtolower($username)) {
            $rank = $i + 1;
            break;
        }
    }

    echo json_encode([
        'rank' => $rank,
        'username' => $username,
        'total' => count($rows)
    ]);
} catch (Exception $e) {
    error_log('user-rank.php error: ' . $e->getMessage());
    echo json_encode(['rank' => null, 'error' => $e->getMessage()]);
}
