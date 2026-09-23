<?php
/**
 * Logout handler — destroys session and redirects to login page.
 */

require_once __DIR__ . '/auth.php';

auth_logout();

// In keycloak mode also end the SSO session (RP-initiated logout)
$ssoLogoutUrl = auth_keycloak_logout_url();
if ($ssoLogoutUrl !== '') {
    header('Location: ' . $ssoLogoutUrl);
    exit;
}

// Redirect to login page
header('Location: /login.html?logged_out=1');
exit;
