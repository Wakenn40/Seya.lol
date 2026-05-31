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
} catch (PDOException $e) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}

$tokenFromQuery = $_GET['token'] ?? '';

if (!empty($tokenFromQuery)) {
    $token = $tokenFromQuery;
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

    if (!preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        ob_clean();
        echo json_encode(['success' => false, 'error' => 'Not authorized']);
        exit;
    }

    $token = $matches[1];
}
$stmt = $pdo->prepare('SELECT id FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Invalid token']);
    exit;
}

try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_widgets TINYINT(1) DEFAULT 0"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_access_token TEXT DEFAULT NULL"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_refresh_token TEXT DEFAULT NULL"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_token_expires INT DEFAULT 0"); } catch (PDOException $e) {}
$stmt = $pdo->prepare('UPDATE pages SET discord_id = "", discord_username = "", discord_avatar = "", discord_discriminator = "0", discord_public_flags = 0, discord_premium_type = 0, discord_widgets = 0, discord_access_token = NULL, discord_refresh_token = NULL, discord_token_expires = 0 WHERE user_id = ?');
$stmt->execute([$user['id']]);

ob_clean();
echo json_encode(['success' => true]);
