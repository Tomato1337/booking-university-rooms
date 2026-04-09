# ── Stage 1: Install dependencies ─────────────────────────────────────
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

# ── Stage 2: Build application ───────────────────────────────────────
FROM oven/bun:1-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# ── Stage 3: Serve with nginx ────────────────────────────────────────
FROM nginx:stable-alpine AS runtime

# Remove default nginx config and static files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Non-root user: nginx image runs worker processes as "nginx" by default,
# but the master process needs root for port 80.
# For rootless setup, switch to port 8080 and uncomment below:
# RUN sed -i 's/listen 80/listen 8080/' /etc/nginx/conf.d/default.conf
# USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
