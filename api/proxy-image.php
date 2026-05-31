<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$url = $_GET['url'] ?? '';

if (empty($url)) {
    echo json_encode(['error' => 'No URL provided']);
    exit;
}

if (!filter_var($url, FILTER_VALIDATE_URL)) {
    echo json_encode(['error' => 'Invalid URL']);
    exit;
}

$context = stream_context_create([
    'http' => [
        'timeout' => 15,
        'ignore_errors' => true,
        'follow_location' => 1,
        'max_redirects' => 5,
        'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nAccept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8\r\nAccept-Language: en-US,en;q=0.9\r\nReferer: https://www.pinimg.com/\r\n"
    ]
]);

$imageData = @file_get_contents($url, false, $context);

if ($imageData === false) {
    http_response_code(400);
    echo json_encode(['error' => 'Failed to fetch image']);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->buffer($imageData);

if (!str_starts_with($mimeType, 'image/')) {
    http_response_code(400);
    echo json_encode(['error' => 'Not an image']);
    exit;
}

$base64 = base64_encode($imageData);
$dataUrl = 'data:' . $mimeType . ';base64,' . $base64;

echo json_encode(['dataUrl' => $dataUrl]);