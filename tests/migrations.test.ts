import assert from 'node:assert/strict';
import test from 'node:test';

import { DatabaseSync } from 'node:sqlite';

import {
  MIGRATION_001_INITIAL,
  MIGRATION_002_LEVEL_TRAINING_PHOTO_SCORING,
  MIGRATION_003_DAILY_DRILLS_TRAINING_LIBRARY,
} from '../src/db/schema';

test('migration 001を新規DBへ適用でき、再実行しても壊れない', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION_001_INITIAL);
  db.exec(
    "INSERT OR IGNORE INTO support_schema_migrations(version, name, applied_at) VALUES (1, 'test', 'now')",
  );
  db.exec(MIGRATION_001_INITIAL);

  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
    name: string;
  }[];
  const tableNames = rows.map((row) => row.name);
  assert.ok(tableNames.includes('practice_menu_templates'));
  assert.ok(tableNames.includes('form_videos'));
  assert.ok(tableNames.includes('ai_form_assessments'));
  assert.ok(tableNames.includes('next_focus_items'));
});

test('migration 002を新規DBへ適用でき、再実行しても壊れない', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION_001_INITIAL);
  db.exec(MIGRATION_002_LEVEL_TRAINING_PHOTO_SCORING);
  db.exec(MIGRATION_002_LEVEL_TRAINING_PHOTO_SCORING);

  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
    name: string;
  }[];
  const tableNames = rows.map((row) => row.name);
  assert.ok(tableNames.includes('player_skill_profiles'));
  assert.ok(tableNames.includes('training_game_sessions'));
  assert.ok(tableNames.includes('training_throws'));
  assert.ok(tableNames.includes('throw_photo_sessions'));
  assert.ok(tableNames.includes('confirmed_throw_positions'));
});

test('新規練習データはAccount/Playerで分離できる列を持つ', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION_001_INITIAL);
  db.exec(MIGRATION_002_LEVEL_TRAINING_PHOTO_SCORING);

  for (const table of [
    'player_skill_profiles',
    'training_game_sessions',
    'training_throws',
    'throw_photo_sessions',
    'confirmed_throw_positions',
  ]) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    const names = columns.map((column) => column.name);
    assert.ok(names.includes('account_id'), `${table} should include account_id`);
    assert.ok(names.includes('player_id'), `${table} should include player_id`);
  }
});

test('migration 003を新規DBへ適用でき、再実行しても壊れない', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(MIGRATION_001_INITIAL);
  db.exec(MIGRATION_002_LEVEL_TRAINING_PHOTO_SCORING);
  db.exec(MIGRATION_003_DAILY_DRILLS_TRAINING_LIBRARY);
  db.exec(MIGRATION_003_DAILY_DRILLS_TRAINING_LIBRARY);

  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
    name: string;
  }[];
  const tableNames = rows.map((row) => row.name);
  assert.ok(tableNames.includes('training_drill_definitions'));
  assert.ok(tableNames.includes('daily_minimum_plans'));
  assert.ok(tableNames.includes('drill_sessions'));
  assert.ok(tableNames.includes('drill_results'));
  assert.ok(tableNames.includes('recommended_drills'));
});
