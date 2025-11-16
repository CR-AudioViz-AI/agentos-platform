-- ============================================================================
-- AGENTOS MESSAGING SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- Created: November 17, 2025 - 2:05 AM EST
-- Purpose: Real-time messaging between agents, buyers, and sellers
-- Features: Conversations, messages, typing indicators, read receipts
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
-- Stores conversation metadata between users

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Participants (always exactly 2 users)
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Related entity (property or tour)
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  
  -- Conversation metadata
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  
  -- Soft delete
  archived_by_user1 BOOLEAN DEFAULT FALSE,
  archived_by_user2 BOOLEAN DEFAULT FALSE,
  
  -- Ensure no duplicate conversations between same two users
  CONSTRAINT unique_conversation UNIQUE (user1_id, user2_id),
  
  -- Ensure users can't message themselves
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Indexes for performance
CREATE INDEX idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX idx_conversations_property ON conversations(property_id);
CREATE INDEX idx_conversations_tour ON conversations(tour_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
-- Stores individual messages within conversations

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Relationships
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'property_share', 'tour_update')),
  
  -- Read tracking
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  -- Validation
  CONSTRAINT content_length CHECK (LENGTH(TRIM(content)) > 0)
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id, read) WHERE read = FALSE;

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Auto-update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_metadata
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================================
-- TYPING INDICATORS TABLE
-- ============================================================================
-- Tracks when users are typing (ephemeral data, auto-expires)

CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 seconds',
  
  CONSTRAINT unique_typing_indicator UNIQUE (conversation_id, user_id)
);

-- Index for quick lookups
CREATE INDEX idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX idx_typing_indicators_expires ON typing_indicators(expires_at);

-- Auto-cleanup expired typing indicators (runs every minute)
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CONVERSATIONS RLS POLICIES
-- ============================================================================

-- Users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Users can create conversations with other users
CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Users can update their own conversation metadata (archive status)
CREATE POLICY "Users can update their conversations"
  ON conversations
  FOR UPDATE
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  )
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- MESSAGES RLS POLICIES
-- ============================================================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Users can update (mark as read) messages in their conversations
CREATE POLICY "Users can update messages in their conversations"
  ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Users can soft-delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR UPDATE
  USING (
    sender_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid()
  );

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- TYPING INDICATORS RLS POLICIES
-- ============================================================================

-- Users can view typing indicators in their conversations
CREATE POLICY "Users can view typing indicators in their conversations"
  ON typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = typing_indicators.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Users can create typing indicators in their conversations
CREATE POLICY "Users can create typing indicators"
  ON typing_indicators
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = typing_indicators.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

-- Users can delete their own typing indicators
CREATE POLICY "Users can delete their typing indicators"
  ON typing_indicators
  FOR DELETE
  USING (
    user_id = auth.uid()
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user1_id UUID,
  p_user2_id UUID,
  p_property_id UUID DEFAULT NULL,
  p_tour_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_min_user_id UUID;
  v_max_user_id UUID;
BEGIN
  -- Normalize user IDs (smaller ID always as user1)
  IF p_user1_id < p_user2_id THEN
    v_min_user_id := p_user1_id;
    v_max_user_id := p_user2_id;
  ELSE
    v_min_user_id := p_user2_id;
    v_max_user_id := p_user1_id;
  END IF;
  
  -- Check if conversation exists
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE user1_id = v_min_user_id
  AND user2_id = v_max_user_id;
  
  -- Create if doesn't exist
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (user1_id, user2_id, property_id, tour_id)
    VALUES (v_min_user_id, v_max_user_id, p_property_id, p_tour_id)
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread message count for user
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE (c.user1_id = p_user_id OR c.user2_id = p_user_id)
  AND m.sender_id != p_user_id
  AND m.read = FALSE
  AND m.deleted = FALSE;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all messages in conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE messages
  SET 
    read = TRUE,
    read_at = NOW()
  WHERE conversation_id = p_conversation_id
  AND sender_id != p_user_id
  AND read = FALSE
  AND deleted = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
-- Enable Supabase Realtime for these tables

-- Drop existing publication if exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create publication with messaging tables
CREATE PUBLICATION supabase_realtime FOR TABLE 
  conversations,
  messages,
  typing_indicators;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================
-- Uncomment to insert sample conversations

/*
-- Create test conversation
INSERT INTO conversations (user1_id, user2_id, last_message_preview)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000002'::UUID,
  'Hey, are you available for a property showing?'
);

-- Create test messages
INSERT INTO messages (conversation_id, sender_id, content)
SELECT 
  c.id,
  c.user1_id,
  'Hey, are you available for a property showing?'
FROM conversations c
LIMIT 1;
*/

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on functions
GRANT EXECUTE ON FUNCTION get_or_create_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the schema is working

/*
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'typing_indicators');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages', 'typing_indicators');

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages', 'typing_indicators');

-- Test get_or_create_conversation function
SELECT get_or_create_conversation(
  '00000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000002'::UUID
);
*/

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Create maintenance function to clean up old typing indicators
CREATE OR REPLACE FUNCTION perform_messaging_maintenance()
RETURNS void AS $$
BEGIN
  -- Clean up expired typing indicators
  DELETE FROM typing_indicators WHERE expires_at < NOW();
  
  -- Optional: Archive old conversations (older than 1 year with no activity)
  -- UPDATE conversations 
  -- SET archived_by_user1 = TRUE, archived_by_user2 = TRUE
  -- WHERE last_message_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance (requires pg_cron extension)
-- SELECT cron.schedule('messaging-maintenance', '*/5 * * * *', 'SELECT perform_messaging_maintenance()');

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
