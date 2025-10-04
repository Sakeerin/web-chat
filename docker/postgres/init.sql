-- PostgreSQL initialization script
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases if needed
-- CREATE DATABASE telegram_chat_test;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
SELECT 'PostgreSQL initialized successfully' as status;