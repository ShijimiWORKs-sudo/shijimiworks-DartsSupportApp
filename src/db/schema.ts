export const SUPPORT_DATABASE_FILE_NAME = 'darts_support.db';
export const CURRENT_SCHEMA_VERSION = 2;

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

export const MIGRATION_002_LEVEL_TRAINING_PHOTO_SCORING = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS player_skill_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  current_level TEXT NOT NULL DEFAULT 'C',
  provisional_level TEXT,
  level_started_at TEXT NOT NULL,
  promotion_ready INTEGER NOT NULL DEFAULT 0,
  promotion_test_count INTEGER NOT NULL DEFAULT 0,
  promotion_test_pass_count INTEGER NOT NULL DEFAULT 0,
  last_level_check_at TEXT,
  level_confidence REAL NOT NULL DEFAULT 0,
  total_practice_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_player_skill_profiles_player
ON player_skill_profiles(account_id, player_id);

CREATE TABLE IF NOT EXISTS player_level_history (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  previous_level TEXT NOT NULL,
  next_level TEXT NOT NULL,
  reason TEXT NOT NULL,
  judgement_json TEXT NOT NULL,
  user_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS level_check_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  training_game_session_id TEXT,
  started_level TEXT NOT NULL,
  proposed_level TEXT,
  overall_score REAL NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  criteria_label TEXT NOT NULL DEFAULT 'DartsSupportApp独自基準',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS level_check_results (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  level_check_session_id TEXT NOT NULL REFERENCES level_check_sessions(id) ON DELETE CASCADE,
  part_key TEXT NOT NULL,
  part_label TEXT NOT NULL,
  raw_value REAL NOT NULL DEFAULT 0,
  normalized_score REAL NOT NULL DEFAULT 0,
  weight REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS training_game_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  practice_session_id TEXT REFERENCES practice_sessions(id) ON DELETE SET NULL,
  daily_item_id TEXT REFERENCES daily_practice_items(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_round INTEGER NOT NULL DEFAULT 1,
  current_throw INTEGER NOT NULL DEFAULT 0,
  bull_mode TEXT,
  out_mode TEXT,
  target_json TEXT,
  summary_json TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_training_game_sessions_player
ON training_game_sessions(account_id, player_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS training_rounds (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_session_id TEXT NOT NULL REFERENCES training_game_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  target_number TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  marks INTEGER NOT NULL DEFAULT 0,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_training_rounds_session_round
ON training_rounds(game_session_id, round_number);

CREATE TABLE IF NOT EXISTS training_throws (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_session_id TEXT NOT NULL REFERENCES training_game_sessions(id) ON DELETE CASCADE,
  round_id TEXT REFERENCES training_rounds(id) ON DELETE SET NULL,
  round_number INTEGER NOT NULL,
  throw_number INTEGER NOT NULL,
  target_number TEXT,
  segment TEXT,
  multiplier INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  normalized_x REAL,
  normalized_y REAL,
  radius REAL,
  angle REAL,
  confidence REAL NOT NULL DEFAULT 1,
  input_method TEXT NOT NULL DEFAULT 'manual_score',
  is_manual_override INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_throws_session
ON training_throws(game_session_id, round_number, throw_number);

CREATE TABLE IF NOT EXISTS board_calibrations (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  photo_session_id TEXT,
  center_x REAL NOT NULL,
  center_y REAL NOT NULL,
  twenty_x REAL NOT NULL,
  twenty_y REAL NOT NULL,
  outer_points_json TEXT NOT NULL,
  outer_radius REAL NOT NULL,
  rotation_degrees REAL NOT NULL DEFAULT 0,
  transform_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS throw_photo_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_session_id TEXT REFERENCES training_game_sessions(id) ON DELETE SET NULL,
  practice_session_id TEXT REFERENCES practice_sessions(id) ON DELETE SET NULL,
  round_number INTEGER NOT NULL,
  original_photo_uri TEXT NOT NULL,
  corrected_photo_uri TEXT,
  calibration_json TEXT,
  auto_candidates_json TEXT,
  confirmed_positions_json TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  has_manual_adjustment INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS throw_detection_candidates (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  photo_session_id TEXT NOT NULL REFERENCES throw_photo_sessions(id) ON DELETE CASCADE,
  candidate_index INTEGER NOT NULL,
  normalized_x REAL NOT NULL,
  normalized_y REAL NOT NULL,
  radius REAL NOT NULL,
  angle REAL NOT NULL,
  segment TEXT NOT NULL,
  multiplier INTEGER NOT NULL,
  score INTEGER NOT NULL,
  confidence REAL NOT NULL,
  input_method TEXT NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS confirmed_throw_positions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  photo_session_id TEXT NOT NULL REFERENCES throw_photo_sessions(id) ON DELETE CASCADE,
  game_session_id TEXT REFERENCES training_game_sessions(id) ON DELETE SET NULL,
  round_number INTEGER NOT NULL,
  throw_number INTEGER NOT NULL,
  normalized_x REAL NOT NULL,
  normalized_y REAL NOT NULL,
  radius REAL NOT NULL,
  angle REAL NOT NULL,
  segment TEXT NOT NULL,
  multiplier INTEGER NOT NULL,
  score INTEGER NOT NULL,
  confidence REAL NOT NULL,
  input_method TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export const MIGRATIONS = [
  {
    version: 1,
    name: '001_daily_practice_form_ai_import',
    sql: MIGRATION_001_INITIAL,
  },
  {
    version: 2,
    name: '002_level_training_photo_scoring',
    sql: MIGRATION_002_LEVEL_TRAINING_PHOTO_SCORING,
  },
] as const;
