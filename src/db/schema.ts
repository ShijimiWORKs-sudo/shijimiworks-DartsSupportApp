export const SUPPORT_DATABASE_FILE_NAME = 'darts_support.db';
export const CURRENT_SCHEMA_VERSION = 1;

export const MIGRATION_001_INITIAL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS support_schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'local_registered',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  handedness TEXT,
  dart_weight_grams REAL,
  player_type TEXT NOT NULL DEFAULT 'owner',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_players_account_owner
ON players(account_id)
WHERE player_type = 'owner' AND is_archived = 0;

CREATE TABLE IF NOT EXISTS practice_menu_templates (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  purpose TEXT,
  target_area TEXT,
  rounds INTEGER,
  throws_per_round INTEGER,
  sets INTEGER,
  target_value TEXT,
  planned_minutes INTEGER,
  rest_seconds INTEGER,
  focus_note TEXT,
  memo TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  repeat_type TEXT NOT NULL DEFAULT 'once',
  repeat_weekdays TEXT,
  is_ai_suggested INTEGER NOT NULL DEFAULT 0,
  source_assessment_id TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS daily_practice_plans (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  practice_date TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_plan_player_date
ON daily_practice_plans(account_id, player_id, practice_date)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS daily_practice_items (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL REFERENCES daily_practice_plans(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES practice_menu_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  purpose TEXT,
  target_area TEXT,
  rounds INTEGER,
  throws_per_round INTEGER,
  sets INTEGER,
  target_value TEXT,
  planned_minutes INTEGER,
  rest_seconds INTEGER,
  focus_note TEXT,
  memo TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_ai_suggested INTEGER NOT NULL DEFAULT 0,
  source_assessment_id TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  started_at TEXT,
  completed_at TEXT,
  skipped_at TEXT,
  aborted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_items_plan_order
ON daily_practice_items(plan_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  daily_item_id TEXT REFERENCES daily_practice_items(id) ON DELETE SET NULL,
  title_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_set INTEGER NOT NULL DEFAULT 1,
  current_round INTEGER NOT NULL DEFAULT 1,
  current_throw INTEGER NOT NULL DEFAULT 0,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  undo_snapshot_json TEXT,
  started_at TEXT NOT NULL,
  paused_at TEXT,
  completed_at TEXT,
  aborted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_player_status
ON practice_sessions(account_id, player_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS practice_results (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  practice_session_id TEXT NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  actual_minutes INTEGER,
  actual_rounds INTEGER,
  actual_sets INTEGER,
  total_throws INTEGER,
  bull_count INTEGER,
  optional_score TEXT,
  achievement_level TEXT,
  condition_label TEXT,
  body_feel TEXT,
  good_points TEXT,
  concern_points TEXT,
  next_focus_note TEXT,
  memo TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_results_session
ON practice_results(practice_session_id);

CREATE TABLE IF NOT EXISTS form_videos (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  practice_session_id TEXT REFERENCES practice_sessions(id) ON DELETE SET NULL,
  direction TEXT NOT NULL,
  uri TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  duration_ms INTEGER,
  file_size_bytes INTEGER,
  handedness TEXT,
  dart_weight_grams REAL,
  memo TEXT,
  is_missing_file INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_form_videos_session
ON form_videos(practice_session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_form_assessments (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  practice_session_id TEXT REFERENCES practice_sessions(id) ON DELETE SET NULL,
  form_video_id TEXT REFERENCES form_videos(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  raw_hash TEXT NOT NULL,
  parsed_json TEXT NOT NULL,
  parse_status TEXT NOT NULL,
  recognized_heading_count INTEGER NOT NULL DEFAULT 0,
  compared_to_assessment_id TEXT REFERENCES ai_form_assessments(id) ON DELETE SET NULL,
  user_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_assessment_session_hash
ON ai_form_assessments(practice_session_id, raw_hash)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS improvement_issues (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT,
  target_part TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  priority INTEGER NOT NULL DEFAULT 2,
  first_found_date TEXT NOT NULL,
  last_checked_date TEXT NOT NULL,
  resolved_date TEXT,
  source_assessment_id TEXT REFERENCES ai_form_assessments(id) ON DELETE SET NULL,
  source_video_id TEXT REFERENCES form_videos(id) ON DELETE SET NULL,
  source_session_id TEXT REFERENCES practice_sessions(id) ON DELETE SET NULL,
  user_note TEXT,
  next_check_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_improvement_issues_player_status
ON improvement_issues(account_id, player_id, status, priority, updated_at DESC);

CREATE TABLE IF NOT EXISTS improvement_issue_history (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL REFERENCES improvement_issues(id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES ai_form_assessments(id) ON DELETE SET NULL,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practice_recommendations (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES ai_form_assessments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  source_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS next_focus_items (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES ai_form_assessments(id) ON DELETE SET NULL,
  issue_id TEXT REFERENCES improvement_issues(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  priority INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_next_focus_active
ON next_focus_items(account_id, player_id, status, priority, created_at DESC);
`;

export const MIGRATIONS = [
  {
    version: 1,
    name: '001_daily_practice_form_ai_import',
    sql: MIGRATION_001_INITIAL,
  },
] as const;
