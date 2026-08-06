require('./ts-register.cjs');

const assert = require('node:assert/strict');
const { MIGRATIONS, CURRENT_SCHEMA_VERSION } = require('../src/db/schema.ts');
const { assessmentHeadingMap } = require('../src/domain/assessment.ts');

assert.equal(CURRENT_SCHEMA_VERSION, 1);
assert.equal(MIGRATIONS.length, 1);
assert.equal(MIGRATIONS[0].version, 1);

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
];

for (const table of requiredTables) {
  assert.match(MIGRATIONS[0].sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
}

assert.equal(Object.keys(assessmentHeadingMap).length, 15);
assert.match(MIGRATIONS[0].sql, /raw_hash TEXT NOT NULL/);
assert.match(MIGRATIONS[0].sql, /uri TEXT NOT NULL/);

console.log('Data schema validation passed.');
