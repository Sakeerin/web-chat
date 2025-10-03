# Multi-stage build for NestJS API
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development
COPY . .
RUN pnpm build --filter api
EXPOSE 3000
CMD ["pnpm", "--filter", "api", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN pnpm build --filter api
RUN pnpm --filter api --prod deploy /app/dist

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build --chown=nestjs:nodejs /app/dist ./
COPY --from=build --chown=nestjs:nodejs /app/dist/node_modules ./node_modules

# Copy Prisma files
COPY --chown=nestjs:nodejs apps/api/prisma ./prisma

# Install Prisma CLI for migrations
RUN npm install -g prisma

# Switch to non-root user
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Expose port
EXPOSE 3000

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]