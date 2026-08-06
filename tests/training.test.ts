import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLAYER_LEVELS,
  assessDemotionCandidate,
  calculateCricketMark,
  calculateLevelCheckScore,
  confirmPromotion,
  createPhotoCandidates,
  evaluatePromotion,
  initialLevelProfile,
  isFinishSuccess,
  nextLevel,
  normalizeFromCalibration,
  scoreNormalizedPoint,
  segmentFromAngle,
  summarizeTrainingGame,
} from '../src/domain/training';

test('新規PlayerはCで開始し、レベル順が正しい', () => {
  const profile = initialLevelProfile();
  assert.equal(profile.currentLevel, 'C');
  assert.deepEqual(PLAYER_LEVELS, ['C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'SA']);
  assert.equal(nextLevel('C'), 'CC');
});

test('3回中2回合格で昇格候補になり、ユーザー確認後に昇格する', () => {
  let profile = initialLevelProfile();
  profile = evaluatePromotion(profile, true);
  profile = evaluatePromotion(profile, false);
  profile = evaluatePromotion(profile, true);
  assert.equal(profile.promotionReady, true);
  assert.equal(profile.provisionalLevel, 'CC');

  const promoted = confirmPromotion(profile);
  assert.equal(promoted.currentLevel, 'CC');
  assert.equal(promoted.promotionReady, false);
});

test('自動降格は行わず降格候補だけを返す', () => {
  const result = assessDemotionCandidate({ ...initialLevelProfile(), currentLevel: 'B' }, 0.1);
  assert.equal(result.demotionCandidate, true);
  assert.equal(result.autoDemoted, false);
});

test('各ゲームのラウンド進行とCOUNT-UP集計を計算できる', () => {
  const summary = summarizeTrainingGame('COUNT_UP', [
    {
      roundNumber: 1,
      throwNumber: 1,
      score: 20,
      segment: 20,
      multiplier: 1,
      inputMethod: 'manual_score',
    },
    {
      roundNumber: 1,
      throwNumber: 2,
      score: 60,
      segment: 20,
      multiplier: 3,
      inputMethod: 'manual_score',
    },
    {
      roundNumber: 1,
      throwNumber: 3,
      score: 0,
      segment: 'OUT',
      multiplier: 0,
      inputMethod: 'manual_score',
    },
  ]);
  assert.equal(summary.totalScore, 80);
  assert.equal(summary.throwAverage, 80 / 3);
  assert.equal(summary.tripleCount, 1);
  assert.equal(summary.missCount, 1);
});

test('CRICKETマーク、EAGLE得点、FINISH成功、LEVEL CHECK総合点を計算できる', () => {
  assert.equal(calculateCricketMark(3, 20), 3);
  assert.equal(calculateCricketMark(2, 'BULL'), 2);
  assert.equal(scoreNormalizedPoint(0.01, 0.01, 'manual_score').score, 50);
  assert.equal(isFinishSuccess(40, [20, 20], 'single'), true);
  assert.equal(
    calculateLevelCheckScore({
      countUp: 80,
      bull: 70,
      twenty: 60,
      cricket: 50,
      finish: 40,
      stability: 30,
    }),
    60,
  );
});

test('写真座標から標準配置セグメントとリングを判定できる', () => {
  assert.equal(segmentFromAngle(0), 20);
  assert.equal(segmentFromAngle(18), 1);
  assert.equal(scoreNormalizedPoint(0, -0.58, 'photo_manual').multiplier, 3);
  assert.equal(scoreNormalizedPoint(0, -0.96, 'photo_manual').multiplier, 2);
});

test('20方向の補正と斜め写真の補正後座標を扱える', () => {
  const normalized = normalizeFromCalibration(
    { x: 200, y: 100 },
    { centerX: 100, centerY: 100, outerRadius: 100, rotationDegrees: 90 },
  );
  assert.ok(Math.abs(normalized.x) < 0.001);
  assert.ok(normalized.y < -0.99);
});

test('候補を手動修正し3本確定でき、失敗時も手動入力できる', () => {
  const candidates = createPhotoCandidates([
    { x: 0, y: 0 },
    { x: 0, y: -0.58 },
    { x: 1.2, y: 0 },
  ]);
  assert.equal(candidates.length, 3);
  const manual = scoreNormalizedPoint(0.2, -0.2, 'photo_manual', 1);
  assert.equal(manual.inputMethod, 'photo_manual');
});
