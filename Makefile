# Telegram Web Chat - Development Makefile

.PHONY: help install dev build test clean docker-up docker-down db-setup

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install all dependencies"
	@echo "  dev         - Start development environment"
	@echo "  build       - Build all packages"
	@echo "  test        - Run all tests"
	@echo "  clean       - Clean all build artifacts"
	@echo "  docker-up   - Start all Docker services"
	@echo "  docker-down - Stop all Docker services"
	@echo "  db-setup    - Set up database with migrations and seed data"

# Install dependencies
install:
	pnpm install

# Start development environment
dev: docker-up
	pnpm dev

# Build all packages
build:
	pnpm build

# Run all tests
test:
	pnpm test

# Clean build artifacts
clean:
	pnpm --recursive exec rm -rf dist build coverage
	docker-compose down -v

# Start Docker services
docker-up:
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10

# Stop Docker services
docker-down:
	docker-compose down

# Set up database
db-setup: docker-up
	@echo "Setting up database..."
	pnpm db:migrate
	pnpm db:seed
	@echo "Database setup complete!"

# Full setup for new developers
setup: install docker-up db-setup
	@echo "Setup complete! Run 'make dev' to start development."