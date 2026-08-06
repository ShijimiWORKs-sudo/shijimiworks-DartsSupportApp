import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveNextFocusItems,
  derivePracticeRecommendations,
  generateChatGptPrompt,
  hashAssessmentRawText,
  parseChatGptAssessment,
} from '../src/domain/assessment';

test('ChatGPT評価の見出し表記揺れを解析できる', () => {
  const parsed = parseChatGptAssessment(`
【総合評価】
安定している
改善が必要な点：リリースが早い
## スタンス
前足が動く
**次回、最優先で意識すること**
1. 腕を伸ばす
2. 頭を残す
`);

  assert.equal(parsed.hasRecognizedHeading, true);
  assert.equal(parsed.sections.overall, '安定している');
  assert.equal(parsed.sections.improvementPoints, 'リリースが早い');
  assert.match(parsed.sections.nextPriority, /腕を伸ばす/);
});

test('解析できない原文でも保存用の空セクションを返す', () => {
  const parsed = parseChatGptAssessment('今日はよい感じです。');
  assert.equal(parsed.hasRecognizedHeading, false);
  assert.equal(parsed.recognizedCount, 0);
});

test('次回フォーカスは最大2件に制限する', () => {
  const parsed = parseChatGptAssessment(`
【次回、最優先で意識すること】
・リリース後に腕を伸ばす
・頭の位置をそろえる
・肩を開かない
`);
  assert.deepEqual(deriveNextFocusItems(parsed.sections), [
    'リリース後に腕を伸ばす',
    '頭の位置をそろえる',
  ]);
});

test('おすすめ練習メニューを候補化できる', () => {
  const parsed = parseChatGptAssessment(`
【おすすめ練習メニュー】
・ブル3投固定
・20ナンバー
`);
  assert.deepEqual(derivePracticeRecommendations(parsed.sections), ['ブル3投固定', '20ナンバー']);
});

test('指示文には未登録値と前回改善点が入る', () => {
  const prompt = generateChatGptPrompt({
    handedness: '右',
    dartWeight: null,
    direction: '横',
    throwCount: 12,
    practicePurpose: 'ブル練習',
    userConcern: '肘が落ちる',
    previousIssues: ['腕を伸ばす'],
  });

  assert.match(prompt, /利き腕：右/);
  assert.match(prompt, /使用ダーツ重量：未登録/);
  assert.match(prompt, /前回指摘された改善点：腕を伸ばす/);
  assert.match(prompt, /存在しないデータを生成しない/);
});

test('原文ハッシュは同じ原文で同じ値になる', () => {
  assert.equal(hashAssessmentRawText('abc'), hashAssessmentRawText('abc'));
  assert.notEqual(hashAssessmentRawText('abc'), hashAssessmentRawText('abcd'));
});
