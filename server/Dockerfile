# syntax=docker/dockerfile:1
# ── Stage 1: install production deps ─────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# ci --omit=dev: only production dependencies, no dev/test tools in the image
RUN npm ci --omit=dev

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

# Run as non-root for security — never run Node apps as root in production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy prod node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only application source (no .env, no tests, no seed data)
COPY src/ ./src/
COPY server.js ./

# Ownership to the non-root user
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 5000
ENV NODE_ENV=production

CMD ["node", "server.js"]
