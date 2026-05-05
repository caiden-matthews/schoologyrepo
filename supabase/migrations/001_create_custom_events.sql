-- Migration: Create custom_events table for cross-device event sync
-- Created: 2026-05-04
-- Purpose: Store user-created custom events (study sessions, homework, etc.)
--          with RLS policies to isolate by user (via OAuth token hash)

CREATE TABLE IF NOT EXISTS custom_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                -- Deterministic hash of Schoology OAuth token
  title TEXT NOT NULL,                  -- Event title ("Math Homework", "Study Session", etc.)
  event_date DATE NOT NULL,             -- Event date in YYYY-MM-DD format
  time_val TEXT,                        -- Event time in HH:MM format (optional)
  time_display TEXT,                    -- Formatted time for UI (e.g., "3:45pm", optional)
  subject TEXT,                         -- Subject code (e.g., "MATH101") or null
  event_type TEXT,                      -- "homework" or "study" (matches form options)
  note TEXT,                            -- User notes/description (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(), -- Server timestamp for sorting
  updated_at TIMESTAMPTZ DEFAULT NOW()  -- Last modification timestamp
);

-- Indexes for fast queries by user and date
CREATE INDEX IF NOT EXISTS idx_custom_events_user_date ON custom_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_custom_events_user ON custom_events(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_events_date ON custom_events(event_date);

-- Enable Row Level Security
ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT only their own events
CREATE POLICY "Users can select only their own custom events"
  ON custom_events
  FOR SELECT
  USING (user_id = (current_setting('app.current_user_id')));

-- RLS Policy: Users can INSERT only with their own user_id
CREATE POLICY "Users can insert only their own custom events"
  ON custom_events
  FOR INSERT
  WITH CHECK (user_id = (current_setting('app.current_user_id')));

-- RLS Policy: Users can DELETE only their own events
CREATE POLICY "Users can delete only their own custom events"
  ON custom_events
  FOR DELETE
  USING (user_id = (current_setting('app.current_user_id')));

-- RLS Policy: Users can UPDATE only their own events
CREATE POLICY "Users can update only their own custom events"
  ON custom_events
  FOR UPDATE
  USING (user_id = (current_setting('app.current_user_id')))
  WITH CHECK (user_id = (current_setting('app.current_user_id')));

-- Grant select on custom_events to anon role (for read access via API)
-- Note: RLS policies enforce user isolation even with anon role
GRANT SELECT, INSERT, DELETE, UPDATE ON custom_events TO anon;
