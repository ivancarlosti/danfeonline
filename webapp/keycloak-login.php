<?php
/**
 * Keycloak login entry point - starts the Authorization Code + PKCE flow.
 *
 * Public path (see $publicPaths in router.php): the browser has no session yet.
 * In every other auth mode the request falls back to the regular login page.
 */

require_once __DIR__ . '/auth.php';

if (!auth_keycloak_enabled()) {
    header('Location: ' . auth_login_path('/'));
    exit;
}

$redirect     = auth_safe_redirect($_GET['redirect'] ?? '/');
$authorizeUrl = auth_keycloak_authorize_url($redirect);

if ($authorizeUrl === '') {
    // Missing client id or callback URL: the login page explains the problem
    // instead of bouncing the user back to the provider in a loop.
    error_log('Keycloak login unavailable: incomplete configuration');
    header('Location: /login.html?error=sso_config&redirect=' . urlencode($redirect));
    exit;
}

header('Location: ' . $authorizeUrl);
exit;
