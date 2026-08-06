import assert from 'node:assert/strict';
import test from 'node:test';

import { DatabaseSync } from 'node:sqlite';

import { MIGRATION_001_INITIAL } from '../src/db/schema';

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
