<?php
/**
 * CNPJá API Proxy — Forwards CNPJ/CPF lookups server-side
 *
 * Browser → cnpja-proxy.php (same origin, no CORS)
 * cnpja-proxy.php → api.cnpja.com (server-to-server, no CORS)
 *
 * Supported lookups:
 *   - office: GET /office/{cnpj}  (company lookup)
 *   - person: GET /person/{cpf}   (person + companies/sócios lookup)
 *
 * All credentials are read from environment variables (set via docker/.env).
 * NEVER hardcode API keys in this file.
 */

// ── Authentication gate (defense-in-depth) ──────────────────
require_once __DIR__ . '/auth.php';

// Router already enforces auth, but check again in case of
// direct access or misconfiguration
if (!auth_check()) {
    http_response_code(401);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

// ── Load configuration from environment ─────────────────────
$apiBase    = rtrim(getenv('CNPJA_API_BASE') ?: 'https://api.cnpja.com', '/');
$apiKey     = getenv('CNPJA_API_KEY') ?: '';
$apiTimeout = (int)(getenv('CNPJA_API_TIMEOUT') ?: 30);

// ── Fail early if API key is missing ────────────────────────
if ($apiKey === '') {
    http_response_code(500);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(['error' => 'Server configuration error']);
    exit;
}

// ── CORS preflight (OPTIONS) ──────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

// ── Only accept POST ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── Read and validate incoming JSON ──────────────────────
$body = file_get_contents('php://input');
$json = json_decode($body, true);

if (!$json) {
    http_response_code(400);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(['error' => 'Missing or invalid JSON body']);
    exit;
}

$type   = strtolower($json['type'] ?? '');
$taxId  = preg_replace('/\D/', '', (string)($json['taxId'] ?? ''));

// ── Validate lookup type ─────────────────────────────────
$allowedTypes = [
    'office' => ['digits' => 14, 'label' => 'CNPJ'],
    'person' => ['digits' => 11, 'label' => 'CPF'],
];

if (!isset($allowedTypes[$type])) {
    http_response_code(400);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(['error' => 'Invalid type. Send "office" (CNPJ) or "person" (CPF).']);
    exit;
}

// ── Validate tax id length ───────────────────────────────
if (strlen($taxId) !== $allowedTypes[$type]['digits']) {
    http_response_code(400);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode([
        'error' => sprintf(
            'Invalid %s: must have exactly %d digits',
            $allowedTypes[$type]['label'],
            $allowedTypes[$type]['digits']
        ),
    ]);
    exit;
}

// ── Forward GET request to CNPJá API ─────────────────────
if (!function_exists('curl_init')) {
    http_response_code(500);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    echo json_encode(['error' => 'Proxy error', 'detail' => 'cURL extension is not available']);
    exit;
}

$url = $apiBase . '/' . $type . '/' . rawurlencode($taxId);
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER     => ['Authorization: ' . $apiKey],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => $apiTimeout,
    CURLOPT_FOLLOWLOCATION => true,
]);

$response   = curl_exec($ch);
$httpCode   = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error      = curl_error($ch);
curl_close($ch);

// ── Handle cURL failure ──────────────────────────────────
if ($error) {
    http_response_code(502);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    // Sanitize error: strip API key if it accidentally appears in cURL message
    $safeError = ($apiKey !== '') ? str_replace($apiKey, '[REDACTED]', $error) : $error;
    echo json_encode(['error' => 'Proxy error', 'detail' => $safeError]);
    exit;
}

// ── Pass through a successful response ───────────────────
if ($httpCode >= 200 && $httpCode < 300) {
    http_response_code($httpCode);
    header('Content-Type: ' . ($contentType ?: 'application/json'));
    header('Access-Control-Allow-Origin: *');
    echo $response;
    exit;
}

// ── Sanitized upstream error forwarding ──────────────────
$safeBody = json_decode($response, true);
if (!is_array($safeBody)) {
    $safeBody = ['error' => 'Upstream error', 'http_code' => $httpCode];
}

// Remove any key-like fields that might leak credentials
unset($safeBody['api_key'], $safeBody['apikey'], $safeBody['api-key'], $safeBody['token'], $safeBody['authorization']);

http_response_code($httpCode);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
echo json_encode($safeBody);
