# Build Stage
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built assets from previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Optional: Copy custom nginx config if needed (using default for now is usually fine for SPA)
# If using React Router with history mode, you might need a simple nginx.conf
# This line ensures fallback to index.html for SPA routing:
RUN echo 'server { \
    listen 80; \
    location / { \
    root   /usr/share/nginx/html; \
    index  index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
