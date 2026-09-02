# syntax=docker/dockerfile:1
# ── Stage 1: build the Vite app ───────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps first (layer-cached unless package.json changes)
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy source and build
COPY . .
# VITE_API_BASE_URL is injected at build time from docker-compose build args
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

# Copy built assets
COPY --from=builder /app/dist .

# Minimal nginx config: serve SPA, let the top-level nginx handle /api routing
COPY nginx.spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
