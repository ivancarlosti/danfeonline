<?php
/**
 * Authentication Gate — included by proxy.php before any API logic.
 *
 * Reads AUTH_METHOD from environment and enforces access:
 *   - none:      Pass-through, no authentication required
 *   - account:   HTTP Basic Authentication (ACCOUNT_LOGIN / ACCOUNT_PASSWORD)
 *   - keycloak:  OIDC Bearer token validation via Keycloak /userinfo endpoint
 *
 * On failure, returns JSON error with HTTP 401 and calls exit().
 */

// Always set CORS headers so auth errors are readable by the browser
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

// Handle CORS preflight before auth check
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$authMethod = strtolower(getenv('AUTH_METHOD') ?: 'none');

// ── Mode: none — allow all ──────────────────────────────────
if ($authMethod === 'none') {
    return; // continue to proxy.php
}

// ── Mode: account — HTTP Basic Auth ──────────────────────────
if ($authMethod === 'account') {
    $expectedLogin = getenv('ACCOUNT_LOGIN') ?: '';
    $expectedPassword = getenv('ACCOUNT_PASSWORD') ?: '';

    if ($expectedLogin === '' || $expectedPassword === '') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Server configuration error']);
        exit;
    }

    // Extract Basic Auth credentials
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

    if (empty($authHeader) || !str_starts_with($authHeader, 'Basic ')) {
        http_response_code(401);
        header('Content-Type: application/json');
        header('WWW-Authenticate: Basic realm="DANFE Online", charset="UTF-8"');
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }

    $decoded = base64_decode(substr($authHeader, 6), true);
    if ($decoded === false || !str_contains($decoded, ':')) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid credentials format']);
        exit;
    }

    [$user, $pass] = explode(':', $decoded, 2);

    if ($user !== $expectedLogin || $pass !== $expectedPassword) {
        http_response_code(401);
        header('Content-Type: application/json');
        header('WWW-Authenticate: Basic realm="DANFE Online", charset="UTF-8"');
        echo json_encode(['error' => 'Invalid credentials']);
        exit;
    }

    return; // authenticated, continue to proxy.php
}

// ── Mode: keycloak — OIDC Bearer token validation ────────────
if ($authMethod === 'keycloak') {
    $keycloakBaseUrl  = rtrim(getenv('KEYCLOAK_BASE_URL') ?: '', '/');
    $keycloakRealm    = getenv('KEYCLOAK_REALM') ?: '';
    $keycloakClientId = getenv('KEYCLOAK_CLIENT_ID') ?: '';
    $keycloakClientSecret = getenv('KEYCLOAK_CLIENT_SECRET') ?: '';
    $keycloakRedirectUri  = getenv('KEYCLOAK_REDIRECT_URI') ?: '';
    $keycloakEmailAccount = getenv('KEYCLOAK_EMAIL_ACCOUNT') ?: '';

    if ($keycloakBaseUrl === '' || $keycloakRealm === '' || $keycloakClientId === '') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Server configuration error']);
        exit;
    }

    // Extract Bearer token
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

    if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
        // No token — return Keycloak auth URL so SPA can redirect
        http_response_code(401);
        header('Content-Type: application/json');
        $authUrl = $keycloakBaseUrl . '/realms/' . urlencode($keycloakRealm)
                 . '/protocol/openid-connect/auth'
                 . '?client_id=' . urlencode($keycloakClientId)
                 . '&redirect_uri=' . urlencode($keycloakRedirectUri)
                 . '&response_type=code'
                 . '&scope=openid+email+profile';
        echo json_encode([
            'error' => 'Authentication required',
            'auth_url' => $authUrl,
        ]);
        exit;
    }

    $accessToken = substr($authHeader, 7);

    // Validate token against Keycloak /userinfo endpoint
    $userinfoUrl = $keycloakBaseUrl . '/realms/' . urlencode($keycloakRealm)
                 . '/protocol/openid-connect/userinfo';

    $ch = curl_init($userinfoUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $accessToken],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_FOLLOWLOCATION => false,
    ]);

    $userinfoResponse = curl_exec($ch);
    $userinfoHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($userinfoHttpCode !== 200 || empty($userinfoResponse)) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid or expired token']);
        exit;
    }

    $userinfo = json_decode($userinfoResponse, true);

    if (!$userinfo || !isset($userinfo['email'])) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unable to verify token']);
        exit;
    }

    // Optional: restrict to a specific email
    if ($keycloakEmailAccount !== '' && $userinfo['email'] !== $keycloakEmailAccount) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Access denied for this account']);
        exit;
    }

    return; // authenticated, continue to proxy.php
}

// ── Unknown AUTH_METHOD ──────────────────────────────────────
http_response_code(500);
header('Content-Type: application/json');
echo json_encode(['error' => 'Server configuration error']);
exit;
