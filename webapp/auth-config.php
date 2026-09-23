<?php
/**
 * Public auth configuration endpoint.
 *
 * Exposes only the non-secret values the login page needs to render the
 * correct UI (active auth method + reCAPTCHA site key). The reCAPTCHA
 * secret is never exposed.
 *
 * Public by design: reachable before authentication — see $publicPaths in
 * router.php and the /auth-config.php location block in config/nginx.conf.
 */

require_once __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$recaptchaEnabled = auth_recaptcha_enabled();

echo json_encode([
    'authMethod'       => auth_method(),
    'recaptchaEnabled' => $recaptchaEnabled,
    'recaptchaSiteKey' => $recaptchaEnabled ? auth_recaptcha_site_key() : '',
]);
