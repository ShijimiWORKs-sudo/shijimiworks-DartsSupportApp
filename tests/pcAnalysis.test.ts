import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BACKUP_EXPORT_FORMAT,
  createBackupEnvelope,
  previewBackupPayload,
  type BackupPayload,
} from '../src/domain/backup';
import {
  buildCsv,
  buildPcAnalysis,
  formatJapanDateTime,
  generateAnalysisCsv,
  toCsv,
  type AnalysisCsvName,
} from '../src/domain/pcAnalysis';
import { downloadCsvFile } from '../src/platform/csvDownload.web';

function samplePayload(): BackupPayload {
  const payload: BackupPayload = {
    accounts: [{ id: 'account-1' }],
    players: [{ id: 'player-1', account_id: 'account-1' }],
    player_skill_profiles: [
      {
        id: 'profile-1',
        current_level: 'B',
        level_started_at: '2026-08-01T00:00:00.000Z',
        promotion_ready: 1,
      },
    ],
    training_drill_definitions: [
      {
        id: 'bull_target_10',
        name: 'BULL 10本達成',
        category: 'bull',
        completion_rule: 'bull_count',
        target_level_min: 'C',
        target_numbers: '["BULL"]',
      },
      {
        id: 'cricket_20_19_18_10_marks',
        name: '20・19・18を各10マーク',
        category: 'cricket',
        completion_rule: 'all_targets_mark_count',
        target_level_min: 'B',
        target_numbers: '[20,19,18]',
      },
    ],
    drill_sessions: [
      { id: 'session-bull', drill_definition_id: 'bull_target_10' },
      { id: 'session-cricket', drill_definition_id: 'cricket_20_19_18_10_marks' },
    ],
    drill_results: [
      {
        id: 'result-bull',
        drill_session_id: 'session-bull',
        drill_definition_id: 'bull_target_10',
        total_throws: 12,
        inner_bull: 4,
        outer_bull: 6,
        bull_rate: 10 / 12,
        mark_count: 0,
        created_at: '2026-08-06T10:00:00.000Z',
        summary_json: '{}',
      },
      {
        id: 'result-cricket',
        drill_session_id: 'session-cricket',
        drill_definition_id: 'cricket_20_19_18_10_marks',
        total_throws: 9,
        inner_bull: 0,
        outer_bull: 0,
        bull_rate: 0,
        mark_count: 12,
        created_at: '2026-08-06T11:00:00.000Z',
        summary_json: '{}',
      },
    ],
    drill_rounds: [
      { id: 'round-1', drill_session_id: 'session-cricket', mark_count: 4 },
      { id: 'round-2', drill_session_id: 'session-cricket', mark_count: 0 },
    ],
    drill_throw_results: [
      {
        id: 'throw-1',
        drill_session_id: 'session-bull',
        actual_number: 'BULL',
        is_inner_bull: 1,
        is_outer_bull: 0,
        is_hit: 1,
        mark_count: 1,
        catch_hit: 0,
        created_at: '2026-08-06T10:00:00.000Z',
      },
      {
        id: 'throw-2',
        drill_session_id: 'session-cricket',
        target_number: '20',
        actual_number: '18',
        multiplier: 3,
        mark_count: 3,
        catch_hit: 1,
        created_at: '2026-08-06T11:00:00.000Z',
      },
      {
        id: 'throw-3',
        drill_session_id: 'session-cricket',
        target_number: '20',
        actual_number: '5',
        multiplier: 1,
        mark_count: 0,
        catch_hit: 0,
        is_hit: 0,
        created_at: '2026-08-06T11:00:00.000Z',
      },
    ],
    form_videos: [{ id: 'video-1', uri: 'file:///iphone/form.mov', captured_at: '2026-08-06' }],
    throw_photo_sessions: [
      { id: 'photo-1', original_photo_uri: 'file:///iphone/board.jpg', created_at: '2026-08-06' },
    ],
    ai_form_assessments: [{ id: 'assessment-1', created_at: '2026-08-06' }],
    improvement_issues: [{ id: 'issue-1', status: 'CONTINUING' }],
    next_focus_items: [{ id: 'focus-1', status: 'active' }],
    daily_minimum_completion: [
      { id: 'daily-1', practice_date: '2026-08-06', completion_rate: 100 },
    ],
  };
  return {
    ...payload,
    ...createBackupEnvelope({
      payload,
      currentSchemaVersion: 4,
      exportedAt: '2026-08-06T12:00:00.000Z',
      deviceType: 'iphone',
    }),
  };
}

test('バックアップ契約にPC分析用メタ情報とdrill_throw_resultsが含まれる', () => {
  const payload = samplePayload();
  assert.equal(payload.export_format, BACKUP_EXPORT_FORMAT);
  assert.equal(payload.schema_version, 4);
  assert.equal(payload.record_counts?.drill_throw_results, 3);
  assert.equal(payload.media_metadata?.videos[0]?.external_file_unavailable, true);
  assert.equal(payload.media_metadata?.photos[0]?.external_file_unavailable, true);
});

test('取り込みプレビューは不正JSON、schema差分、重複候補を判定できる', () => {
  const payload = samplePayload();
  const preview = previewBackupPayload(payload, { drill_throw_results: new Set(['throw-1']) }, 4);
  assert.equal(preview.ok, true);
  if (preview.ok) {
    assert.equal(preview.duplicateTables.drill_throw_results, 1);
    assert.equal(preview.recordCounts.drill_results, 2);
  }
  assert.equal(previewBackupPayload({ ...payload, schema_version: 99 }, {}, 4).ok, false);
});

test('PC分析はBULL、クリケット、キャッチ、得意苦手、レベルを集計できる', () => {
  const analysis = buildPcAnalysis(samplePayload(), 'all');
  assert.equal(analysis.currentLevel, 'B');
  assert.equal(analysis.totalThrows, 21);
  assert.equal(analysis.bull.targetSessions, 1);
  assert.equal(analysis.bull.bestTargetThrows, 12);
  assert.equal(analysis.cricket.totalMarks, 4);
  assert.equal(analysis.catches.catchThrows, 1);
  assert.equal(analysis.level.promotionReady, true);
  assert.equal(analysis.form.assessments, 1);
  assert.ok(
    analysis.strengths.weakCandidates.some((candidate) => candidate.confidence === 'データ不足'),
  );
});

test('BULL旧形式はhit_countを参考BULL本数として扱い、mark_countを使わない', () => {
  const analysis = buildPcAnalysis(
    {
      training_drill_definitions: [
        { id: 'bull_50', name: 'BULL 50', category: 'bull', completion_rule: 'fixed_throws' },
      ],
      drill_results: [
        {
          id: 'legacy-bull',
          drill_session_id: 'legacy-session',
          drill_definition_id: 'bull_50',
          total_throws: 50,
          hit_count: 10,
          mark_count: 12,
          inner_bull: 0,
          outer_bull: 0,
          bull_rate: 0,
          created_at: '2026-08-06T09:08:24.429Z',
          summary_json: '{}',
        },
      ],
      drill_throw_results: [],
    },
    'all',
  );

  assert.equal(analysis.history[0]?.bullCount, 10);
  assert.equal(analysis.history[0]?.bullDisplay, '10本（旧形式）');
  assert.equal(analysis.history[0]?.bullDataKind, 'legacy_summary');
  assert.equal(analysis.history[0]?.bullRate, 10 / 50);
  assert.equal(analysis.bull.legacyBullCount, 10);
  assert.equal(analysis.bull.chart[0]?.value, 20);
  assert.ok(analysis.dataQualityLabels.includes('旧形式集計データ'));
  assert.ok(analysis.dataQualityLabels.includes('INNER／OUTER内訳なし'));
});

test('BULL新形式はinner_bullとouter_bullを優先する', () => {
  const analysis = buildPcAnalysis(
    {
      training_drill_definitions: [
        { id: 'bull_50', name: 'BULL 50', category: 'bull', completion_rule: 'fixed_throws' },
      ],
      drill_results: [
        {
          id: 'new-bull',
          drill_session_id: 'new-session',
          drill_definition_id: 'bull_50',
          total_throws: 50,
          hit_count: 1,
          mark_count: 99,
          inner_bull: 4,
          outer_bull: 6,
          bull_rate: 0,
          created_at: '2026-08-06T09:08:24.429Z',
          summary_json: '{}',
        },
      ],
      drill_throw_results: [
        {
          id: 'throw-new-1',
          drill_session_id: 'new-session',
          is_inner_bull: 1,
          is_outer_bull: 0,
          created_at: '2026-08-06T09:08:24.429Z',
        },
      ],
    },
    'all',
  );

  assert.equal(analysis.history[0]?.bullCount, 10);
  assert.equal(analysis.history[0]?.bullDataKind, 'new_throw');
  assert.equal(analysis.history[0]?.bullRate, 10 / 50);
  assert.equal(analysis.bull.innerBull, 4);
  assert.equal(analysis.bull.outerBull, 6);
  assert.equal(analysis.bull.legacyBullCount, 0);
  assert.ok(analysis.dataQualityLabels.includes('新形式1投データあり'));
});

test('練習時間はdaily minimumから集計し、planとitemを二重計上しない', () => {
  const analysis = buildPcAnalysis(
    {
      daily_minimum_plans: [{ id: 'plan-1', practice_date: '2026-08-06', duration_seconds: 1620 }],
      daily_minimum_items: [
        { id: 'item-1', plan_id: 'plan-1', duration_seconds: 900, completed_at: '2026-08-06' },
        { id: 'item-2', plan_id: 'plan-1', duration_seconds: 720, completed_at: '2026-08-06' },
      ],
      daily_minimum_completion: [
        { id: 'completion-1', practice_date: '2026-08-06', duration_seconds: 1620 },
      ],
    },
    'all',
  );

  assert.equal(analysis.totalPracticeSeconds, 1620);
});

test('練習時間は完了drill_sessionを優先し、関連itemとpractice_sessionを二重計上しない', () => {
  const analysis = buildPcAnalysis(
    {
      drill_sessions: [
        {
          id: 'drill-session-1',
          status: 'completed',
          elapsed_seconds: 600,
          daily_minimum_item_id: 'item-1',
          practice_session_id: 'practice-session-1',
          completed_at: '2026-08-06T09:00:00.000Z',
        },
      ],
      daily_minimum_items: [
        { id: 'item-1', plan_id: 'plan-1', duration_seconds: 600, completed_at: '2026-08-06' },
      ],
      practice_sessions: [
        { id: 'practice-session-1', elapsed_seconds: 600, updated_at: '2026-08-06T09:00:00.000Z' },
      ],
      daily_minimum_plans: [{ id: 'plan-1', practice_date: '2026-08-06', duration_seconds: 600 }],
      daily_minimum_completion: [
        { id: 'completion-1', practice_date: '2026-08-06', duration_seconds: 600 },
      ],
    },
    'all',
  );

  assert.equal(analysis.totalPracticeSeconds, 600);
});

test('ISO日時は日本時間表示に変換する', () => {
  assert.equal(formatJapanDateTime('2026-08-06T09:08:24.429Z'), '2026年8月6日 18:08');
});

test('新旧データ品質を分析可能な範囲として表示する', () => {
  const analysis = buildPcAnalysis(
    {
      training_drill_definitions: [
        { id: 'bull_50', name: 'BULL 50', category: 'bull', completion_rule: 'fixed_throws' },
      ],
      drill_results: [
        {
          id: 'legacy-bull',
          drill_session_id: 'legacy-session',
          drill_definition_id: 'bull_50',
          total_throws: 50,
          hit_count: 10,
          mark_count: 12,
          inner_bull: 0,
          outer_bull: 0,
          bull_rate: 0,
          created_at: '2026-08-06T09:08:24.429Z',
          summary_json: '{}',
        },
        {
          id: 'new-bull',
          drill_session_id: 'new-session',
          drill_definition_id: 'bull_50',
          total_throws: 50,
          hit_count: 10,
          mark_count: 0,
          inner_bull: 5,
          outer_bull: 5,
          bull_rate: 0.2,
          created_at: '2026-08-06T10:08:24.429Z',
          summary_json: '{}',
        },
      ],
      drill_throw_results: [
        {
          id: 'throw-new-1',
          drill_session_id: 'new-session',
          is_inner_bull: 1,
          created_at: '2026-08-06T10:08:24.429Z',
        },
      ],
      media_metadata: {
        photos: [
          {
            id: 'photo-1',
            uri: 'file:///iphone/photo.jpg',
            file_name: 'photo.jpg',
            captured_at: '2026-08-06',
            media_type: 'photo',
            related_session_id: null,
            memo: null,
            external_file_unavailable: true,
          },
        ],
        videos: [],
      },
    },
    'all',
  );

  assert.ok(analysis.dataQualityLabels.includes('新形式1投データあり'));
  assert.ok(analysis.dataQualityLabels.includes('旧形式集計データ'));
  assert.ok(analysis.dataQualityLabels.includes('INNER／OUTER内訳なし'));
  assert.ok(analysis.dataQualityLabels.includes('ラウンド詳細なし'));
  assert.ok(analysis.dataQualityLabels.includes('写真・動画本体なし'));
});

test('CSV出力は日本語Excel向けBOM付きで生成される', () => {
  const csv = buildCsv('throw_results', samplePayload());
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /throw-1/);
});

test('CSVはBOM、CRLF、カンマ、改行、ダブルクォートを正しく扱う', () => {
  const csv = toCsv(
    ['memo', 'line', 'quote'],
    [{ memo: '右にズレる, 後半改善', line: '前半\n後半', quote: '彼は"OK"' }],
  );

  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /\r\n/);
  assert.match(csv, /"右にズレる, 後半改善"/);
  assert.match(csv, /"前半\n後半"/);
  assert.match(csv, /彼は""OK""/);
});

test('0件CSVでもヘッダー行だけを出力する', () => {
  const csv = generateAnalysisCsv('throw_results', {});

  assert.equal(csv.rowCount, 0);
  assert.equal(csv.fileName, 'throw_results.csv');
  assert.match(csv.text, /^\uFEFFid,drill_session_id,round_number/);
  assert.doesNotMatch(csv.text, /\r\n.+/);
});

test('6種類のCSVはそれぞれ別の内容を生成する', () => {
  const names: AnalysisCsvName[] = [
    'session_summary',
    'round_results',
    'throw_results',
    'bull_analysis',
    'cricket_analysis',
    'level_history',
  ];
  const csvByName = names.map((name) => generateAnalysisCsv(name, samplePayload()).text);

  assert.equal(new Set(csvByName).size, names.length);
  assert.match(csvByName[0] ?? '', /drillName/);
  assert.match(csvByName[1] ?? '', /round_number/);
  assert.match(csvByName[2] ?? '', /overall_throw_number/);
  assert.match(csvByName[3] ?? '', /legacy_bull_rate/);
  assert.match(csvByName[4] ?? '', /round_average/);
  assert.match(csvByName[5] ?? '', /previous_level/);
});

test('Web CSVダウンロードはBlob、download属性、click、URL破棄を実行する', () => {
  const originalDocument = globalThis.document;
  const originalUrl = globalThis.URL;
  const originalWindow = globalThis.window;
  const clicked: string[] = [];
  const appended: unknown[] = [];
  const revoked: string[] = [];
  let createdBlob: unknown = null;

  const anchor = {
    href: '',
    download: '',
    style: { display: '' },
    click() {
      clicked.push(this.download);
    },
    remove() {
      appended.pop();
    },
  };

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      body: {
        appendChild(element: unknown) {
          appended.push(element);
        },
      },
      createElement(tag: string) {
        assert.equal(tag, 'a');
        return anchor;
      },
    },
  });
  Object.defineProperty(globalThis, 'URL', {
    configurable: true,
    value: {
      createObjectURL(blob: Blob) {
        createdBlob = blob;
        return 'blob:csv-test';
      },
      revokeObjectURL(url: string) {
        revoked.push(url);
      },
    },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout(callback: () => void) {
        callback();
        return 1;
      },
    },
  });

  try {
    const result = downloadCsvFile('session_summary.csv', 'id\r\n1');

    assert.equal(result.fileName, 'session_summary.csv');
    assert.ok(createdBlob instanceof Blob);
    assert.equal(anchor.download, 'session_summary.csv');
    assert.equal(anchor.href, 'blob:csv-test');
    assert.deepEqual(clicked, ['session_summary.csv']);
    assert.equal(appended.length, 0);
    assert.deepEqual(revoked, ['blob:csv-test']);
  } finally {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: originalDocument });
    Object.defineProperty(globalThis, 'URL', { configurable: true, value: originalUrl });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  }
});
