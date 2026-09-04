<?php
/**
 * CNPJá API Proxy — Forwards CNPJ/CPF lookups server-side
 *
 * Browser → cnpja-proxy.php (same origin, no CORS)
 * cnpja-proxy.php → api.cnpja.com (server-to-server, no CORS)
 *
 * Supported actions (JSON body):
 *   - office:         GET /office/{cnpj}                     (CNPJ detail)
 *   - office-search:  GET /office?names.in={query}&limit=20  (name/fantasy search)
 *   - person-search:  GET /person?taxId.in={cpf}&limit=20    (CPF search)
 *                     GET /person?name.in={name}&limit=20    (name search)
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

$action = strtolower((string)($json['action'] ?? ''));

// ── Build upstream path + query per action ───────────────
$path  = '';
$query = [];

switch ($action) {
    case 'office':
        $taxId = preg_replace('/\D/', '', (string)($json['taxId'] ?? ''));
        if (strlen($taxId) !== 14) {
            json_error(400, 'Invalid CNPJ: must have exactly 14 digits');
        }
        $path = '/office/' . rawurlencode($taxId);
        break;

    case 'office-search':
        $term = trim((string)($json['query'] ?? ''));
        if (strlen($term) < 2) {
            json_error(400, 'Invalid query: must have at least 2 characters');
        }
        $path = '/office';
        $query = ['names.in' => $term, 'limit' => 20];
        break;

    case 'person-search':
        $term = trim((string)($json['query'] ?? ''));
        $digits = preg_replace('/\D/', '', $term);

        // CNPJá stores CPFs partially and matches on digits 4-9,
        // so a CPF input is handled via the search endpoint.
        if ($digits !== '' && strlen($digits) === 11) {
            $path = '/person';
            $query = ['taxId.in' => $digits, 'limit' => 20];
        } else {
            if (strlen($term) < 2) {
                json_error(400, 'Invalid query: must have at least 2 characters');
            }
            $path = '/person';
            $query = ['name.in' => $term, 'limit' => 20];
        }
        break;

    default:
        json_error(400, 'Invalid action. Send "office", "office-search" or "person-search".');
}

// ── Build final URL ──────────────────────────────────────
$url = $apiBase . $path;
if (!empty($query)) {
    $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
}

// ── Forward GET request to CNPJá API ─────────────────────
if (!function_exists('curl_init')) {
    json_error(500, 'Proxy error: cURL extension is not available');
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER     => ['Authorization: ' . $apiKey],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => $apiTimeout,
    CURLOPT_FOLLOWLOCATION => true,
]);

$response    = curl_exec($ch);
$httpCode    = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error       = curl_error($ch);
curl_close($ch);

// ── Handle cURL failure ──────────────────────────────────
if ($error) {
    $safeError = ($apiKey !== '') ? str_replace($apiKey, '[REDACTED]', $error) : $error;
    json_error(502, 'Proxy error', $safeError);
}

// ── Diagnostic log for upstream errors (safe to remove) ──
if ($httpCode >= 400) {
    error_log(sprintf(
        '[cnpja-proxy] upstream error url=%s http=%d body=%s',
        $url,
        $httpCode,
        substr($response, 0, 600)
    ));
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

/**
 * Emit a JSON error response and stop.
 */
function json_error(int $code, string $error, ?string $detail = null): void {
    http_response_code($code);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    $payload = ['error' => $error];
    if ($detail !== null) {
        $payload['detail'] = $detail;
    }
    echo json_encode($payload);
    exit;
}
