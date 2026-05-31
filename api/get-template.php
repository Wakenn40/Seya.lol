<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

$templateId = (int)($_GET['id'] ?? 0);

if (!$templateId) {
    http_response_code(400);
    echo json_encode(['error' => 'Template ID is required']);
    exit;
}

$stmt = $pdo->prepare('SELECT t.id, t.name, t.tags, t.description, t.page_data, t.usage_count, t.created_at, u.username 
                       FROM templates t 
                       JOIN users u ON t.user_id = u.id 
                       WHERE t.id = ?');
$stmt->execute([$templateId]);
$template = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$template) {
    http_response_code(404);
    echo json_encode(['error' => 'Template not found']);
    exit;
}

$rawData = $template['page_data'];
$pageData = (is_string($rawData) ? json_decode($rawData, true) : $rawData) ?? [];
$tags = json_decode($template['tags'] ?? '[]', true);

echo json_encode([
    'success' => true,
    'template' => [
        'id' => (int)$template['id'],
        'name' => $template['name'],
        'tags' => is_array($tags) ? $tags : [],
        'description' => $template['description'] ?? '',
        'usage_count' => (int)$template['usage_count'],
        'created_at' => $template['created_at'],
        'creator' => $template['username'],
        'pageData' => $pageData
    ]
]);