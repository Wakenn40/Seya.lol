<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

$search = $_GET['search'] ?? '';
$sort = $_GET['sort'] ?? 'popular';
$page = (int)($_GET['page'] ?? 1);
$limit = 24;
$offset = ($page - 1) * $limit;

try {
    $sql = "SELECT t.id, t.name, t.tags, t.description, t.usage_count, t.created_at, u.username, u.email as creator_email
            FROM templates t 
            JOIN users u ON t.user_id = u.id";
    
    $params = [];
    $where = [];
    
    if ($search) {
        $where[] = "(t.name LIKE :search OR t.description LIKE :search OR t.tags LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }
    
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    
    switch ($sort) {
        case 'newest':
            $sql .= " ORDER BY t.created_at DESC";
            break;
        case 'oldest':
            $sql .= " ORDER BY t.created_at ASC";
            break;
        case 'popular':
        default:
            $sql .= " ORDER BY t.usage_count DESC, t.created_at DESC";
            break;
    }
    
    $sql .= " LIMIT :limit OFFSET :offset";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $totalStmt = $pdo->prepare("SELECT COUNT(*) FROM templates t " . (!empty($where) ? "WHERE " . implode(' AND ', $where) : ""));
    foreach ($params as $key => $val) {
        $totalStmt->bindValue($key, $val);
    }
    $totalStmt->execute();
    $total = $totalStmt->fetchColumn();
    
    $result = array_map(function($t) {
        $tags = json_decode($t['tags'] ?? '[]', true);
        $pageData = json_decode($t['page_data'] ?? '{}', true);
        $preview = null;
        if (is_array($pageData) && !empty($pageData)) {
            $layout = $pageData['layout'] ?? [];
            $phoneLayout = $layout['phone'] ?? [];
            $customObjects = $pageData['customObjects'] ?? [];
            $objCount = count($customObjects);
            $firstObjSrc = '';
            if ($objCount > 0 && !empty($customObjects[0]['src']) && $customObjects[0]['type'] !== 'text') {
                $src = $customObjects[0]['src'];
                if (strlen($src) > 200) $src = substr($src, 0, 200);
                $firstObjSrc = $src;
            }
            $linksCount = 0;
            if (!empty($pageData['linksEnabled']) && is_array($pageData['links'])) {
                $linksCount = count($pageData['links']);
            }
            $preview = [
                'bg' => $pageData['bg'] ?? 'bg-black',
                'accentColor' => $pageData['accentColor'] ?? '#d6d6d6',
                'avatar' => $pageData['avatar'] ?? '',
                'displayName' => $pageData['displayName'] ?? '',
                'displayNameHtml' => $pageData['displayNameHtml'] ?? '',
                'font' => $pageData['font'] ?? 'Syne',
                'nameSize' => $pageData['nameSize'] ?? 22,
                'btnStyle' => $pageData['btnStyle'] ?? '',
                'deleted' => $pageData['deleted'] ?? [],
                'phoneW' => Number($phoneLayout['w']) ?: 280,
                'phoneH' => Number($phoneLayout['h']) ?: 560,
                'phoneX' => Number($phoneLayout['x']) ?: 0,
                'phoneY' => Number($phoneLayout['y']) ?: 0,
                'phoneRotate' => Number($phoneLayout['rotate']) ?: 0,
                'customObjectsCount' => $objCount,
                'firstObjSrc' => $firstObjSrc,
                'linksCount' => $linksCount,
                'phoneBorderRadius' => $pageData['phoneBorderRadius'] ?? 42,
            ];
        }
        return [
            'id' => (int)$t['id'],
            'name' => $t['name'],
            'tags' => is_array($tags) ? $tags : [],
            'description' => $t['description'] ?? '',
            'usage_count' => (int)$t['usage_count'],
            'created_at' => $t['created_at'],
            'creator' => $t['username'],
            'preview' => $preview
        ];
    }, $templates);
    
    echo json_encode([
        'success' => true,
        'templates' => $result,
        'total' => (int)$total,
        'page' => $page,
        'hasMore' => $total > $offset + $limit
    ]);
} catch (Exception $e) {
    error_log('list-templates error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load templates', 'templates' => [], 'total' => 0]);
}