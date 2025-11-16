-- ============================================================================
-- AGENTOS CALENDAR & SCHEDULING SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- Created: November 17, 2025 - 2:40 AM EST
-- Purpose: Property tour scheduling, agent availability, and calendar management
-- Features: Recurring availability, conflict detection, reminders, blackout dates
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AGENT AVAILABILITY TABLE
-- ============================================================================
-- Stores agent availability schedules and patterns

CREATE TABLE IF NOT EXISTS agent_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Agent reference
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Availability type
  availability_type VARCHAR(50) NOT NULL CHECK (availability_type IN ('one_time', 'recurring', 'blackout')),
  
  -- For one-time availability
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  
  -- For recurring availability
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME,
  end_time TIME,
  recurring_start_date DATE,
  recurring_end_date DATE,
  
  -- Metadata
  title VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Buffer time (minutes before/after appointments)
  buffer_before INTEGER DEFAULT 15,
  buffer_after INTEGER DEFAULT 15,
  
  -- Constraints
  CONSTRAINT valid_one_time_dates CHECK (
    availability_type != 'one_time' OR (start_datetime IS NOT NULL AND end_datetime IS NOT NULL AND start_datetime < end_datetime)
  ),
  CONSTRAINT valid_recurring_time CHECK (
    availability_type != 'recurring' OR (day_of_week IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL)
  ),
  CONSTRAINT valid_blackout_dates CHECK (
    availability_type != 'blackout' OR (start_datetime IS NOT NULL AND end_datetime IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_agent_availability_agent ON agent_availability(agent_id);
CREATE INDEX idx_agent_availability_type ON agent_availability(availability_type);
CREATE INDEX idx_agent_availability_dates ON agent_availability(start_datetime, end_datetime);
CREATE INDEX idx_agent_availability_day ON agent_availability(day_of_week);
CREATE INDEX idx_agent_availability_active ON agent_availability(is_active) WHERE is_active = TRUE;

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_agent_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_availability_updated_at
  BEFORE UPDATE ON agent_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_availability_updated_at();

-- ============================================================================
-- ENHANCE EXISTING TOURS TABLE
-- ============================================================================
-- Add calendar and reminder fields to existing tours table

-- Only add columns if they don't exist
DO $$
BEGIN
  -- Calendar integration fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'calendar_event_id') THEN
    ALTER TABLE tours ADD COLUMN calendar_event_id VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'ics_file_url') THEN
    ALTER TABLE tours ADD COLUMN ics_file_url TEXT;
  END IF;
  
  -- Reminder tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'reminder_24h_sent') THEN
    ALTER TABLE tours ADD COLUMN reminder_24h_sent BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'reminder_1h_sent') THEN
    ALTER TABLE tours ADD COLUMN reminder_1h_sent BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'reminder_24h_sent_at') THEN
    ALTER TABLE tours ADD COLUMN reminder_24h_sent_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'reminder_1h_sent_at') THEN
    ALTER TABLE tours ADD COLUMN reminder_1h_sent_at TIMESTAMPTZ;
  END IF;
  
  -- Rescheduling tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'original_scheduled_for') THEN
    ALTER TABLE tours ADD COLUMN original_scheduled_for TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'rescheduled_count') THEN
    ALTER TABLE tours ADD COLUMN rescheduled_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tours' AND column_name = 'reschedule_reason') THEN
    ALTER TABLE tours ADD COLUMN reschedule_reason TEXT;
  END IF;
END $$;

-- Create index for tour scheduling queries
CREATE INDEX IF NOT EXISTS idx_tours_scheduled_for ON tours(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_tours_agent_date ON tours(agent_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_tours_reminders ON tours(scheduled_for, reminder_24h_sent, reminder_1h_sent) 
  WHERE status IN ('confirmed', 'rescheduled');

-- ============================================================================
-- TOUR CONFLICTS VIEW
-- ============================================================================
-- View to easily identify scheduling conflicts

CREATE OR REPLACE VIEW tour_conflicts AS
SELECT 
  t1.id as tour1_id,
  t2.id as tour2_id,
  t1.agent_id,
  t1.scheduled_for as tour1_time,
  t2.scheduled_for as tour2_time,
  t1.status as tour1_status,
  t2.status as tour2_status,
  EXTRACT(EPOCH FROM (t2.scheduled_for - t1.scheduled_for))/60 as minutes_apart
FROM tours t1
JOIN tours t2 ON t1.agent_id = t2.agent_id
WHERE t1.id < t2.id  -- Avoid duplicate pairs
  AND t1.status IN ('confirmed', 'rescheduled')
  AND t2.status IN ('confirmed', 'rescheduled')
  AND ABS(EXTRACT(EPOCH FROM (t2.scheduled_for - t1.scheduled_for))/60) < 90  -- Within 90 minutes
ORDER BY t1.agent_id, t1.scheduled_for;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if agent is available at specific datetime
CREATE OR REPLACE FUNCTION is_agent_available(
  p_agent_id UUID,
  p_datetime TIMESTAMPTZ,
  p_duration_minutes INTEGER DEFAULT 60,
  p_exclude_tour_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_time TIME;
  v_end_time TIMESTAMPTZ;
  v_has_blackout BOOLEAN;
  v_has_recurring BOOLEAN;
  v_has_conflict BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_datetime);
  v_time := p_datetime::TIME;
  v_end_time := p_datetime + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Check for blackout dates
  SELECT EXISTS (
    SELECT 1 FROM agent_availability
    WHERE agent_id = p_agent_id
    AND availability_type = 'blackout'
    AND is_active = TRUE
    AND p_datetime >= start_datetime
    AND p_datetime < end_datetime
  ) INTO v_has_blackout;
  
  IF v_has_blackout THEN
    RETURN FALSE;
  END IF;
  
  -- Check if time falls within recurring availability
  SELECT EXISTS (
    SELECT 1 FROM agent_availability
    WHERE agent_id = p_agent_id
    AND availability_type = 'recurring'
    AND is_active = TRUE
    AND day_of_week = v_day_of_week
    AND v_time >= start_time
    AND v_time < end_time
    AND (recurring_start_date IS NULL OR p_datetime::DATE >= recurring_start_date)
    AND (recurring_end_date IS NULL OR p_datetime::DATE <= recurring_end_date)
  ) INTO v_has_recurring;
  
  IF NOT v_has_recurring THEN
    -- Check for one-time availability
    SELECT EXISTS (
      SELECT 1 FROM agent_availability
      WHERE agent_id = p_agent_id
      AND availability_type = 'one_time'
      AND is_active = TRUE
      AND p_datetime >= start_datetime
      AND p_datetime < end_datetime
    ) INTO v_has_recurring;
    
    IF NOT v_has_recurring THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Check for conflicting tours (with buffer time)
  SELECT EXISTS (
    SELECT 1 FROM tours
    WHERE agent_id = p_agent_id
    AND status IN ('confirmed', 'rescheduled')
    AND (p_exclude_tour_id IS NULL OR id != p_exclude_tour_id)
    AND (
      (scheduled_for - INTERVAL '15 minutes' < v_end_time AND 
       scheduled_for + INTERVAL '1 hour 15 minutes' > p_datetime)
    )
  ) INTO v_has_conflict;
  
  RETURN NOT v_has_conflict;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get available time slots for agent on specific date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_agent_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60,
  p_slot_interval_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  is_available BOOLEAN
) AS $$
DECLARE
  v_current_time TIMESTAMPTZ;
  v_end_of_day TIMESTAMPTZ;
  v_day_of_week INTEGER;
BEGIN
  v_current_time := p_date::TIMESTAMPTZ + TIME '08:00:00';
  v_end_of_day := p_date::TIMESTAMPTZ + TIME '20:00:00';
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  WHILE v_current_time < v_end_of_day LOOP
    slot_start := v_current_time;
    slot_end := v_current_time + (p_duration_minutes || ' minutes')::INTERVAL;
    is_available := is_agent_available(p_agent_id, v_current_time, p_duration_minutes);
    
    RETURN NEXT;
    
    v_current_time := v_current_time + (p_slot_interval_minutes || ' minutes')::INTERVAL;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

-- Schedule tour with conflict detection
CREATE OR REPLACE FUNCTION schedule_tour_with_validation(
  p_property_id UUID,
  p_buyer_id UUID,
  p_agent_id UUID,
  p_scheduled_for TIMESTAMPTZ,
  p_tour_type VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tour_id UUID;
  v_is_available BOOLEAN;
BEGIN
  -- Check availability
  v_is_available := is_agent_available(p_agent_id, p_scheduled_for, 60);
  
  IF NOT v_is_available THEN
    RAISE EXCEPTION 'Agent is not available at the requested time';
  END IF;
  
  -- Create tour
  INSERT INTO tours (
    property_id,
    buyer_id,
    agent_id,
    scheduled_for,
    tour_type,
    notes,
    status
  ) VALUES (
    p_property_id,
    p_buyer_id,
    p_agent_id,
    p_scheduled_for,
    p_tour_type,
    p_notes,
    'confirmed'
  )
  RETURNING id INTO v_tour_id;
  
  RETURN v_tour_id;
END;
$$ LANGUAGE plpgsql;

-- Reschedule tour with validation
CREATE OR REPLACE FUNCTION reschedule_tour(
  p_tour_id UUID,
  p_new_datetime TIMESTAMPTZ,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_agent_id UUID;
  v_old_datetime TIMESTAMPTZ;
  v_is_available BOOLEAN;
BEGIN
  -- Get current tour details
  SELECT agent_id, scheduled_for INTO v_agent_id, v_old_datetime
  FROM tours
  WHERE id = p_tour_id;
  
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'Tour not found';
  END IF;
  
  -- Check new time availability
  v_is_available := is_agent_available(v_agent_id, p_new_datetime, 60, p_tour_id);
  
  IF NOT v_is_available THEN
    RAISE EXCEPTION 'Agent is not available at the new requested time';
  END IF;
  
  -- Update tour
  UPDATE tours
  SET 
    scheduled_for = p_new_datetime,
    status = 'rescheduled',
    original_scheduled_for = COALESCE(original_scheduled_for, v_old_datetime),
    rescheduled_count = rescheduled_count + 1,
    reschedule_reason = p_reason,
    reminder_24h_sent = FALSE,
    reminder_1h_sent = FALSE,
    updated_at = NOW()
  WHERE id = p_tour_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get tours needing reminders
CREATE OR REPLACE FUNCTION get_tours_needing_reminders(
  p_reminder_type VARCHAR  -- '24h' or '1h'
)
RETURNS TABLE (
  tour_id UUID,
  property_id UUID,
  buyer_id UUID,
  agent_id UUID,
  scheduled_for TIMESTAMPTZ,
  buyer_email TEXT,
  agent_email TEXT,
  property_address TEXT
) AS $$
BEGIN
  IF p_reminder_type = '24h' THEN
    RETURN QUERY
    SELECT 
      t.id,
      t.property_id,
      t.buyer_id,
      t.agent_id,
      t.scheduled_for,
      bp.email,
      ap.email,
      p.address
    FROM tours t
    JOIN profiles bp ON bp.id = t.buyer_id
    JOIN profiles ap ON ap.id = t.agent_id
    JOIN properties p ON p.id = t.property_id
    WHERE t.status IN ('confirmed', 'rescheduled')
    AND t.reminder_24h_sent = FALSE
    AND t.scheduled_for BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours';
    
  ELSIF p_reminder_type = '1h' THEN
    RETURN QUERY
    SELECT 
      t.id,
      t.property_id,
      t.buyer_id,
      t.agent_id,
      t.scheduled_for,
      bp.email,
      ap.email,
      p.address
    FROM tours t
    JOIN profiles bp ON bp.id = t.buyer_id
    JOIN profiles ap ON ap.id = t.agent_id
    JOIN properties p ON p.id = t.property_id
    WHERE t.status IN ('confirmed', 'rescheduled')
    AND t.reminder_1h_sent = FALSE
    AND t.reminder_24h_sent = TRUE
    AND t.scheduled_for BETWEEN NOW() + INTERVAL '50 minutes' AND NOW() + INTERVAL '70 minutes';
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(
  p_tour_id UUID,
  p_reminder_type VARCHAR
)
RETURNS VOID AS $$
BEGIN
  IF p_reminder_type = '24h' THEN
    UPDATE tours
    SET reminder_24h_sent = TRUE, reminder_24h_sent_at = NOW()
    WHERE id = p_tour_id;
  ELSIF p_reminder_type = '1h' THEN
    UPDATE tours
    SET reminder_1h_sent = TRUE, reminder_1h_sent_at = NOW()
    WHERE id = p_tour_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE agent_availability ENABLE ROW LEVEL SECURITY;

-- Agents can manage their own availability
CREATE POLICY "Agents can view their own availability"
  ON agent_availability
  FOR SELECT
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin')
    )
  );

CREATE POLICY "Agents can create their own availability"
  ON agent_availability
  FOR INSERT
  WITH CHECK (
    agent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'agent'
      AND profiles.status = 'approved'
    )
  );

CREATE POLICY "Agents can update their own availability"
  ON agent_availability
  FOR UPDATE
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can delete their own availability"
  ON agent_availability
  FOR DELETE
  USING (agent_id = auth.uid());

-- Everyone can view agent availability (for booking purposes)
CREATE POLICY "Public can view active agent availability"
  ON agent_availability
  FOR SELECT
  USING (is_active = TRUE);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_agent_available TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_tour_with_validation TO authenticated;
GRANT EXECUTE ON FUNCTION reschedule_tour TO authenticated;
GRANT EXECUTE ON FUNCTION get_tours_needing_reminders TO service_role;
GRANT EXECUTE ON FUNCTION mark_reminder_sent TO service_role;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================
/*
-- Create sample recurring availability for an agent (Monday-Friday 9 AM - 5 PM)
INSERT INTO agent_availability (agent_id, availability_type, day_of_week, start_time, end_time, title)
VALUES 
  ('agent-uuid-here', 'recurring', 1, '09:00', '17:00', 'Monday Office Hours'),
  ('agent-uuid-here', 'recurring', 2, '09:00', '17:00', 'Tuesday Office Hours'),
  ('agent-uuid-here', 'recurring', 3, '09:00', '17:00', 'Wednesday Office Hours'),
  ('agent-uuid-here', 'recurring', 4, '09:00', '17:00', 'Thursday Office Hours'),
  ('agent-uuid-here', 'recurring', 5, '09:00', '17:00', 'Friday Office Hours');

-- Create sample blackout date (vacation)
INSERT INTO agent_availability (agent_id, availability_type, start_datetime, end_datetime, title)
VALUES (
  'agent-uuid-here',
  'blackout',
  '2025-12-20 00:00:00+00',
  '2025-12-27 23:59:59+00',
  'Holiday Vacation'
);

-- Test availability check
SELECT is_agent_available(
  'agent-uuid-here'::UUID,
  '2025-11-18 10:00:00+00'::TIMESTAMPTZ,
  60
);

-- Get available slots for tomorrow
SELECT * FROM get_available_slots(
  'agent-uuid-here'::UUID,
  (CURRENT_DATE + INTERVAL '1 day')::DATE,
  60,
  30
);
*/

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Function to clean up old availability records
CREATE OR REPLACE FUNCTION cleanup_old_availability()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete one-time availability that has passed
  DELETE FROM agent_availability
  WHERE availability_type = 'one_time'
  AND end_datetime < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Delete expired recurring availability
  DELETE FROM agent_availability
  WHERE availability_type = 'recurring'
  AND recurring_end_date IS NOT NULL
  AND recurring_end_date < CURRENT_DATE - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
  
  -- Delete old blackout dates
  DELETE FROM agent_availability
  WHERE availability_type = 'blackout'
  AND end_datetime < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
/*
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'agent_availability';

-- Check enhanced tours columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tours' 
AND column_name LIKE 'reminder%'
ORDER BY column_name;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'is_agent_available',
  'get_available_slots',
  'schedule_tour_with_validation',
  'reschedule_tour'
);

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'agent_availability';
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
