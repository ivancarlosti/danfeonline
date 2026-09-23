<?php
/**
 * Login handler — validates credentials and starts session.
 * POST-only endpoint; redirects back to login form on failure
 * or to the requested destination on success.
 */

require_once __DIR__ . '/auth.php';

// Username/password login only exists in account mode. In keycloak mode the
// credentials form must never be accepted (see auth_login()).
if (auth_method() !== 'account') {
    header('Location: /');
    exit;
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /login.html');
    exit;
}

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$redirect = $_POST['redirect'] ?? '/';

// Validate the redirect target (only allow local paths)
if (!str_starts_with($redirect, '/') || str_contains($redirect, '//')) {
    $redirect = '/';
}
// Prevent open redirect: strip any host portion
$redirect = parse_url($redirect, PHP_URL_PATH) ?: '/';

if ($username === '' || $password === '') {
    header('Location: /login.html?error=empty&redirect=' . urlencode($redirect));
    exit;
}

// reCAPTCHA (no-op when disabled) — verified before the credentials are
// compared so the form cannot be used as a credential oracle.
if (!auth_verify_recaptcha($_POST['g-recaptcha-response'] ?? '')) {
    header('Location: /login.html?error=captcha&redirect=' . urlencode($redirect));
    exit;
}

if (auth_login($username, $password)) {
    header('Location: ' . $redirect);
    exit;
}

// Failed login
header('Location: /login.html?error=invalid&redirect=' . urlencode($redirect));
exit;
