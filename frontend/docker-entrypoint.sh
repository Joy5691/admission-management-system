#!/bin/sh
# Substitute BACKEND_URL env var into config.js
BACKEND_URL=${BACKEND_URL:-http://localhost:8080}
sed -i "s|__BACKEND_URL__|${BACKEND_URL}|g" /usr/share/nginx/html/config.js
exec "$@"
