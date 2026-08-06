import type { SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS, SUPPORT_DATABASE_FILE_NAME } from './schema';

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
