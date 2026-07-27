<?php
/**
 * Authentication Module — session-based login with HTML form.
 *
 * Reads AUTH_METHOD from environment:
 *   - none:      Pass-through, no authentication required
 *   - account:   Session-based login form (ACCOUNT_LOGIN / ACCOUNT_PASSWORD)
 *   - keycloak:  OIDC Bearer token validation via Keycloak
 *
 * Called by router.php on every request and by proxy.php as defense-in-depth.
 */

// ── Detect auth method ─────────────────────────────────────
$authMethod = strtolower(getenv('AUTH_METHOD') ?: 'none');

// ── Secure session configuration ───────────────────────────
if ($authMethod === 'account') {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Strict');
    ini_set('session.use_strict_mode', '1');
    // Mark secure if behind HTTPS reverse proxy
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        ini_set('session.cookie_secure', '1');
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
        ini_set('session.cookie_secure', '1');
    }
}

/**
 * Check if the current request is authenticated.
 */
function auth_check(): bool {
    global $authMethod;

    if ($authMethod === 'none') {
        return true;
    }

    if ($authMethod === 'account') {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        return !empty($_SESSION['danfe_authenticated']);
    }

    if ($authMethod === 'keycloak') {
        return auth_check_keycloak();
    }

    return false;
}

/**
 * Attempt login with username/password (account mode).
 */
function auth_login(string $username, string $password): bool {
    $expectedLogin = getenv('ACCOUNT_LOGIN') ?: '';
    $expectedPassword = getenv('ACCOUNT_PASSWORD') ?: '';

    if ($expectedLogin === '' || $expectedPassword === '') {
        return false;
    }

    // Constant-time comparison to prevent timing attacks
    if (hash_equals($expectedLogin, $username) && hash_equals($expectedPassword, $password)) {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        session_regenerate_id(true);
        $_SESSION['danfe_authenticated'] = true;
        $_SESSION['danfe_login_time'] = time();
        return true;
    }

    return false;
}

/**
 * Destroy session (logout).
 */
function auth_logout(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    session_destroy();
}

/**
 * Get the current auth method.
 */
function auth_method(): string {
    global $authMethod;
    return $authMethod;
}

// ── Keycloak Bearer token validation (internal) ────────────
function auth_check_keycloak(): bool {
    static $checked = false;
    static $result = false;

    // Only validate once per request
    if ($checked) {
        return $result;
    }
    $checked = true;

    // If already in session, skip re-validation
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (!empty($_SESSION['danfe_authenticated'])) {
        $result = true;
        return true;
    }

    $keycloakBaseUrl  = rtrim(getenv('KEYCLOAK_BASE_URL') ?: '', '/');
    $keycloakRealm    = getenv('KEYCLOAK_REALM') ?: '';
    $keycloakClientId = getenv('KEYCLOAK_CLIENT_ID') ?: '';
    $keycloakEmailAccount = getenv('KEYCLOAK_EMAIL_ACCOUNT') ?: '';

    if ($keycloakBaseUrl === '' || $keycloakRealm === '' || $keycloakClientId === '') {
        return false;
    }

    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

    if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
        return false;
    }

    $accessToken = substr($authHeader, 7);

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
        return false;
    }

    $userinfo = json_decode($userinfoResponse, true);
    if (!$userinfo || !isset($userinfo['email'])) {
        return false;
    }

    if ($keycloakEmailAccount !== '' && $userinfo['email'] !== $keycloakEmailAccount) {
        return false;
    }

    // Valid — persist in session so subsequent requests skip re-validation
    $_SESSION['danfe_authenticated'] = true;
    $result = true;
    return true;
}
