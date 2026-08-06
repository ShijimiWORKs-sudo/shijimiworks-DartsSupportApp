import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dailyMinimumForLevel,
  clampBullRound,
  createBullRoundThrows,
  createCricketRoundThrows,
  findWeakCricketTarget,
  generateTimePreset,
  getBuiltInDrills,
  isDrillCompletionReached,
  summarizeDailyMinimum,
  summarizeDrillResult,
  summarizeDrillThrows,
} from '../src/domain/drills';

test('ビルトインメニューは安定IDで重複登録されない', () => {
  const ids = getBuiltInDrills().map((drill) => drill.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('bull_30'));
  assert.ok(ids.includes('bull_target_10'));
  assert.ok(ids.includes('cricket_20_10_marks'));
  assert.ok(ids.includes('cricket_number_15'));
  assert.ok(ids.includes('daily_finish_three'));
  assert.equal(
    getBuiltInDrills().every((drill) => drill.isBuiltin),
    true,
  );
});

test('新規PlayerにC用デイリーミニマムが表示され、レベル変更で候補が変わる', () => {
  const c = dailyMinimumForLevel('C').map((drill) => drill.id);
  const b = dailyMinimumForLevel('B').map((drill) => drill.id);
  assert.deepEqual(c, [
    'warmup_wide_single',
    'bull_target_10',
    'cricket_20_5_marks',
    'daily_finish_three',
  ]);
  assert.ok(b.includes('bull_target_30'));
  assert.notDeepEqual(c, b);
});

test('BULL 30とBULL 50の集計を計算できる', () => {
  const bull30 = summarizeDrillResult({
    drillDefinitionId: 'bull_30',
    drillType: 'bull_30',
    totalThrows: 30,
    innerBull: 4,
    outerBull: 8,
    hitCount: 12,
    roundResults: [
      { roundNumber: 1, throws: 3, hits: 3, innerBull: 1, outerBull: 2 },
      { roundNumber: 2, throws: 3, hits: 0 },
    ],
  });
  assert.equal(bull30.bullRate, 0.4);
  assert.equal(bull30.zeroRounds, 1);

  const bull50 = summarizeDrillResult({
    drillDefinitionId: 'bull_50',
    drillType: 'bull_50',
    totalThrows: 50,
    hitCount: 20,
    roundResults: [
      { roundNumber: 1, throws: 10, hits: 6 },
      { roundNumber: 2, throws: 10, hits: 2 },
    ],
  });
  assert.ok((bull50.fatigueDrop ?? 0) > 0);
});

test('クリケット15投、一周、クローズまでの集計を計算できる', () => {
  const summary = summarizeDrillResult({
    drillDefinitionId: 'cricket_number_15',
    drillType: 'cricket_number_15',
    targetNumber: 20,
    totalThrows: 15,
    markCount: 11,
    roundResults: [
      { roundNumber: 1, targetNumber: 20, throws: 3, marks: 3, singles: 3 },
      { roundNumber: 2, targetNumber: 20, throws: 3, marks: 0 },
      { roundNumber: 3, targetNumber: 20, throws: 3, marks: 4, doubles: 2 },
    ],
  });
  assert.equal(summary.markCount, 11);
  assert.equal(summary.threePlusMarkRounds, 2);
  assert.equal(summary.zeroRounds, 1);
});

test('シングル・ダブル・トリプル命中率とグルーピングを集計できる', () => {
  const summary = summarizeDrillResult({
    drillDefinitionId: 'bull_grouping',
    drillType: 'bull_grouping',
    totalThrows: 3,
    hitCount: 2,
    positions: [
      {
        x: 0,
        y: 0,
        radius: 0,
        angle: 0,
        segment: 'BULL',
        multiplier: 2,
        score: 50,
        confidence: 1,
        inputMethod: 'photo_manual',
      },
      {
        x: 0.1,
        y: 0.1,
        radius: 0.14,
        angle: 45,
        segment: 'BULL',
        multiplier: 1,
        score: 25,
        confidence: 1,
        inputMethod: 'photo_manual',
      },
      {
        x: -0.2,
        y: 0.1,
        radius: 0.22,
        angle: 300,
        segment: 20,
        multiplier: 1,
        score: 20,
        confidence: 1,
        inputMethod: 'photo_manual',
      },
    ],
  });
  assert.equal(summary.successRate, 2 / 3);
  assert.ok((summary.horizontalSpread ?? 0) > 0);
  assert.ok((summary.verticalSpread ?? 0) > 0);
});

test('デイリーミニマム完了率と未完了でも保存可能な要約を作れる', () => {
  const summary = summarizeDailyMinimum([
    { name: 'BULL 30', completed: true, totalThrows: 30, durationSeconds: 600 },
    { name: '締めの3投', completed: false, totalThrows: 3, durationSeconds: 120 },
  ]);
  assert.equal(summary.completionRate, 50);
  assert.deepEqual(summary.incompleteNames, ['締めの3投']);
  assert.equal(summary.totalThrows, 33);
});

test('5分、10分、15分プリセットと苦手ナンバー候補を生成できる', () => {
  assert.equal(generateTimePreset('C', '5')[0]?.name, 'BULL 10本達成');
  assert.ok(generateTimePreset('C', '10').some((drill) => drill.name === 'ウォームアップ9投'));
  assert.ok(generateTimePreset('C', '15').some((drill) => drill.id === 'daily_finish_three'));
  assert.ok(generateTimePreset('B', '30').some((drill) => drill.id === 'bull_target_30'));
  assert.ok(generateTimePreset('AA', '45').some((drill) => drill.id === 'bull_target_50'));
  assert.ok(generateTimePreset('SA', '60').some((drill) => drill.id === 'weak_cricket_number'));
  const weak = findWeakCricketTarget([
    { targetNumber: 20, averageMarks: 2.4, samples: 3 },
    { targetNumber: 18, averageMarks: 0.8, samples: 3 },
  ]);
  assert.equal(weak.targetNumber, 18);
  assert.match(weak.reason, /平均マーク/);
});

test('すべてのビルトインドリルにやり方説明がある', () => {
  for (const drill of getBuiltInDrills()) {
    assert.ok(drill.instructions.shortDescription, `${drill.id} short description`);
    assert.ok(drill.instructions.instructions.length > 0, `${drill.id} instructions`);
    assert.ok(drill.instructions.inputGuide, `${drill.id} input guide`);
    assert.ok(drill.instructions.recordedMetrics.length > 0, `${drill.id} metrics`);
  }
});

test('BULLラウンド入力は3投確定で本数と率を集計できる', () => {
  assert.deepEqual(clampBullRound(2, 2), {
    innerBull: 2,
    outerBull: 1,
    miss: 0,
    bullCount: 3,
  });
  const throws = createBullRoundThrows({
    roundNumber: 1,
    overallThrowStart: 0,
    innerBull: 1,
    outerBull: 1,
  });
  const summary = summarizeDrillThrows(throws);
  assert.equal(throws.length, 3);
  assert.equal(summary.totalThrows, 3);
  assert.equal(summary.innerBull, 1);
  assert.equal(summary.outerBull, 1);
  assert.equal(summary.bullCount, 2);
  assert.equal(summary.bullRate, 2 / 3);
});

test('BULL達成型はラウンド途中達成でも3投保存後に終了判定する', () => {
  const throws = [
    ...createBullRoundThrows({ roundNumber: 1, overallThrowStart: 0, innerBull: 3, outerBull: 0 }),
    ...createBullRoundThrows({ roundNumber: 2, overallThrowStart: 3, innerBull: 3, outerBull: 0 }),
    ...createBullRoundThrows({ roundNumber: 3, overallThrowStart: 6, innerBull: 3, outerBull: 0 }),
    ...createBullRoundThrows({ roundNumber: 4, overallThrowStart: 9, innerBull: 1, outerBull: 0 }),
  ];
  const summary = summarizeDrillThrows(throws);
  assert.equal(summary.totalThrows, 12);
  assert.equal(summary.bullCount, 10);
  assert.equal(
    isDrillCompletionReached(
      {
        completionRule: 'bull_count',
        targetSuccessCount: 10,
        totalThrows: 0,
        targetNumbers: ['BULL'],
      },
      summary,
    ),
    true,
  );
});

test('クリケットのキャッチとBULLマークを3投ラウンドで集計できる', () => {
  const throws = createCricketRoundThrows({
    roundNumber: 1,
    overallThrowStart: 0,
    intendedTarget: 20,
    targetHits: { single: 1, double: 0, triple: 0 },
    catches: [{ actualNumber: 18, multiplier: 3, count: 1 }],
    validTargets: [20, 19, 18],
  });
  const summary = summarizeDrillThrows(throws);
  assert.equal(summary.totalThrows, 3);
  assert.equal(summary.targetProgress['20'], 1);
  assert.equal(summary.targetProgress['18'], 3);
  assert.equal(
    throws.some((throwResult) => throwResult.catchHit),
    true,
  );

  const bullMarks = createCricketRoundThrows({
    roundNumber: 1,
    overallThrowStart: 0,
    intendedTarget: 'BULL',
    targetHits: { single: 1, double: 1, triple: 0 },
    validTargets: ['BULL'],
  });
  assert.equal(summarizeDrillThrows(bullMarks).markCount, 3);
});

test('全カテゴリの独自ドリルがあり、公式ゲームと区別できる', () => {
  const categories = new Set(getBuiltInDrills().map((drill) => drill.category));
  for (const category of [
    'daily_minimum',
    'bull',
    'cricket',
    'single',
    'double',
    'triple',
    'form',
    'pressure',
  ]) {
    assert.ok(categories.has(category as never), `${category} should exist`);
  }
  assert.equal(
    getBuiltInDrills().some((drill) => drill.name === 'COUNT-UP'),
    false,
  );
});
