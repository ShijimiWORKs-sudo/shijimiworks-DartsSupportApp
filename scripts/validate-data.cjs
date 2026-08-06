require('./ts-register.cjs');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { MIGRATIONS, CURRENT_SCHEMA_VERSION } = require('../src/db/schema.ts');
const { assessmentHeadingMap } = require('../src/domain/assessment.ts');

assert.equal(CURRENT_SCHEMA_VERSION, 2);
assert.equal(MIGRATIONS.length, 2);
assert.equal(MIGRATIONS[0].version, 1);
assert.equal(MIGRATIONS[1].version, 2);

const requiredTables = [
  'practice_menu_templates',
  'daily_practice_plans',
  'daily_practice_items',
  'practice_sessions',
  'practice_results',
  'form_videos',
  'ai_form_assessments',
  'improvement_issues',
  'improvement_issue_history',
  'practice_recommendations',
  'next_focus_items',
  'player_skill_profiles',
  'player_level_history',
  'level_check_sessions',
  'level_check_results',
  'training_game_sessions',
  'training_rounds',
  'training_throws',
  'board_calibrations',
  'throw_photo_sessions',
  'throw_detection_candidates',
  'confirmed_throw_positions',
];

const allMigrationSql = MIGRATIONS.map((migration) => migration.sql).join('\n');
for (const table of requiredTables) {
  assert.match(allMigrationSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
}

assert.equal(Object.keys(assessmentHeadingMap).length, 15);
assert.match(MIGRATIONS[0].sql, /raw_hash TEXT NOT NULL/);
assert.match(MIGRATIONS[0].sql, /uri TEXT NOT NULL/);

const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
assert.match(appJson.expo.ios.infoPlist.NSPhotoLibraryUsageDescription, /投擲フォーム動画/);
assert.match(appJson.expo.ios.infoPlist.NSPhotoLibraryAddUsageDescription, /写真ライブラリ/);

console.log('Data schema validation passed.');
