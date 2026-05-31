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
        "mysql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['database']}",
        $db_config['user'],
        $db_config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$headers = getallheaders();
$token = $headers['Authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');

if (!$token) {
    http_response_code(401);
    echo json_encode(['error' => 'No token provided']);
    exit;
}

$token = str_replace('Bearer ', '', $token);

$stmt = $pdo->prepare('SELECT id FROM users WHERE token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

$discordId = $data['discord_id'] ?? '';
$discordUsername = $data['discord_username'] ?? '';
$discordAvatar = $data['discord_avatar'] ?? '';
$discordDiscriminator = $data['discord_discriminator'] ?? '0';
$discordPublicFlags = (int)($data['discord_public_flags'] ?? 0);
$discordPremiumType = (int)($data['discord_premium_type'] ?? 0);

if (!$discordId) {
    http_response_code(400);
    echo json_encode(['error' => 'Discord ID required']);
    exit;
}

try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_public_flags INT DEFAULT 0"); } catch (Exception $e) {}
try { $pdo->exec("ALTER TABLE pages ADD COLUMN discord_premium_type INT DEFAULT 0"); } catch (Exception $e) {}

try {
    $stmt = $pdo->prepare('UPDATE pages SET discord_id = ?, discord_username = ?, discord_avatar = ?, discord_discriminator = ?, discord_public_flags = ?, discord_premium_type = ? WHERE user_id = ?');
    $stmt->execute([$discordId, $discordUsername, $discordAvatar, $discordDiscriminator, $discordPublicFlags, $discordPremiumType, $user['id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Discord account connected'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save Discord data']);
}