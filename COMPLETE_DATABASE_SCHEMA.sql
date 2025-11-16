-- ============================================================================
-- AGENTOS COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Purpose: Complete database setup for AgentOS v1.0 (Phases 1-8)
-- Standard: Henderson Standard - Fortune 50 Quality
-- Created: November 17, 2025 - 6:15 AM EST
-- Author: Claude + Roy Henderson Partnership
-- ============================================================================

-- This schema includes ALL tables needed for:
-- ✓ Phase 1: Authentication & User Management
-- ✓ Phase 2: Admin & Customer Portals
-- ✓ Phase 3: Image Upload System
-- ✓ Phase 4: Email Notifications
-- ✓ Phase 5: Messaging System
-- ✓ Phase 6: Calendar & Scheduling
-- ✓ Phase 7: Revenue Tracking
-- ✓ Phase 8: Final Polish

-- ============================================================================
-- ENABLE REQUIRED EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- PHASE 1: AUTHENTICATION & USER MANAGEMENT
-- ============================================================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'agent', 'customer')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Agent-specific fields
  agent_bio TEXT,
  agent_license TEXT,
  agent_specialties TEXT[],
  agent_approval_status TEXT CHECK (agent_approval_status IN ('pending', 'approved', 'rejected')),
  agent_approved_at TIMESTAMPTZ,
  agent_approved_by UUID REFERENCES profiles(id),
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  timezone TEXT DEFAULT 'America/New_York'
);

-- Create updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 2: PROPERTIES & LISTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  
  -- Property Details
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'condo', 'townhouse', 'land', 'commercial', 'multi-family')),
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  lot_size INTEGER,
  year_built INTEGER,
  
  -- Pricing
  price DECIMAL(12, 2) NOT NULL CHECK (price > 0),
  listing_type TEXT NOT NULL DEFAULT 'sale' CHECK (listing_type IN ('sale', 'rent', 'lease')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'pending', 'sold', 'inactive')),
  
  -- Features
  features TEXT[],
  amenities TEXT[],
  
  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metadata
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ
);

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for properties
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- ============================================================================
-- PHASE 3: IMAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_images (
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

CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_order ON property_images(property_id, display_order);

-- ============================================================================
-- SAVED PROPERTIES (Customer Feature)
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_properties_customer_id ON saved_properties(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_property_id ON saved_properties(property_id);

-- ============================================================================
-- TOUR REQUESTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tour_requests (
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

CREATE TRIGGER tour_requests_updated_at
  BEFORE UPDATE ON tour_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tour_requests_property_id ON tour_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_tour_requests_customer_id ON tour_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_tour_requests_agent_id ON tour_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_tour_requests_status ON tour_requests(status);

-- ============================================================================
-- PHASE 5: MESSAGING SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_by UUID[],
  attachment_url TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(conversation_id, created_at DESC);

-- ============================================================================
-- PHASE 6: CALENDAR & SCHEDULING
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_agent_availability_agent_id ON agent_availability(agent_id);

CREATE TABLE IF NOT EXISTS appointments (
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

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_appointments_agent_id ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ============================================================================
-- PHASE 7: REVENUE TRACKING & COMMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_transactions (
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

CREATE TRIGGER sales_transactions_updated_at
  BEFORE UPDATE ON sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_sales_transactions_agent_id ON sales_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_property_id ON sales_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_sale_date ON sales_transactions(sale_date DESC);

CREATE TABLE IF NOT EXISTS commission_records (
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

CREATE TRIGGER commission_records_updated_at
  BEFORE UPDATE ON commission_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_commission_records_agent_id ON commission_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_transaction_id ON commission_records(transaction_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);

CREATE TABLE IF NOT EXISTS payout_requests (
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

CREATE INDEX IF NOT EXISTS idx_payout_requests_agent_id ON payout_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requested_at ON payout_requests(requested_at DESC);

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (key, value) VALUES
  ('default_commission_rate', '0.03'::jsonb),
  ('minimum_payout_amount', '100'::jsonb),
  ('payout_schedule', '"monthly"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- EMAIL TRACKING (Phase 4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
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

CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- ============================================================================
-- ACTIVITY TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
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

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
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

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Properties policies
CREATE POLICY "Properties viewable by everyone"
  ON properties FOR SELECT
  USING (status = 'active' OR agent_id = auth.uid());

CREATE POLICY "Agents can insert own properties"
  ON properties FOR INSERT
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update own properties"
  ON properties FOR UPDATE
  USING (agent_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view own conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Commissions policies
CREATE POLICY "Agents view own commissions"
  ON commission_records FOR SELECT
  USING (agent_id = auth.uid());

-- Admin access to everything
CREATE POLICY "Admins have full access"
  ON profiles FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to properties"
  ON properties FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to commissions"
  ON commission_records FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins have full access to payouts"
  ON payout_requests FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Function to calculate commission amount
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  NEW.commission_amount := NEW.sale_price * NEW.commission_rate;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_transactions_calculate_commission
  BEFORE INSERT OR UPDATE ON sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_commission();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Agent dashboard stats view
CREATE OR REPLACE VIEW agent_dashboard_stats AS
SELECT 
  p.agent_id,
  COUNT(DISTINCT p.id) as total_properties,
  COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_listings,
  COUNT(DISTINCT st.id) as total_sales,
  COALESCE(SUM(st.sale_price), 0) as total_sales_volume,
  COALESCE(SUM(cr.commission_amount), 0) as total_commissions,
  COALESCE(SUM(CASE WHEN cr.status = 'paid' THEN cr.commission_amount ELSE 0 END), 0) as paid_commissions,
  COALESCE(SUM(CASE WHEN cr.status = 'pending' THEN cr.commission_amount ELSE 0 END), 0) as pending_commissions
FROM profiles p
LEFT JOIN properties ON p.id = properties.agent_id
LEFT JOIN sales_transactions st ON p.id = st.agent_id
LEFT JOIN commission_records cr ON p.id = cr.agent_id
WHERE p.role = 'agent'
GROUP BY p.agent_id;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Note: Actual user data comes from Supabase Auth
-- This section is commented out but available for development/testing

/*
-- Sample admin user (update with real user ID after signup)
-- INSERT INTO profiles (id, email, full_name, role) VALUES
--   ('00000000-0000-0000-0000-000000000000', 'admin@agentos.com', 'Admin User', 'admin');
*/

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Verify all tables created
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
  
  RAISE NOTICE 'Created % out of 17 required tables', table_count;
  
  IF table_count = 17 THEN
    RAISE NOTICE '✅ ALL AGENTOS TABLES CREATED SUCCESSFULLY!';
  ELSE
    RAISE WARNING '⚠️ Some tables may be missing. Expected 17, found %', table_count;
  END IF;
END $$;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
