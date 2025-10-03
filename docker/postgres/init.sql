-- Initialize PostgreSQL database for telegram-chat
-- This script runs when the container starts for the first time

-- Create additional databases if needed
-- CREATE DATABASE telegram_chat_test;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Set timezone
SET timezone = 'UTC';