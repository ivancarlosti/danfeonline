<?php
/**
 * Logout handler — destroys session and redirects to login page.
 */

require_once __DIR__ . '/auth.php';

auth_logout();

// Redirect to login page
header('Location: /login.html?logged_out=1');
exit;
