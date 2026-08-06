export const BACKUP_EXPORT_FORMAT = 'darts_support_app_backup';
export const BACKUP_CONTRACT_VERSION = 2;
export const BACKUP_APP_VERSION = '0.1.0';

export const BACKUP_TABLES = [
  'accounts',
  'players',
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
  'training_drill_definitions',
  'player_drill_preferences',
  'daily_minimum_plans',
  'daily_minimum_items',
  'drill_sessions',
  'drill_rounds',
  'drill_throw_results',
  'drill_results',
  'drill_target_results',
  'daily_minimum_completion',
  'recommended_drills',
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

export type BackupPayload = Record<string, unknown> & {
  app?: string;
  schemaVersion?: number;
  exportedAt?: string;
  export_format?: string;
  schema_version?: number;
  app_version?: string;
  exported_at?: string;
  account_id?: string | null;
  player_id?: string | null;
  device_type?: string;
  record_counts?: Record<string, number>;
  export_id?: string;
  checksum?: string;
  media_metadata?: {
    photos: ExportedMediaMetadata[];
    videos: ExportedMediaMetadata[];
  };
};

export type ExportedMediaMetadata = {
  id: string | null;
  uri: string | null;
  file_name: string | null;
  captured_at: string | null;
  media_type: 'photo' | 'video';
  related_session_id: string | null;
  memo: string | null;
  external_file_unavailable: boolean;
};

export type BackupPreview =
  | {
      ok: true;
      exportFormat: string;
      schemaVersion: number;
      appVersion: string;
      exportedAt: string;
      accountId: string | null;
      playerId: string | null;
      recordCounts: Record<string, number>;
      duplicateTables: Record<string, number>;
      totalRows: number;
      exportId: string;
    }
  | {
      ok: false;
      error: string;
    };

export function createBackupEnvelope(input: {
  payload: Record<string, unknown>;
  currentSchemaVersion: number;
  exportedAt: string;
  deviceType: 'iphone' | 'pc_web' | 'unknown';
}) {
  const recordCounts = countBackupRecords(input.payload);
  const accountId = firstId(input.payload.accounts);
  const playerId = firstId(input.payload.players);
  const checksumSource = JSON.stringify({
    accountId,
    playerId,
    exportedAt: input.exportedAt,
    recordCounts,
  });
  const checksum = stableChecksum(checksumSource);
  return {
    export_format: BACKUP_EXPORT_FORMAT,
    schema_version: input.currentSchemaVersion,
    app_version: BACKUP_APP_VERSION,
    exported_at: input.exportedAt,
    account_id: accountId,
    player_id: playerId,
    device_type: input.deviceType,
    record_counts: recordCounts,
    export_id: `export_${checksum}`,
    checksum,
    app: 'DartsSupportApp',
    schemaVersion: BACKUP_CONTRACT_VERSION,
    exportedAt: input.exportedAt,
    videoPolicy: '動画本体はバックアップ対象外です。URI とメタデータのみを含みます。',
    photoPolicy: '写真本体はバックアップ対象外です。URI と判定メタデータのみを含みます。',
    media_metadata: collectMediaMetadata(input.payload),
  };
}

export function parseBackupJson(jsonText: string): BackupPayload {
  try {
    return JSON.parse(jsonText) as BackupPayload;
  } catch {
    throw new Error('JSONの形式が正しくありません。ファイル内容を確認してください。');
  }
}

export function validateBackupPayload(payload: BackupPayload, currentSchemaVersion: number) {
  if (payload.export_format && payload.export_format !== BACKUP_EXPORT_FORMAT) {
    throw new Error('DartsSupportAppのバックアップJSONではありません。');
  }
  if (!payload.export_format && payload.app !== 'DartsSupportApp') {
    throw new Error('DartsSupportAppのバックアップJSONではありません。');
  }
  const schemaVersion = getPayloadSchemaVersion(payload);
  if (schemaVersion > currentSchemaVersion) {
    throw new Error('このアプリより新しいバックアップ形式です。アプリ更新後に取り込んでください。');
  }
}

export function previewBackupPayload(
  payload: BackupPayload,
  existingIds: Record<string, Set<string>>,
  currentSchemaVersion: number,
): BackupPreview {
  try {
    validateBackupPayload(payload, currentSchemaVersion);
    const recordCounts = countBackupRecords(payload);
    const duplicateTables: Record<string, number> = {};
    for (const table of BACKUP_TABLES) {
      const rows = getRows(payload[table]);
      const existing = existingIds[table] ?? new Set<string>();
      const duplicateCount = rows.filter(
        (row) => typeof row.id === 'string' && existing.has(row.id),
      ).length;
      if (duplicateCount > 0) {
        duplicateTables[table] = duplicateCount;
      }
    }
    return {
      ok: true,
      exportFormat: payload.export_format ?? BACKUP_EXPORT_FORMAT,
      schemaVersion: getPayloadSchemaVersion(payload),
      appVersion: payload.app_version ?? BACKUP_APP_VERSION,
      exportedAt: payload.exported_at ?? payload.exportedAt ?? '',
      accountId: payload.account_id ?? firstId(payload.accounts),
      playerId: payload.player_id ?? firstId(payload.players),
      recordCounts,
      duplicateTables,
      totalRows: Object.values(recordCounts).reduce((sum, count) => sum + count, 0),
      exportId: payload.export_id ?? `legacy_${stableChecksum(JSON.stringify(recordCounts))}`,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'バックアップJSONを確認できませんでした。',
    };
  }
}

export function countBackupRecords(payload: Record<string, unknown>) {
  return Object.fromEntries(BACKUP_TABLES.map((table) => [table, getRows(payload[table]).length]));
}

export function stableChecksum(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function getRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    : [];
}

function getPayloadSchemaVersion(payload: BackupPayload) {
  return payload.schema_version ?? payload.schemaVersion ?? 1;
}

function firstId(value: unknown): string | null {
  const row = getRows(value)[0];
  return typeof row?.id === 'string' ? row.id : null;
}

function collectMediaMetadata(payload: Record<string, unknown>) {
  const videos = getRows(payload.form_videos).map((row) => ({
    id: stringOrNull(row.id),
    uri: stringOrNull(row.uri),
    file_name: fileNameFromUri(stringOrNull(row.uri)),
    captured_at: stringOrNull(row.captured_at),
    media_type: 'video' as const,
    related_session_id: stringOrNull(row.practice_session_id),
    memo: stringOrNull(row.memo),
    external_file_unavailable: true,
  }));
  const photos = getRows(payload.throw_photo_sessions).map((row) => ({
    id: stringOrNull(row.id),
    uri: stringOrNull(row.original_photo_uri),
    file_name: fileNameFromUri(stringOrNull(row.original_photo_uri)),
    captured_at: stringOrNull(row.created_at),
    media_type: 'photo' as const,
    related_session_id: stringOrNull(row.game_session_id ?? row.practice_session_id),
    memo: null,
    external_file_unavailable: true,
  }));
  return { photos, videos };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function fileNameFromUri(uri: string | null) {
  if (!uri) {
    return null;
  }
  return uri.split(/[\\/]/).filter(Boolean).at(-1) ?? uri;
}
