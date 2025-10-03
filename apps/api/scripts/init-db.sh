#!/bin/bash

# Database initialization script for Telegram Web Chat
# This script sets up the database from scratch

set -e

echo "🚀 Initializing Telegram Web Chat Database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start database services
echo "📦 Starting database services..."
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=30
counter=0
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ PostgreSQL failed to start within $timeout seconds"
        exit 1
    fi
    echo "   Waiting... ($counter/$timeout)"
    sleep 1
    counter=$((counter + 1))
done

echo "✅ PostgreSQL is ready!"

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run migrations
echo "📊 Running database migrations..."
npm run db:migrate

# Seed development data
echo "🌱 Seeding development data..."
npm run db:seed

# Validate schema
echo "🔍 Validating schema..."
npm run db:validate

echo ""
echo "🎉 Database initialization completed successfully!"
echo ""
echo "📋 Summary:"
echo "   - PostgreSQL running on localhost:5432"
echo "   - Redis running on localhost:6379"
echo "   - Database: telegram_chat"
echo "   - Schema: Latest migration applied"
echo "   - Seed data: 4 users, 2 conversations, 7 messages"
echo ""
echo "🔗 Useful commands:"
echo "   npm run db:studio    # Open Prisma Studio"
echo "   npm run db:reset     # Reset database (destructive)"
echo "   npm run db:validate  # Validate schema"
echo ""