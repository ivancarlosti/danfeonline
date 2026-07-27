<?php
/**
 * Router script for PHP built-in web server.
 *
 * Enforces authentication on EVERY incoming request before serving
 * any file — static (HTML, CSS, JS) or dynamic (PHP).
 *
 * Whitelisted paths (/login.html, /login.php, /logout.php) bypass
 * auth to allow the login form to render.
 *
 * Usage: php -S 0.0.0.0:8080 router.php
 */

require_once __DIR__ . '/auth.php';

// ── Resolve the requested path ─────────────────────────────
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Normalize
$normalized = '/' . ltrim($path, '/');
$normalized = preg_replace('#/\./#', '/', $normalized);
$normalized = preg_replace('#/\.\./#', '/', $normalized);
if ($normalized !== '/' && str_ends_with($normalized, '/')) {
    $normalized = rtrim($normalized, '/');
}

// ── Public paths — no authentication required ──────────────
$publicPaths = [
    '/login.html',
    '/login.php',
    '/logout.php',
    '/styles.css',
];

if (!in_array($normalized, $publicPaths, true)) {
    if (!auth_check()) {
        // Redirect to login form, preserving the original destination
        $dest = urlencode($requestUri);
        header('Location: /login.html?redirect=' . $dest);
        exit;
    }
}

// ── Security: resolve real path, prevent traversal ─────────
$file = __DIR__ . $normalized;
$realBase = realpath(__DIR__);
$realFile = @realpath($file);

if ($realFile === false || (!str_starts_with($realFile, $realBase . DIRECTORY_SEPARATOR) && $realFile !== $realBase)) {
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

// Directory → index.html
if (is_dir($realFile)) {
    $indexFile = $realFile . DIRECTORY_SEPARATOR . 'index.html';
    if (is_file($indexFile)) {
        $realFile = $indexFile;
    }
}

// ── PHP file: execute directly ─────────────────────────────
if (pathinfo($realFile, PATHINFO_EXTENSION) === 'php') {
    if (is_file($realFile)) {
        require $realFile;
    } else {
        http_response_code(404);
        echo 'Not Found';
    }
    return true;
}

// ── Static file: let PHP built-in server handle it ─────────
return false;
