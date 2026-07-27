<?php
/**
 * Router script for PHP built-in web server.
 *
 * Enforces authentication on EVERY incoming request before serving
 * any file — static (HTML, CSS, JS) or dynamic (PHP).
 *
 * Usage: php -S 0.0.0.0:8080 router.php
 *
 * How it works with PHP's built-in server:
 *   - Return false: PHP serves the file as a static resource
 *   - Return true (or exit): request is considered handled
 */

// ── Authentication gate (runs on every request) ────────────
// On auth failure, auth.php calls exit() — request stops here.
// On success, auth.php returns and execution continues.
require_once __DIR__ . '/auth.php';

// ── Route the request ──────────────────────────────────────
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);

// Prevent directory traversal
// Normalize: collapse /../ and /./, strip trailing slash (except root)
$normalized = '/' . ltrim($path, '/');
$normalized = preg_replace('#/\./#', '/', $normalized);
$normalized = preg_replace('#/\.\./#', '/', $normalized);
if ($normalized !== '/' && str_ends_with($normalized, '/')) {
    $normalized = rtrim($normalized, '/');
}

$file = __DIR__ . $normalized;

// Safety check: resolved path must stay inside webapp directory
$realBase = realpath(__DIR__);
$realFile = realpath($file);
if ($realFile === false || !str_starts_with($realFile, $realBase . DIRECTORY_SEPARATOR) && $realFile !== $realBase) {
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

// If the path points to a directory, try index.html
if (is_dir($realFile)) {
    $indexFile = $realFile . DIRECTORY_SEPARATOR . 'index.html';
    if (is_file($indexFile)) {
        $realFile = $indexFile;
    }
}

// ── PHP files: execute directly ──────────────────────────
// (They already include auth.php via require_once, which is a no-op now)
if (pathinfo($realFile, PATHINFO_EXTENSION) === 'php') {
    if (is_file($realFile)) {
        require $realFile;
    } else {
        http_response_code(404);
        echo 'Not Found';
    }
    return true;
}

// ── Static files: let PHP built-in server handle them ────
// Return false tells PHP to serve the file as a static resource
return false;
