import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceThrow,
  createInitialProgress,
  summarizeTodayProgress,
  undoProgress,
  validatePracticeMenuInput,
} from '../src/domain/practice';

test('練習メニューを作成でき、任意項目を正規化できる', () => {
  const result = validatePracticeMenuInput({
    title: ' ブル練習 ',
    rounds: '8',
    throwsPerRound: '3',
    sets: '2',
    plannedMinutes: '30',
    restSeconds: '60',
    sortOrder: '2',
    plannedDate: '2026-08-06',
    repeatType: 'once',
    purpose: ' ',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.title, 'ブル練習');
    assert.equal(result.value.purpose, null);
    assert.equal(result.value.rounds, 8);
  }
});

test('必須項目と不正な数値を検証する', () => {
  const result = validatePracticeMenuInput({
    title: '   ',
    rounds: '-1',
    throwsPerRound: '3.5',
    sets: '999',
    plannedDate: '2026-08-06',
    repeatType: 'once',
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.errors.join('\n'), /メニュー名/);
    assert.match(result.errors.join('\n'), /マイナス/);
    assert.match(result.errors.join('\n'), /整数/);
  }
});

test('ラウンドとセットが進み、直前操作だけUndoできる', () => {
  let progress = createInitialProgress();
  progress = { ...progress, status: 'in_progress' };
  progress = advanceThrow(progress, 3, 1, 1);
  progress = advanceThrow(progress, 3, 1, 1);

  assert.equal(progress.currentThrow, 2);
  const undone = undoProgress(progress);
  assert.equal(undone.currentThrow, 1);
  assert.equal(undoProgress(undone).currentThrow, 1);
});

test('今日の進捗を集計できる', () => {
  const summary = summarizeTodayProgress([
    { status: 'completed', elapsed_seconds: 600 },
    { status: 'planned', elapsed_seconds: 0 },
  ]);
  assert.deepEqual(summary, {
    total: 2,
    completed: 1,
    completionRate: 50,
    elapsedSeconds: 600,
    remaining: 1,
  });
});
