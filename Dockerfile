# Multi-stage build for the entire application
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build all packages
RUN pnpm build

# API production image
FROM node:20-alpine AS api-production
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app
COPY --from=base --chown=nestjs:nodejs /app/apps/api/dist ./
COPY --from=base --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs apps/api/prisma ./prisma
RUN npm install -g prisma
USER nestjs
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]

# Web production image
FROM nginx:alpine AS web-production
RUN apk add --no-cache dumb-init
COPY --from=base /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
RUN addgroup -g 1001 -S nginx-app && adduser -S nginx-app -u 1001 -G nginx-app
RUN chown -R nginx-app:nginx-app /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid && chown nginx-app:nginx-app /var/run/nginx.pid
USER nginx-app
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1
EXPOSE 80
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]