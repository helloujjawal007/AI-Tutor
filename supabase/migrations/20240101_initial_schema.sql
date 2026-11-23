-- ============================================================
-- Tables Buddy - Multiplication Tables Learning App
-- Supabase SQL Migration - Part 1: Profiles, Children, Settings
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES (parents)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own profile" ON profiles
  FOR SELECT USING (auth.uid()::text = auth.jwt() ->> 'email');

CREATE POLICY "Parents can update own profile" ON profiles
  FOR UPDATE USING (auth.uid()::text = auth.jwt() ->> 'email');

-- ============================================================
-- 2. CHILDREN
-- ============================================================
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class INTEGER NOT NULL CHECK (class >= 4 AND class <= 5),
  avatar TEXT DEFAULT 'robot',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own children" ON children
  FOR SELECT USING (profile_id = auth.uid()::uuid);

CREATE POLICY "Parents can insert own children" ON children
  FOR INSERT WITH CHECK (profile_id = auth.uid()::uuid);

CREATE POLICY "Parents can update own children" ON children
  FOR UPDATE USING (profile_id = auth.uid()::uuid);

-- ============================================================
-- 3. CHILD SETTINGS
-- ============================================================
CREATE TABLE child_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  recitation_style TEXT DEFAULT 'indian', -- indian, times, hindi
  tables_start INTEGER DEFAULT 2,
  tables_end INTEGER DEFAULT 10,
  row_length INTEGER DEFAULT 10,
  speech_speed FLOAT DEFAULT 1.0,
  speech_pitch FLOAT DEFAULT 1.0,
  max_retries INTEGER DEFAULT 5,
  unlimited_retries BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE child_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own child settings" ON child_settings
  FOR SELECT USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can update own child settings" ON child_settings
  FOR UPDATE USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

-- ============================================================
-- 4. TABLE LINES PROGRESS (Leitner SRS)
-- ============================================================
CREATE TABLE table_lines_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  multiplicand INTEGER NOT NULL,
  multiplier INTEGER NOT NULL,
  box INTEGER NOT NULL DEFAULT 1,
  mastered BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMPTZ DEFAULT now(),
  next_due TIMESTAMPTZ DEFAULT now(),
  weak_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE table_lines_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own child progress" ON table_lines_progress
  FOR SELECT USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can update own child progress" ON table_lines_progress
  FOR UPDATE USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

-- Index for due queries
CREATE INDEX idx_table_lines_progress_child_due ON table_lines_progress (child_id, next_due);
CREATE INDEX idx_table_lines_progress_mastered ON table_lines_progress (child_id, mastered) WHERE mastered = false;

-- ============================================================
-- 6. ATTEMPTS
-- ============================================================
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  table_line TEXT NOT NULL,
  expected TEXT NOT NULL,
  heard TEXT,
  correct BOOLEAN DEFAULT FALSE,
  attempt_number INTEGER NOT NULL,
  response_time_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT now(),
  retry_level TEXT DEFAULT 'normal'
);

-- Row Level Security
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own attempts" ON attempts
  FOR SELECT USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can insert own attempts" ON attempts
  FOR INSERT WITH CHECK (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can update own attempts" ON attempts
  FOR UPDATE USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

-- Index for session queries
CREATE INDEX idx_attempts_session_id ON attempts (session_id);
CREATE INDEX idx_attempts_child_timestamp ON attempts (child_id, timestamp DESC);

-- ============================================================
-- 7. BADGES (master list)
-- ============================================================
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_json JSONB NOT NULL
);

-- Row Level Security
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Public read access for badge definitions
CREATE POLICY "Anyone can view badges" ON badges
  FOR SELECT USING (true);

-- ============================================================
-- 8. CHILD BADGES (earned badges)
-- ============================================================
CREATE TABLE child_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (child_id, badge_id)
);

-- Row Level Security
ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own child badges" ON child_badges
  FOR SELECT USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can insert own child badges" ON child_badges
  FOR INSERT WITH CHECK (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

-- ============================================================
-- 9. DAILY STATS
-- ============================================================
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT (current_date),
  minutes_practised INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  lines_practised INTEGER DEFAULT 0,
  lines_correct INTEGER DEFAULT 0,
  accuracy_percentage INTEGER DEFAULT 0,
  tables_covered INTEGER DEFAULT 0,
  UNIQUE (child_id, date)
);

-- Row Level Security
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own child daily stats" ON daily_stats
  FOR SELECT USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can insert own child daily stats" ON daily_stats
  FOR INSERT WITH CHECK (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can update own child daily stats" ON daily_stats
  FOR UPDATE USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

-- Index for daily reports
CREATE INDEX idx_daily_stats_child_date ON daily_stats (child_id, date DESC);
CREATE INDEX idx_daily_stats_date ON daily_stats (date DESC);

-- ============================================================
-- VIEWS for dashboard stats
-- ============================================================

-- View: recent activity per child
CREATE OR REPLACE VIEW child_recent_activity AS
SELECT
  c.name AS child_name,
  c.class,
  s.start_time,
  s.duration_minutes,
  s.lines_completed,
  s.stars_earned,
  s.status
FROM children c
JOIN sessions s ON c.id = s.child_id
ORDER BY s.start_time DESC;

-- View: per-table accuracy
CREATE OR REPLACE VIEW table_accuracy_view AS
SELECT
  multiplicand AS table_of,
  COUNT(*) AS total_lines,
  SUM(CASE WHEN correct THEN 1 ELSE 0 END) AS lines_correct,
  ROUND(100.0 * SUM(CASE WHEN correct THEN 1 ELSE 0 END) / COUNT(*), 2) AS accuracy
FROM attempts
GROUP BY multiplicand
ORDER BY multiplicand;

-- View: daily stats summary
CREATE OR REPLACE VIEW daily_stats_summary AS
SELECT
  child_id,
  date,
  minutes_practised,
  sessions_count,
  lines_practised,
  lines_correct,
  accuracy_percentage
FROM daily_stats
ORDER BY date DESC;

-- ============================================================
-- 5. SESSIONS
-- ============================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  tables_practised TEXT[],
  lines_completed INTEGER DEFAULT 0,
  lines_correct INTEGER DEFAULT 0,
  lines_total INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active'
);

-- Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own sessions" ON sessions
  FOR SELECT USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));

CREATE POLICY "Parents can update own sessions" ON sessions
  FOR UPDATE USING (child_id IN (SELECT id FROM children WHERE profile_id = auth.uid()::uuid));