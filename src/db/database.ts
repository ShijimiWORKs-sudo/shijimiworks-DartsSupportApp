import type { SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS, SUPPORT_DATABASE_FILE_NAME } from './schema';
import { getBuiltInDrills } from '../domain/drills';

export { SUPPORT_DATABASE_FILE_NAME };

export type SupportDatabase = SQLiteDatabase;

export async function initializeSupportDatabase(db: SupportDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS support_schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  for (const migration of MIGRATIONS) {
    const applied = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM support_schema_migrations WHERE version = ?',
      migration.version,
    );

    if (!applied) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql);
        await db.runAsync(
          'INSERT OR IGNORE INTO support_schema_migrations(version, name, applied_at) VALUES (?, ?, ?)',
          migration.version,
          migration.name,
          new Date().toISOString(),
        );
      });
    }
  }

  await ensureDefaultAccountAndPlayer(db);
  await seedBuiltInDrills(db);
}

async function ensureDefaultAccountAndPlayer(db: SupportDatabase): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR IGNORE INTO accounts(id, display_name, status, created_at, updated_at)
       VALUES ('local-account', 'ローカルアカウント', 'local_registered', ?, ?)`,
      now,
      now,
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO players(
         id, account_id, display_name, handedness, dart_weight_grams, player_type, created_at, updated_at
       ) VALUES ('owner-player', 'local-account', 'プレイヤー', '未登録', NULL, 'owner', ?, ?)`,
      now,
      now,
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO player_skill_profiles(
         id, account_id, player_id, current_level, provisional_level, level_started_at,
         promotion_ready, promotion_test_count, promotion_test_pass_count, last_level_check_at,
         level_confidence, total_practice_count, created_at, updated_at
       ) VALUES ('skill-owner-player', 'local-account', 'owner-player', 'C', NULL, ?, 0, 0, 0, NULL, 0, 0, ?, ?)`,
      now,
      now,
      now,
    );
  });
}

async function seedBuiltInDrills(db: SupportDatabase): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const drill of getBuiltInDrills()) {
      await db.runAsync(
        `INSERT INTO training_drill_definitions(
          id, drill_type, category, name, purpose, target_type, target_numbers, rounds,
          throws_per_round, total_throws, success_rule, scoring_mode, estimated_minutes,
          target_level_min, target_level_max, is_daily_minimum, is_builtin, can_use_photo,
          can_use_video, difficulty, sort_order, short_description, preparation_json,
          instructions_json, success_condition, finish_condition, input_guide,
          recorded_metrics_json, common_mistakes_json, cautions_json, beginner_tips_json,
          input_mode, mark_mode, target_success_count, completion_rule, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          drill_type = excluded.drill_type,
          category = excluded.category,
          name = excluded.name,
          purpose = excluded.purpose,
          target_type = excluded.target_type,
          target_numbers = excluded.target_numbers,
          rounds = excluded.rounds,
          throws_per_round = excluded.throws_per_round,
          total_throws = excluded.total_throws,
          success_rule = excluded.success_rule,
          scoring_mode = excluded.scoring_mode,
          estimated_minutes = excluded.estimated_minutes,
          target_level_min = excluded.target_level_min,
          target_level_max = excluded.target_level_max,
          is_daily_minimum = excluded.is_daily_minimum,
          is_builtin = excluded.is_builtin,
          can_use_photo = excluded.can_use_photo,
          can_use_video = excluded.can_use_video,
          difficulty = excluded.difficulty,
          sort_order = excluded.sort_order,
          short_description = excluded.short_description,
          preparation_json = excluded.preparation_json,
          instructions_json = excluded.instructions_json,
          success_condition = excluded.success_condition,
          finish_condition = excluded.finish_condition,
          input_guide = excluded.input_guide,
          recorded_metrics_json = excluded.recorded_metrics_json,
          common_mistakes_json = excluded.common_mistakes_json,
          cautions_json = excluded.cautions_json,
          beginner_tips_json = excluded.beginner_tips_json,
          input_mode = excluded.input_mode,
          mark_mode = excluded.mark_mode,
          target_success_count = excluded.target_success_count,
          completion_rule = excluded.completion_rule,
          updated_at = excluded.updated_at`,
        drill.id,
        drill.type,
        drill.category,
        drill.name,
        drill.purpose,
        drill.targetNumbers.length > 0 ? 'number' : 'none',
        JSON.stringify(drill.targetNumbers),
        drill.rounds,
        drill.throwsPerRound,
        drill.totalThrows,
        drill.successRule,
        drill.scoringMode,
        drill.estimatedMinutes,
        drill.targetLevelMin,
        drill.targetLevelMax,
        drill.isDailyMinimum ? 1 : 0,
        drill.canUsePhoto ? 1 : 0,
        drill.canUseVideo ? 1 : 0,
        drill.difficulty,
        drill.sortOrder,
        drill.instructions.shortDescription,
        JSON.stringify(drill.instructions.preparation),
        JSON.stringify(drill.instructions.instructions),
        drill.instructions.successCondition,
        drill.instructions.finishCondition,
        drill.instructions.inputGuide,
        JSON.stringify(drill.instructions.recordedMetrics),
        JSON.stringify(drill.instructions.commonMistakes),
        JSON.stringify(drill.instructions.cautions),
        JSON.stringify(drill.instructions.beginnerTips),
        drill.inputMode,
        drill.markMode,
        drill.targetSuccessCount,
        drill.completionRule,
        now,
        now,
      );
    }
  });
}
