-- ============================================================================
-- AGENTOS SAFE DATABASE SCHEMA (Incremental Update)
-- ============================================================================
-- Purpose: Safely add missing tables without breaking existing ones
-- Can be run multiple times safely (idempotent)
-- Standard: Henderson Standard - Fortune 50 Quality
-- Created: November 17, 2025 - 6:35 AM EST
-- ============================================================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- STEP 1: CHECK EXISTING TABLES
-- ============================================================================

DO $$
DECLARE
  existing_tables TEXT[];
BEGIN
  SELECT ARRAY_AGG(tablename) INTO existing_tables
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'properties', 'property_images', 'saved_properties',
    'tour_requests', 'conversations', 'conversation_participants', 'messages',
    'agent_availability', 'appointments', 'sales_transactions', 
    'commission_records', 'payout_requests', 'platform_settings',
    'email_logs', 'activity_logs', 'notifications'
  );
  
  RAISE NOTICE 'Found existing tables: %', existing_tables;
END $$;

-- ============================================================================
-- STEP 2: CREATE MISSING TABLES (Safe - won't error if exists)
-- ============================================================================

-- Updated_at trigger function (safe to recreate)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      phone TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'agent', 'customer')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      agent_bio TEXT,
      agent_license TEXT,
      agent_specialties TEXT[],
      agent_approval_status TEXT CHECK (agent_approval_status IN ('pending', 'approved', 'rejected')),
      agent_approved_at TIMESTAMPTZ,
      agent_approved_by UUID REFERENCES profiles(id),
      notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
      timezone TEXT DEFAULT 'America/New_York'
    );
    
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE 'Created table: profiles';
  ELSE
    RAISE NOTICE 'Table already exists: profiles';
  END IF;
END $$;

-- ============================================================================
-- PROPERTIES TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'properties') THEN
    CREATE TABLE properties (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      country TEXT DEFAULT 'USA',
      property_type TEXT NOT NULL CHECK (property_type IN ('house', 'condo', 'townhouse', 'land', 'commercial', 'multi-family')),
      bedrooms INTEGER,
      bathrooms DECIMAL(3,1),
      square_feet INTEGER,
      lot_size INTEGER,
      year_built INTEGER,
      price DECIMAL(12, 2) NOT NULL CHECK (price > 0),
      listing_type TEXT NOT NULL DEFAULT 'sale' CHECK (listing_type IN ('sale', 'rent', 'lease')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'pending', 'sold', 'inactive')),
      features TEXT[],
      amenities TEXT[],
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      views_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ,
      sold_at TIMESTAMPTZ
    );
    
    CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE INDEX idx_properties_agent_id ON properties(agent_id);
    CREATE INDEX idx_properties_status ON properties(status);
    CREATE INDEX idx_properties_city ON properties(city);
    CREATE INDEX idx_properties_price ON properties(price);
    CREATE INDEX idx_properties_created_at ON properties(created_at DESC);
    
    RAISE NOTICE 'Created table: properties';
  ELSE
    RAISE NOTICE 'Table already exists: properties';
  END IF;
END $$;

-- ============================================================================
-- PROPERTY IMAGES TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'property_images') THEN
    CREATE TABLE property_images (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      cloudinary_id TEXT NOT NULL,
      thumbnail_url TEXT,
      display_order INTEGER DEFAULT 0,
      is_primary BOOLEAN DEFAULT FALSE,
      uploaded_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_property_images_property_id ON property_images(property_id);
    CREATE INDEX idx_property_images_order ON property_images(property_id, display_order);
    
    RAISE NOTICE 'Created table: property_images';
  ELSE
    RAISE NOTICE 'Table already exists: property_images';
  END IF;
END $$;

-- ============================================================================
-- SAVED PROPERTIES TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saved_properties') THEN
    CREATE TABLE saved_properties (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(customer_id, property_id)
    );
    
    CREATE INDEX idx_saved_properties_customer_id ON saved_properties(customer_id);
    CREATE INDEX idx_saved_properties_property_id ON saved_properties(property_id);
    
    RAISE NOTICE 'Created table: saved_properties';
  ELSE
    RAISE NOTICE 'Table already exists: saved_properties';
  END IF;
END $$;

-- ============================================================================
-- TOUR REQUESTS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tour_requests') THEN
    CREATE TABLE tour_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      preferred_date DATE NOT NULL,
      preferred_time TIME NOT NULL,
      alternate_dates JSONB,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
      message TEXT,
      confirmed_date TIMESTAMPTZ,
      confirmed_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE TRIGGER tour_requests_updated_at BEFORE UPDATE ON tour_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE INDEX idx_tour_requests_property_id ON tour_requests(property_id);
    CREATE INDEX idx_tour_requests_customer_id ON tour_requests(customer_id);
    CREATE INDEX idx_tour_requests_agent_id ON tour_requests(agent_id);
    CREATE INDEX idx_tour_requests_status ON tour_requests(status);
    
    RAISE NOTICE 'Created table: tour_requests';
  ELSE
    RAISE NOTICE 'Table already exists: tour_requests';
  END IF;
END $$;

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') THEN
    CREATE TABLE conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMPTZ
    );
    
    CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE 'Created table: conversations';
  ELSE
    RAISE NOTICE 'Table already exists: conversations';
  END IF;
END $$;

-- ============================================================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversation_participants') THEN
    CREATE TABLE conversation_participants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_read_at TIMESTAMPTZ,
      UNIQUE(conversation_id, user_id)
    );
    
    CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
    CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
    
    RAISE NOTICE 'Created table: conversation_participants';
  ELSE
    RAISE NOTICE 'Table already exists: conversation_participants';
  END IF;
END $$;

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    CREATE TABLE messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_by UUID[],
      attachment_url TEXT,
      metadata JSONB
    );
    
    CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX idx_messages_sender_id ON messages(sender_id);
    CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at DESC);
    
    RAISE NOTICE 'Created table: messages';
  ELSE
    RAISE NOTICE 'Table already exists: messages';
  END IF;
END $$;

-- ============================================================================
-- AGENT AVAILABILITY TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agent_availability') THEN
    CREATE TABLE agent_availability (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(agent_id, day_of_week, start_time)
    );
    
    CREATE INDEX idx_agent_availability_agent_id ON agent_availability(agent_id);
    
    RAISE NOTICE 'Created table: agent_availability';
  ELSE
    RAISE NOTICE 'Table already exists: agent_availability';
  END IF;
END $$;

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
    CREATE TABLE appointments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      appointment_type TEXT NOT NULL CHECK (appointment_type IN ('showing', 'meeting', 'inspection', 'closing', 'other')),
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
      location TEXT,
      notes TEXT,
      reminder_sent BOOLEAN DEFAULT FALSE,
      reminder_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE INDEX idx_appointments_agent_id ON appointments(agent_id);
    CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
    CREATE INDEX idx_appointments_start_time ON appointments(start_time);
    CREATE INDEX idx_appointments_status ON appointments(status);
    
    RAISE NOTICE 'Created table: appointments';
  ELSE
    RAISE NOTICE 'Table already exists: appointments';
  END IF;
END $$;

-- ============================================================================
-- SALES TRANSACTIONS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sales_transactions') THEN
    CREATE TABLE sales_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      property_id UUID NOT NULL REFERENCES properties(id),
      agent_id UUID NOT NULL REFERENCES profiles(id),
      buyer_id UUID REFERENCES profiles(id),
      sale_price DECIMAL(12, 2) NOT NULL CHECK (sale_price > 0),
      commission_rate DECIMAL(5, 4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
      commission_amount DECIMAL(12, 2) NOT NULL CHECK (commission_amount >= 0),
      sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
      notes TEXT
    );
    
    CREATE TRIGGER sales_transactions_updated_at BEFORE UPDATE ON sales_transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE INDEX idx_sales_transactions_agent_id ON sales_transactions(agent_id);
    CREATE INDEX idx_sales_transactions_property_id ON sales_transactions(property_id);
    CREATE INDEX idx_sales_transactions_sale_date ON sales_transactions(sale_date DESC);
    
    RAISE NOTICE 'Created table: sales_transactions';
  ELSE
    RAISE NOTICE 'Table already exists: sales_transactions';
  END IF;
END $$;

-- ============================================================================
-- COMMISSION RECORDS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commission_records') THEN
    CREATE TABLE commission_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      transaction_id UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
      agent_id UUID NOT NULL REFERENCES profiles(id),
      commission_amount DECIMAL(12, 2) NOT NULL CHECK (commission_amount >= 0),
      commission_rate DECIMAL(5, 4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
      approved_by UUID REFERENCES profiles(id),
      approved_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE TRIGGER commission_records_updated_at BEFORE UPDATE ON commission_records
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE INDEX idx_commission_records_agent_id ON commission_records(agent_id);
    CREATE INDEX idx_commission_records_transaction_id ON commission_records(transaction_id);
    CREATE INDEX idx_commission_records_status ON commission_records(status);
    
    RAISE NOTICE 'Created table: commission_records';
  ELSE
    RAISE NOTICE 'Table already exists: commission_records';
  END IF;
END $$;

-- ============================================================================
-- PAYOUT REQUESTS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payout_requests') THEN
    CREATE TABLE payout_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      agent_id UUID NOT NULL REFERENCES profiles(id),
      amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
      payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'check', 'paypal')),
      payment_details JSONB,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_by UUID REFERENCES profiles(id),
      reviewed_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      notes TEXT,
      admin_notes TEXT
    );
    
    CREATE INDEX idx_payout_requests_agent_id ON payout_requests(agent_id);
    CREATE INDEX idx_payout_requests_status ON payout_requests(status);
    CREATE INDEX idx_payout_requests_requested_at ON payout_requests(requested_at DESC);
    
    RAISE NOTICE 'Created table: payout_requests';
  ELSE
    RAISE NOTICE 'Table already exists: payout_requests';
  END IF;
END $$;

-- ============================================================================
-- PLATFORM SETTINGS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'platform_settings') THEN
    CREATE TABLE platform_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      key TEXT UNIQUE NOT NULL,
      value JSONB NOT NULL,
      updated_by UUID REFERENCES profiles(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    -- Insert default settings
    INSERT INTO platform_settings (key, value) VALUES
      ('default_commission_rate', '0.03'::jsonb),
      ('minimum_payout_amount', '100'::jsonb),
      ('payout_schedule', '"monthly"'::jsonb);
    
    RAISE NOTICE 'Created table: platform_settings';
  ELSE
    RAISE NOTICE 'Table already exists: platform_settings';
  END IF;
END $$;

-- ============================================================================
-- EMAIL LOGS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_logs') THEN
    CREATE TABLE email_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      to_email TEXT NOT NULL,
      from_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_name TEXT,
      status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'bounced')),
      error_message TEXT,
      metadata JSONB,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
    CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
    CREATE INDEX idx_email_logs_status ON email_logs(status);
    
    RAISE NOTICE 'Created table: email_logs';
  ELSE
    RAISE NOTICE 'Table already exists: email_logs';
  END IF;
END $$;

-- ============================================================================
-- ACTIVITY LOGS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
    CREATE TABLE activity_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id UUID,
      metadata JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
    CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
    CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
    
    RAISE NOTICE 'Created table: activity_logs';
  ELSE
    RAISE NOTICE 'Table already exists: activity_logs';
  END IF;
END $$;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
    CREATE TABLE notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
      link TEXT,
      read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    CREATE INDEX idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX idx_notifications_read ON notifications(user_id, read);
    CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
    
    RAISE NOTICE 'Created table: notifications';
  ELSE
    RAISE NOTICE 'Table already exists: notifications';
  END IF;
END $$;

-- ============================================================================
-- FINAL COUNT
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'properties', 'property_images', 'saved_properties',
    'tour_requests', 'conversations', 'conversation_participants', 'messages',
    'agent_availability', 'appointments', 'sales_transactions', 
    'commission_records', 'payout_requests', 'platform_settings',
    'email_logs', 'activity_logs', 'notifications'
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database Setup Complete!';
  RAISE NOTICE 'Tables found: % out of 17 required', table_count;
  RAISE NOTICE '========================================';
  
  IF table_count = 17 THEN
    RAISE NOTICE '✅ ALL AGENTOS TABLES PRESENT!';
  ELSE
    RAISE WARNING '⚠️ Some tables may be missing';
  END IF;
END $$;
