<?php
/**
 * Keycloak callback - validates the provider response and opens the session.
 *
 * Public path (see $publicPaths in router.php): it is the redirect target the
 * provider sends the browser back to. Every failure returns to the login page
 * with ?error=sso, so the user is never left without a way to retry.
 */

require_once __DIR__ . '/auth.php';

if (!auth_keycloak_enabled()) {
    header('Location: ' . auth_login_path('/'));
    exit;
}

// The provider reports a rejected login here (consent denied, invalid client...)
$providerError = $_GET['error'] ?? '';
if ($providerError !== '') {
    error_log('Keycloak login failed: ' . $providerError . ' ' . ($_GET['error_description'] ?? ''));
    header('Location: /login.html?error=sso');
    exit;
}

$destination = auth_keycloak_complete_login(
    isset($_GET['code']) ? (string) $_GET['code'] : '',
    isset($_GET['state']) ? (string) $_GET['state'] : ''
);

if ($destination === null) {
    header('Location: /login.html?error=sso');
    exit;
}

header('Location: ' . $destination);
exit;
