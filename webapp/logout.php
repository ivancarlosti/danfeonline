<?php
/**
 * Logout handler — destroys session and redirects to login page.
 */

require_once __DIR__ . '/auth.php';

// In keycloak mode also end the SSO session (RP-initiated logout). The URL is
// built first: it carries the ID token stored by the login as id_token_hint,
// which lets Keycloak skip its own logout confirmation page.
$ssoLogoutUrl = auth_keycloak_logout_url();

auth_logout();
if ($ssoLogoutUrl !== '') {
    header('Location: ' . $ssoLogoutUrl);
    exit;
}

// Redirect to login page
header('Location: /login.html?logged_out=1');
exit;
