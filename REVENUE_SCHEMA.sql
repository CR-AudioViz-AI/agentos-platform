-- ============================================================================
-- AgentOS Phase 7: Revenue Tracking Database Schema
-- ============================================================================
-- Created: November 17, 2025 - 4:40 AM EST
-- Standard: Henderson Standard - Fortune 50 Quality
-- Author: Claude + Roy Henderson Partnership
--
-- CRITICAL: Run this SQL in Supabase SQL Editor before deploying Phase 7
-- ============================================================================

-- ============================================================================
-- TABLE: sales_transactions
-- Stores all property sales with commission details
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Financial Details
  sale_price DECIMAL(12, 2) NOT NULL CHECK (sale_price > 0),
  commission_rate DECIMAL(5, 4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
  commission_amount DECIMAL(12, 2) NOT NULL CHECK (commission_amount >= 0),
  
  -- Dates
  sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  -- Additional Info
  notes TEXT,
  
  -- Indexes for performance
  CONSTRAINT sales_transactions_property_unique UNIQUE (property_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sales_agent ON public.sales_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sales_buyer ON public.sales_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales_transactions(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales_transactions(status);

-- Enable Row Level Security
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all sales" ON public.sales_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Agents can view their sales" ON public.sales_transactions
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Buyers can view their purchases" ON public.sales_transactions
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Admins can insert sales" ON public.sales_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update sales" ON public.sales_transactions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- TABLE: commission_records
-- Tracks commission payments to agents
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.commission_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_transaction_id UUID NOT NULL REFERENCES public.sales_transactions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Property Info (denormalized for reporting)
  property_address TEXT NOT NULL,
  
  -- Financial Details
  sale_price DECIMAL(12, 2) NOT NULL,
  commission_rate DECIMAL(5, 4) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL,
  
  -- Dates
  sale_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Approval/Payment Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  approved_date TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_date TIMESTAMPTZ,
  
  -- Payout Details
  payout_method TEXT CHECK (payout_method IN ('direct_deposit', 'check', 'wire')),
  
  -- Additional Info
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_commission_agent ON public.commission_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_commission_sale ON public.commission_records(sale_transaction_id);
CREATE INDEX IF NOT EXISTS idx_commission_status ON public.commission_records(status);
CREATE INDEX IF NOT EXISTS idx_commission_sale_date ON public.commission_records(sale_date);
CREATE INDEX IF NOT EXISTS idx_commission_approved_by ON public.commission_records(approved_by);

-- Enable Row Level Security
ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all commissions" ON public.commission_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Agents can view their commissions" ON public.commission_records
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Admins can manage commissions" ON public.commission_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- TABLE: payout_requests
-- Tracks agent payout requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Commission Details
  commission_ids UUID[] NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount > 0),
  
  -- Payout Details
  payout_method TEXT NOT NULL CHECK (payout_method IN ('direct_deposit', 'check', 'wire')),
  
  -- Dates
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  
  -- Approval
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  -- Additional Info
  notes TEXT,
  admin_notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payout_agent ON public.payout_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_payout_status ON public.payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requested ON public.payout_requests(requested_at);

-- Enable Row Level Security
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all payout requests" ON public.payout_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Agents can view their payout requests" ON public.payout_requests
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

CREATE POLICY "Agents can create payout requests" ON public.payout_requests
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Admins can update payout requests" ON public.payout_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- TABLE: platform_settings
-- Stores platform-wide configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Commission Settings
  default_commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.03,
  
  -- Other Settings
  settings_name TEXT NOT NULL UNIQUE DEFAULT 'default',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO public.platform_settings (settings_name, default_commission_rate)
VALUES ('default', 0.03)
ON CONFLICT (settings_name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view platform settings" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can update platform settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_sales_transactions_updated_at ON public.sales_transactions;
CREATE TRIGGER update_sales_transactions_updated_at
  BEFORE UPDATE ON public.sales_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_commission_records_updated_at ON public.commission_records;
CREATE TRIGGER update_commission_records_updated_at
  BEFORE UPDATE ON public.commission_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for revenue tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify the schema was created successfully:

-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
--   AND tablename IN ('sales_transactions', 'commission_records', 'payout_requests', 'platform_settings');

-- SELECT * FROM public.platform_settings;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
