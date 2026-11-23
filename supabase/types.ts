/**
 * Supabase Database Types for Tables Buddy
 * Auto-generated from the SQL migration file
 */

type PublicProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  updated_at: string;
};

type Child = {
  id: string;
  profile_id: string;
  name: string;
  class: number;
  avatar: string;
  created_at: string;
  updated_at: string;
};

type ChildSettings = {
  id: string;
  child_id: string;
  recitation_style: "indian" | "times" | "hindi";
  tables_start: number;
  tables_end: number;
  row_length: number;
  speech_speed: number;
  speech_pitch: number;
  max_retries: number;
  unlimited_retries: boolean;
  created_at: string;
  updated_at: string;
};

type TableLinesProgress = {
  id: string;
  child_id: string;
  multiplicand: number;
  multiplier: number;
  box: number;
  mastered: boolean;
  last_seen: string | null;
  next_due: string | null;
  weak_count: number;
  created_at: string;
  updated_at: string;
};

type Sessions = {
  id: string;
  child_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  tables_practised: string[];
  lines_completed: number;
  lines_correct: number;
  lines_total: number;
  stars_earned: number;
  status: string;
};

type Attempts = {
  id: string;
  session_id: string;
  child_id: string;
  table_line: string;
  expected: string;
  heard: string | null;
  correct: boolean;
  attempt_number: number;
  response_time_ms: number | null;
  retry_level: "normal" | "slow" | "part";
  timestamp: string;
};

type Badges = {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_json: any;
};

type ChildBadges = {
  id: string;
  child_id: string;
  badge_id: string;
  earned_at: string;
};

type DailyStats = {
  id: string;
  child_id: string;
  date: string;
  minutes_practised: number;
  sessions_count: number;
  lines_practised: number;
  lines_correct: number;
  accuracy_percentage: number;
  tables_covered: number;
};
