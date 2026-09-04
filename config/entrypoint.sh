#!/bin/sh
set -e

# ── Fiscal Hub Entrypoint ──────────────────────────────────
# Starts PHP-FPM in background, then nginx in foreground.
# nginx running in foreground keeps the container alive.

# Ensure nginx runtime directory exists (/run is tmpfs in Docker)
mkdir -p /run/nginx

echo "Starting PHP-FPM..."
php-fpm -D

echo "Starting Nginx..."
exec nginx -g "daemon off;"
