<?php
// Catch-all for /api/* requests on nginx
// When nginx has index index.php and a request hits /api/action,
// this file might be tried as a fallback directory index.
// Extract the action from the REQUEST_URI and route to api.php.

$uri = $_SERVER['REQUEST_URI'] ?? '';
if (preg_match('#^/api/([a-z][a-z0-9-]*)(?:\?(.*))?$#', $uri, $m)) {
    $_GET['action'] = $m[1];
    if (!empty($m[2])) {
        parse_str($m[2], $qp);
        $_GET = array_merge($_GET, $qp);
        $_REQUEST = array_merge($_REQUEST, $qp);
    }
    require __DIR__ . '/../api.php';
    exit;
}

http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'API endpoint not found']);
