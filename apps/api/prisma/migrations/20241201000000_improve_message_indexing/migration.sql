-- Improve message indexing for better performance
-- Add composite indexes for cursor-based pagination and search

-- Add index for cursor-based pagination (conversationId + id)
CREATE INDEX IF NOT EXISTS "messages_conversationId_id_idx" ON "messages"("conversationId", "id");

-- Add composite index for message retrieval with soft delete filtering
CREATE INDEX IF NOT EXISTS "messages_conversationId_isDeleted_createdAt_idx" ON "messages"("conversationId", "isDeleted", "createdAt");

-- Add index for full-text search on content (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS "messages_content_gin_idx" ON "messages" USING gin(to_tsvector('english', "content"));

-- Add index for message type filtering in search
CREATE INDEX IF NOT EXISTS "messages_type_createdAt_idx" ON "messages"("type", "createdAt");

-- Add index for sender-based queries
CREATE INDEX IF NOT EXISTS "messages_senderId_createdAt_idx" ON "messages"("senderId", "createdAt");

-- Add index for reply message lookups
CREATE INDEX IF NOT EXISTS "messages_replyToId_idx" ON "messages"("replyToId") WHERE "replyToId" IS NOT NULL;

-- Add index for message receipts performance
CREATE INDEX IF NOT EXISTS "message_receipts_userId_timestamp_idx" ON "message_receipts"("userId", "timestamp");

-- Add index for conversation member last read tracking
CREATE INDEX IF NOT EXISTS "conversation_members_userId_lastReadAt_idx" ON "conversation_members"("userId", "lastReadAt");

-- Add partial index for active conversation members
CREATE INDEX IF NOT EXISTS "conversation_members_conversationId_isActive_idx" ON "conversation_members"("conversationId", "isActive") WHERE "isActive" = true;

-- Add index for message edit history
CREATE INDEX IF NOT EXISTS "message_edits_messageId_editedAt_idx" ON "message_edits"("messageId", "editedAt");

-- Add index for attachment queries
CREATE INDEX IF NOT EXISTS "attachments_messageId_mimeType_idx" ON "attachments"("messageId", "mimeType");

-- Add index for processed attachments
CREATE INDEX IF NOT EXISTS "attachments_isProcessed_isScanned_idx" ON "attachments"("isProcessed", "isScanned");