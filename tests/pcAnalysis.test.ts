import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BACKUP_EXPORT_FORMAT,
  createBackupEnvelope,
  previewBackupPayload,
  type BackupPayload,
} from '../src/domain/backup';
import { buildCsv, buildPcAnalysis } from '../src/domain/pcAnalysis';

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

test('CSV出力は日本語Excel向けBOM付きで生成される', () => {
  const csv = buildCsv('throw_results', samplePayload());
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /throw-1/);
});
