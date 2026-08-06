import { createMemorySupportRepository } from './memoryRepository';
import type { SupportRepository } from './repository';
import { CURRENT_SCHEMA_VERSION } from './schema';
import {
  BACKUP_TABLES,
  createBackupEnvelope,
  parseBackupJson,
  previewBackupPayload,
  stableChecksum,
  validateBackupPayload,
  type BackupPayload,
  type BackupPreview,
} from '../domain/backup';

const DB_NAME = 'darts_support_app_pc_analysis';
const DB_VERSION = 1;
const PACKAGE_STORE = 'imported_export_packages';
const HISTORY_STORE = 'import_history';
const ACTIVE_PACKAGE_KEY = 'active';

export type ImportHistoryRow = {
  id: string;
  imported_at: string;
  file_name: string;
  export_id: string;
  account_id: string | null;
  player_id: string | null;
  added_rows: number;
  updated_rows: number;
  skipped_rows: number;
  error_rows: number;
};

export type PcImportPreview = BackupPreview;

export type IndexedDbSupportRepository = SupportRepository & {
  previewBackupImport: (jsonText: string) => Promise<PcImportPreview>;
  listImportHistory: () => Promise<ImportHistoryRow[]>;
  exportAnalysisCsv: (name: string) => Promise<string>;
};

export function createIndexedDbSupportRepository(): IndexedDbSupportRepository {
  const memoryRepository = createMemorySupportRepository();

  async function exportBackup() {
    const payload = (await loadActivePackage()) ?? {};
    const exportedAt = new Date().toISOString();
    return JSON.stringify(
      {
        ...payload,
        ...createBackupEnvelope({
          payload,
          currentSchemaVersion: CURRENT_SCHEMA_VERSION,
          exportedAt,
          deviceType: 'pc_web',
        }),
      },
      null,
      2,
    );
  }

  async function importBackup(jsonText: string) {
    const payload = parseBackupJson(jsonText);
    validateBackupPayload(payload, CURRENT_SCHEMA_VERSION);
    const existing = (await loadActivePackage()) ?? {};
    const importResult = mergeBackupPayload(existing, payload);
    await saveActivePackage(importResult.payload);
    await saveImportHistory({
      id: `import_${Date.now().toString(36)}_${stableChecksum(jsonText)}`,
      imported_at: new Date().toISOString(),
      file_name: 'browser-selected-json',
      export_id: payload.export_id ?? `legacy_${stableChecksum(jsonText)}`,
      account_id: payload.account_id ?? null,
      player_id: payload.player_id ?? null,
      added_rows: importResult.addedRows,
      updated_rows: 0,
      skipped_rows: importResult.skippedRows,
      error_rows: 0,
    });
    return {
      importedRows: importResult.addedRows,
      skippedTables: [],
      addedRows: importResult.addedRows,
      updatedRows: 0,
      skippedRows: importResult.skippedRows,
      errorRows: 0,
    };
  }

  async function previewBackupImport(jsonText: string) {
    const payload = parseBackupJson(jsonText);
    const existing = (await loadActivePackage()) ?? {};
    const existingIds = Object.fromEntries(
      BACKUP_TABLES.map((table) => [
        table,
        new Set(getPayloadRows(existing, table).map((row) => String(row.id))),
      ]),
    );
    return previewBackupPayload(payload, existingIds, CURRENT_SCHEMA_VERSION);
  }

  async function listImportHistory() {
    const db = await openDb();
    return getAll<ImportHistoryRow>(db, HISTORY_STORE).then((rows) =>
      rows.sort((a, b) => b.imported_at.localeCompare(a.imported_at)),
    );
  }

  async function exportAnalysisCsv(name: string) {
    const payload = (await loadActivePackage()) ?? {};
    const rows = csvRowsFor(name, payload);
    return toCsv(rows);
  }

  return {
    ...memoryRepository,
    exportBackup,
    importBackup,
    previewBackupImport,
    listImportHistory,
    exportAnalysisCsv,
  };
}

function mergeBackupPayload(existing: Record<string, unknown>, incoming: BackupPayload) {
  const next: Record<string, unknown> = { ...existing };
  let addedRows = 0;
  let skippedRows = 0;
  for (const table of BACKUP_TABLES) {
    const existingRows = getPayloadRows(existing, table);
    const incomingRows = getPayloadRows(incoming, table);
    const ids = new Set(existingRows.map((row) => String(row.id)));
    const additions = incomingRows.filter((row) => {
      if (typeof row.id !== 'string') {
        return false;
      }
      if (ids.has(row.id)) {
        skippedRows += 1;
        return false;
      }
      if (typeof row.deleted_at === 'string' && row.deleted_at) {
        skippedRows += 1;
        return false;
      }
      ids.add(row.id);
      return true;
    });
    addedRows += additions.length;
    next[table] = [...existingRows, ...additions];
  }
  Object.assign(
    next,
    createBackupEnvelope({
      payload: next,
      currentSchemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      deviceType: 'pc_web',
    }),
  );
  return { payload: next, addedRows, skippedRows };
}

function getPayloadRows(
  payload: Record<string, unknown>,
  table: string,
): Record<string, unknown>[] {
  const value = payload[table];
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    : [];
}

async function loadActivePackage(): Promise<Record<string, unknown> | null> {
  const db = await openDb();
  return get<Record<string, unknown>>(db, PACKAGE_STORE, ACTIVE_PACKAGE_KEY);
}

async function saveActivePackage(payload: Record<string, unknown>) {
  const db = await openDb();
  await put(db, PACKAGE_STORE, payload, ACTIVE_PACKAGE_KEY);
}

async function saveImportHistory(row: ImportHistoryRow) {
  const db = await openDb();
  await put(db, HISTORY_STORE, row, row.id);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const indexedDb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    if (!indexedDb) {
      reject(new Error('このブラウザではIndexedDBを利用できません。'));
      return;
    }
    const request = indexedDb.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PACKAGE_STORE)) {
        db.createObjectStore(PACKAGE_STORE);
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE);
      }
    };
    request.onerror = () => reject(request.error ?? new Error('IndexedDBを開けませんでした。'));
    request.onsuccess = () => resolve(request.result);
  });
}

function get<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
  });
}

function getAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as T[] | undefined) ?? []);
  });
}

function put(db: IDBDatabase, storeName: string, value: unknown, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(value, key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function csvRowsFor(name: string, payload: Record<string, unknown>) {
  if (name === 'throw_results') {
    return getPayloadRows(payload, 'drill_throw_results');
  }
  if (name === 'round_results') {
    return getPayloadRows(payload, 'drill_rounds');
  }
  if (name === 'bull_analysis' || name === 'cricket_analysis') {
    return getPayloadRows(payload, 'drill_results');
  }
  if (name === 'level_history') {
    return getPayloadRows(payload, 'player_level_history');
  }
  return getPayloadRows(payload, 'practice_sessions');
}

function toCsv(rows: Record<string, unknown>[]) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const body = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n');
  return `\uFEFF${body}`;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
