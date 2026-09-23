<?php
/**
 * Authentication Module — session-based login with HTML form.
 *
 * Reads AUTH_METHOD from environment:
 *   - none:      Pass-through, no authentication required
 *   - account:   Session-based login form (ACCOUNT_LOGIN / ACCOUNT_PASSWORD)
 *   - keycloak:  OIDC Bearer token validation via Keycloak
 *
 * Sessions are bound to the auth method that created them
 * ($_SESSION['danfe_auth_method']), so switching AUTH_METHOD (e.g. account →
 * keycloak) revokes every session minted by the previous method.
 *
 * Called by router.php on every request and by proxy.php as defense-in-depth.
 */

// ── Detect auth method ─────────────────────────────────────
$authMethod = strtolower(getenv('AUTH_METHOD') ?: 'none');

// ── Secure session configuration ───────────────────────────
if ($authMethod !== 'none') {
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

// ── Session state helpers ──────────────────────────────────

/**
 * Start the PHP session if it is not already active.
 */
function auth_session_start(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

/**
 * Whether the active session was minted by the current auth method.
 *
 * Binding the session to its auth method means a session created in
 * account mode can never satisfy keycloak mode (and vice versa).
 */
function auth_session_valid(): bool {
    global $authMethod;
    return !empty($_SESSION['danfe_authenticated'])
        && ($_SESSION['danfe_auth_method'] ?? '') === $authMethod;
}

/**
 * Mark the current session as authenticated for the active auth method.
 */
function auth_set_authenticated(): void {
    global $authMethod;
    auth_session_start();
    session_regenerate_id(true);
    $_SESSION['danfe_authenticated'] = true;
    $_SESSION['danfe_auth_method']   = $authMethod;
    $_SESSION['danfe_login_time']    = time();
}

/**
 * Revoke a session that was minted while a different auth method was active.
 */
function auth_discard_stale_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        auth_logout();
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
        auth_session_start();
        if (auth_session_valid()) {
            return true;
        }
        if (!empty($_SESSION['danfe_authenticated'])) {
            // Session created while another AUTH_METHOD was active — revoke it.
            auth_discard_stale_session();
        }
        return false;
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
    global $authMethod;

    // Username/password login only exists in account mode. Without this guard
    // a leftover ACCOUNT_LOGIN/ACCOUNT_PASSWORD in .env would still mint a
    // session while keycloak mode is active.
    if ($authMethod !== 'account') {
        return false;
    }

    $expectedLogin = getenv('ACCOUNT_LOGIN') ?: '';
    $expectedPassword = getenv('ACCOUNT_PASSWORD') ?: '';

    if ($expectedLogin === '' || $expectedPassword === '') {
        return false;
    }

    // Constant-time comparison to prevent timing attacks
    if (hash_equals($expectedLogin, $username) && hash_equals($expectedPassword, $password)) {
        auth_set_authenticated();
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

/**
 * Login entry point for the active auth method (URL-encodes the destination).
 *
 * account  → /login.html?redirect=…
 * keycloak → /login.html?sso=1&redirect=…   (credentials form is suppressed)
 */
function auth_login_path(string $destination): string {
    global $authMethod;

    if ($authMethod === 'keycloak') {
        return '/login.html?sso=1&redirect=' . urlencode($destination);
    }

    return '/login.html?redirect=' . urlencode($destination);
}

// ── reCAPTCHA (account mode only) ──────────────────────────

/** Default Google reCAPTCHA verification endpoint. */
function auth_recaptcha_default_verify_url(): string {
    return 'https://www.google.com/recaptcha/api/siteverify';
}

/** Public reCAPTCHA site key (safe to expose to the browser). */
function auth_recaptcha_site_key(): string {
    return trim(getenv('RECAPTCHA_SITE_KEY') ?: '');
}

/**
 * Whether reCAPTCHA is enforced. Only meaningful in account mode and only
 * when both the site key and the secret key are configured.
 */
function auth_recaptcha_enabled(): bool {
    global $authMethod;

    if ($authMethod !== 'account') {
        return false;
    }

    return auth_recaptcha_site_key() !== '' && (getenv('RECAPTCHA_SECRET_KEY') ?: '') !== '';
}

/**
 * Verification endpoint — overridable via RECAPTCHA_VERIFY_URL for testing.
 */
function auth_recaptcha_verify_url(): string {
    $url = trim(getenv('RECAPTCHA_VERIFY_URL') ?: '');
    return $url !== '' ? $url : auth_recaptcha_default_verify_url();
}

/**
 * Verify a reCAPTCHA v2 token against Google's siteverify endpoint.
 *
 * Returns true when reCAPTCHA is disabled (no-op). Fails closed on
 * transport/HTTP/JSON errors, logging the reason to the PHP error log.
 */
function auth_verify_recaptcha(string $token): bool {
    if (!auth_recaptcha_enabled()) {
        return true;
    }

    $secret = getenv('RECAPTCHA_SECRET_KEY') ?: '';
    $token  = trim($token);

    if ($token === '') {
        error_log('reCAPTCHA rejected: empty response token');
        return false;
    }

    $payload = http_build_query([
        'secret'   => $secret,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
    ]);

    $ch = curl_init(auth_recaptcha_verify_url());
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $httpCode !== 200) {
        error_log('reCAPTCHA verification failed: '
            . ($curlError !== '' ? $curlError : 'HTTP ' . $httpCode));
        return false;
    }

    $data = json_decode($response, true);
    if (!is_array($data) || ($data['success'] ?? false) !== true) {
        $codes = isset($data['error-codes']) && is_array($data['error-codes'])
            ? implode(',', $data['error-codes'])
            : 'unknown error';
        error_log('reCAPTCHA rejected: ' . $codes);
        return false;
    }

    return true;
}

// ── Keycloak helpers ───────────────────────────────────────

/**
 * Whether Keycloak SSO is the active auth method and is configured.
 */
function auth_keycloak_enabled(): bool {
    global $authMethod;

    if ($authMethod !== 'keycloak') {
        return false;
    }

    return (getenv('KEYCLOAK_BASE_URL') ?: '') !== ''
        && (getenv('KEYCLOAK_REALM') ?: '') !== '';
}

/**
 * Build the Keycloak RP-initiated logout URL (end_session_endpoint).
 * Returns '' when SSO logout cannot be built, so callers fall back to the
 * local login page.
 */
function auth_keycloak_logout_url(): string {
    if (!auth_keycloak_enabled()) {
        return '';
    }

    $baseUrl  = rtrim(getenv('KEYCLOAK_BASE_URL') ?: '', '/');
    $realm    = getenv('KEYCLOAK_REALM') ?: '';
    $clientId = getenv('KEYCLOAK_CLIENT_ID') ?: '';

    if ($baseUrl === '' || $realm === '' || $clientId === '') {
        return '';
    }

    $params = ['client_id' => $clientId];
    $postLogoutRedirect = trim(getenv('KEYCLOAK_REDIRECT_URI') ?: '');
    if ($postLogoutRedirect !== '') {
        $params['post_logout_redirect_uri'] = $postLogoutRedirect;
    }

    return $baseUrl . '/realms/' . urlencode($realm)
         . '/protocol/openid-connect/logout?' . http_build_query($params);
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

    // If already in session for this auth method, skip re-validation
    auth_session_start();
    if (auth_session_valid()) {
        $result = true;
        return true;
    }
    if (!empty($_SESSION['danfe_authenticated'])) {
        // Session minted by a different AUTH_METHOD (e.g. account) — revoke it
        // instead of trusting it as a keycloak session.
        auth_discard_stale_session();
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
    auth_set_authenticated();
    $result = true;
    return true;
}
