#!/bin/sh

# Create config.js from environment variables
echo "window.APP_CONFIG = {" > /usr/share/nginx/html/config.js
echo "  VITE_API_URL: \"$VITE_API_URL\"," >> /usr/share/nginx/html/config.js
echo "  VITE_WS_URL: \"$VITE_WS_URL\"" >> /usr/share/nginx/html/config.js
echo "};" >> /usr/share/nginx/html/config.js

# Start Nginx
exec nginx -g "daemon off;"
