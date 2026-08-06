import type { PlayerLevel, ThrowPosition } from './training';

export type DrillCategory =
  | 'daily_minimum'
  | 'bull'
  | 'cricket'
  | 'single'
  | 'double'
  | 'triple'
  | 'form'
  | 'pressure'
  | 'favorite'
  | 'custom';

export type DrillType =
  | 'warmup_wide_single'
  | 'bull_target_10'
  | 'bull_target_15'
  | 'bull_target_30'
  | 'bull_target_50'
  | 'bull_30'
  | 'bull_50'
  | 'bull_100'
  | 'bull_grouping'
  | 'first_dart_bull'
  | 'cricket_20_5_marks'
  | 'cricket_20_10_marks'
  | 'cricket_19_10_marks'
  | 'cricket_18_10_marks'
  | 'cricket_20_19_5_marks'
  | 'cricket_20_19_18_5_marks'
  | 'cricket_20_19_18_10_marks'
  | 'cricket_20_to_15_10_marks'
  | 'cricket_20_to_bull_10_marks'
  | 'cricket_custom_marks'
  | 'cricket_number_15'
  | 'cricket_full_round'
  | 'cricket_close'
  | 'weak_cricket_number'
  | 'random_cricket'
  | 'wide_single_round'
  | 'number_three_dart'
  | 'odd_even_single'
  | 'double_round'
  | 'common_doubles'
  | 'double_close'
  | 't20_t19_focus'
  | 'triple_round'
  | 'triple_or_big_single'
  | 'no_score_form'
  | 'seventy_percent_throw'
  | 'follow_through_hold'
  | 'last_dart_pressure'
  | 'streak_challenge'
  | 'reset_on_miss'
  | 'daily_finish_three'
  | 'custom';

export type TimePreset = '5' | '10' | '15' | '30' | '45' | '60' | 'custom';

export type DrillInputMode =
  'round_three_throw' | 'round_summary' | 'photo_round' | 'manual_summary';

export type DrillCompletionRule =
  'fixed_throws' | 'bull_count' | 'mark_count' | 'all_targets_mark_count' | 'manual';

export type DrillInstructionDetails = {
  shortDescription: string;
  preparation: string[];
  instructions: string[];
  successCondition: string;
  finishCondition: string;
  inputGuide: string;
  recordedMetrics: string[];
  commonMistakes: string[];
  cautions: string[];
  beginnerTips: string[];
  photoScoringSupported: boolean;
  videoRecommended: boolean;
};

export type DrillDefinition = {
  id: string;
  type: DrillType;
  category: DrillCategory;
  name: string;
  purpose: string;
  targetNumbers: (number | 'BULL' | string)[];
  totalThrows: number;
  rounds: number | null;
  throwsPerRound: number | null;
  estimatedMinutes: number;
  targetLevelMin: PlayerLevel;
  targetLevelMax: PlayerLevel;
  isDailyMinimum: boolean;
  isBuiltin: boolean;
  difficulty: number;
  sortOrder: number;
  successRule: string;
  scoringMode: 'hit' | 'mark' | 'score' | 'coordinate' | 'self_rating';
  inputMode: DrillInputMode;
  markMode: 'none' | 'cricket' | 'bull_count';
  targetSuccessCount: number | null;
  completionRule: DrillCompletionRule;
  canUsePhoto: boolean;
  canUseVideo: boolean;
  instructions: DrillInstructionDetails;
};

export type DrillResultInput = {
  drillDefinitionId: string;
  drillType: DrillType;
  totalThrows: number;
  hitCount?: number;
  markCount?: number;
  innerBull?: number;
  outerBull?: number;
  singleCount?: number;
  doubleCount?: number;
  tripleCount?: number;
  durationSeconds?: number;
  targetNumber?: number | 'BULL' | string | null;
  roundResults?: DrillRoundResult[];
  positions?: ThrowPosition[];
};

export type DrillRoundResult = {
  roundNumber: number;
  targetNumber?: number | 'BULL' | string | null;
  throws: number;
  hits?: number;
  marks?: number;
  innerBull?: number;
  outerBull?: number;
  singles?: number;
  doubles?: number;
  triples?: number;
};

export type DrillThrowResultInput = {
  roundNumber: number;
  throwNumber: number;
  overallThrowNumber: number;
  resultType: string;
  intendedTarget?: number | 'BULL' | string | null;
  targetNumber?: number | 'BULL' | string | null;
  actualNumber?: number | 'BULL' | string | null;
  segment?: string | null;
  multiplier: number;
  score: number;
  markCount: number;
  isHit: boolean;
  isInnerBull: boolean;
  isOuterBull: boolean;
  targetHit: boolean;
  catchHit: boolean;
  inputMethod:
    | 'round_count'
    | 'round_detail'
    | 'photo_auto'
    | 'photo_adjusted'
    | 'photo_manual'
    | 'score_manual';
};

export type DrillThrowSummary = {
  totalThrows: number;
  hitCount: number;
  markCount: number;
  innerBull: number;
  outerBull: number;
  bullCount: number;
  bullRate: number;
  innerRate: number;
  singleCount: number;
  doubleCount: number;
  tripleCount: number;
  longestBullStreak: number;
  longestNoBullStreak: number;
  allBullRounds: number;
  allInnerRounds: number;
  zeroMarkRounds: number;
  tenThrowBullCounts: number[];
  twentyFiveThrowBullCounts: number[];
  firstHalfBullRate: number | null;
  secondHalfBullRate: number | null;
  fatigueDropCandidate: boolean;
  targetProgress: Record<string, number>;
};

export type DrillSummary = {
  totalThrows: number;
  hitCount: number;
  markCount: number;
  successRate: number;
  bullRate: number;
  roundAverage: number;
  zeroRounds: number;
  threePlusMarkRounds: number;
  bestTarget: string | null;
  weakestTarget: string | null;
  longestStreak: number;
  longestMissStreak: number;
  groupingRadius: number | null;
  horizontalSpread: number | null;
  verticalSpread: number | null;
  fatigueDrop: number | null;
};

export type DailyMinimumSummary = {
  totalItems: number;
  completedItems: number;
  completionRate: number;
  totalThrows: number;
  durationSeconds: number;
  incompleteNames: string[];
  streakDays: number;
  achievedDaysThisWeek: number;
};

export const BUILTIN_DRILL_DEFINITIONS: DrillDefinition[] = [
  drill(
    'warmup_wide_single',
    'warmup_wide_single',
    'daily_minimum',
    'ウォームアップ・ワイドシングル',
    '肩、肘、手首を慣らし、大きいシングルへ安定して入れる',
    [20, 19, 18, 17, 16, 15],
    18,
    6,
    3,
    5,
    'C',
    'CCC',
    true,
    10,
    '対象ナンバーへ入れば命中。ダブル、トリプルも命中扱い。',
    'hit',
    false,
    false,
  ),
  drill(
    'bull_target_10',
    'bull_target_10',
    'bull',
    'BULL 10本達成',
    'INNERとOUTERを合わせて10本のBULL到達を目指す',
    ['BULL'],
    0,
    null,
    3,
    8,
    'C',
    'SA',
    true,
    18,
    'BULL合計が10本に到達したラウンドで終了する。',
    'coordinate',
    true,
    false,
    {
      markMode: 'bull_count',
      targetSuccessCount: 10,
      completionRule: 'bull_count',
    },
  ),
  drill(
    'bull_target_15',
    'bull_target_15',
    'bull',
    'BULL 15本達成',
    '15本到達までの投数とラウンド数を記録する',
    ['BULL'],
    0,
    null,
    3,
    12,
    'CCC',
    'SA',
    true,
    19,
    'BULL合計が15本に到達したラウンドで終了する。',
    'coordinate',
    true,
    false,
    {
      markMode: 'bull_count',
      targetSuccessCount: 15,
      completionRule: 'bull_count',
    },
  ),
  drill(
    'bull_target_30',
    'bull_target_30',
    'bull',
    'BULL 30本達成',
    '30本到達までの安定性と疲労傾向を見る',
    ['BULL'],
    0,
    null,
    3,
    20,
    'B',
    'SA',
    false,
    22,
    'BULL合計が30本に到達したラウンドで終了する。',
    'coordinate',
    true,
    false,
    {
      markMode: 'bull_count',
      targetSuccessCount: 30,
      completionRule: 'bull_count',
    },
  ),
  drill(
    'bull_target_50',
    'bull_target_50',
    'bull',
    'BULL 50本達成',
    '50本到達までの長時間再現性を確認する',
    ['BULL'],
    0,
    null,
    3,
    35,
    'A',
    'SA',
    false,
    23,
    'BULL合計が50本に到達したラウンドで終了する。',
    'coordinate',
    true,
    false,
    {
      markMode: 'bull_count',
      targetSuccessCount: 50,
      completionRule: 'bull_count',
    },
  ),
  drill(
    'bull_30',
    'bull_30',
    'bull',
    'BULL 30投',
    '10ラウンド30投でBULL率と集中度を見る',
    ['BULL'],
    30,
    10,
    3,
    10,
    'C',
    'SA',
    true,
    20,
    'INNER/OUTER BULLを記録する。',
    'coordinate',
    true,
    false,
  ),
  drill(
    'bull_50',
    'bull_50',
    'bull',
    'BULL 50投',
    '50投で長めの再現性と疲労低下を見る',
    ['BULL'],
    50,
    5,
    10,
    18,
    'B',
    'SA',
    true,
    30,
    '10投単位でBULL数を記録する。',
    'coordinate',
    true,
    false,
  ),
  drill(
    'bull_100',
    'bull_100',
    'bull',
    'BULL 100投',
    '100投でBULL率推移と疲労傾向を見る',
    ['BULL'],
    100,
    4,
    25,
    35,
    'A',
    'SA',
    true,
    40,
    '25投単位で成績を比較する。',
    'coordinate',
    true,
    false,
  ),
  drill(
    'bull_grouping',
    'bull_grouping',
    'bull',
    '3本グルーピング',
    '得点より3本のまとまりを評価する',
    ['BULL'],
    30,
    10,
    3,
    15,
    'BBB',
    'SA',
    true,
    35,
    '3本の座標から散らばりを評価する。',
    'coordinate',
    true,
    false,
  ),
  drill(
    'first_dart_bull',
    'first_dart_bull',
    'bull',
    '1本目BULL',
    '構え直し後の最初の1投を安定させる',
    ['BULL'],
    20,
    20,
    1,
    12,
    'CC',
    'SA',
    false,
    24,
    '毎回抜いて構え直し、1投目だけを評価する。',
    'hit',
    true,
    false,
  ),
  drill(
    'cricket_20_5_marks',
    'cricket_20_5_marks',
    'cricket',
    '20を5マーク',
    '20ナンバーを5マークするまで狙う',
    [20],
    0,
    null,
    3,
    5,
    'C',
    'CCC',
    true,
    36,
    '20の累計マークが5以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 5,
      completionRule: 'mark_count',
    },
  ),
  drill(
    'cricket_20_10_marks',
    'cricket_20_10_marks',
    'cricket',
    '20を10マーク',
    '20ナンバーを10マークするまで狙う',
    [20],
    0,
    null,
    3,
    8,
    'CC',
    'SA',
    false,
    37,
    '20の累計マークが10以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 10,
      completionRule: 'mark_count',
    },
  ),
  drill(
    'cricket_19_10_marks',
    'cricket_19_10_marks',
    'cricket',
    '19を10マーク',
    '19ナンバーを10マークするまで狙う',
    [19],
    0,
    null,
    3,
    8,
    'CC',
    'SA',
    false,
    38,
    '19の累計マークが10以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 10,
      completionRule: 'mark_count',
    },
  ),
  drill(
    'cricket_18_10_marks',
    'cricket_18_10_marks',
    'cricket',
    '18を10マーク',
    '18ナンバーを10マークするまで狙う',
    [18],
    0,
    null,
    3,
    8,
    'CC',
    'SA',
    false,
    39,
    '18の累計マークが10以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 10,
      completionRule: 'mark_count',
    },
  ),
  drill(
    'cricket_20_19_5_marks',
    'cricket_20_19_5_marks',
    'cricket',
    '20・19を各5マーク',
    '20と19をどちらも5マークまで積み上げる',
    [20, 19],
    0,
    null,
    3,
    8,
    'CC',
    'SA',
    true,
    40,
    '20と19がどちらも5マーク以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 5,
      completionRule: 'all_targets_mark_count',
    },
  ),
  drill(
    'cricket_20_19_18_5_marks',
    'cricket_20_19_18_5_marks',
    'cricket',
    '20・19・18を各5マーク',
    '20、19、18をすべて5マークまで積み上げる',
    [20, 19, 18],
    0,
    null,
    3,
    10,
    'CCC',
    'SA',
    true,
    41,
    '20、19、18がすべて5マーク以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 5,
      completionRule: 'all_targets_mark_count',
    },
  ),
  drill(
    'cricket_20_19_18_10_marks',
    'cricket_20_19_18_10_marks',
    'cricket',
    '20・19・18を各10マーク',
    '上位クリケット3ナンバーを均等に鍛える',
    [20, 19, 18],
    0,
    null,
    3,
    15,
    'B',
    'SA',
    false,
    42,
    '20、19、18がすべて10マーク以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 10,
      completionRule: 'all_targets_mark_count',
    },
  ),
  drill(
    'cricket_20_to_15_10_marks',
    'cricket_20_to_15_10_marks',
    'cricket',
    '20～15を各10マーク',
    'クリケット全ナンバーの達成力を確認する',
    [20, 19, 18, 17, 16, 15],
    0,
    null,
    3,
    25,
    'BBB',
    'SA',
    false,
    43,
    '20から15がすべて10マーク以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 10,
      completionRule: 'all_targets_mark_count',
    },
  ),
  drill(
    'cricket_20_to_bull_10_marks',
    'cricket_20_to_bull_10_marks',
    'cricket',
    '20～15・BULLを各10マーク',
    'クリケット全対象とBULLを同じ基準で鍛える',
    [20, 19, 18, 17, 16, 15, 'BULL'],
    0,
    null,
    3,
    30,
    'A',
    'SA',
    false,
    44,
    '20から15とBULLがすべて10マーク以上になったラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 10,
      completionRule: 'all_targets_mark_count',
    },
  ),
  drill(
    'cricket_custom_marks',
    'cricket_custom_marks',
    'cricket',
    '任意ナンバーを指定マーク',
    '対象ナンバーと目標マーク数を決めて達成まで続ける',
    [20],
    0,
    null,
    3,
    10,
    'C',
    'SA',
    false,
    45,
    'ユーザーが選んだ対象の指定マークに到達したラウンドで終了する。',
    'mark',
    true,
    false,
    {
      targetSuccessCount: 10,
      completionRule: 'mark_count',
    },
  ),
  drill(
    'cricket_number_15',
    'cricket_number_15',
    'cricket',
    '各ナンバー15投',
    '選択したクリケットナンバーのマーク力を鍛える',
    [20],
    15,
    5,
    3,
    8,
    'CC',
    'SA',
    false,
    40,
    'SINGLE=1、DOUBLE=2、TRIPLE=3マーク。',
    'mark',
    true,
    false,
  ),
  drill(
    'cricket_full_round',
    'cricket_full_round',
    'cricket',
    'クリケット一周',
    '20から15とBULLを各3投する',
    [20, 19, 18, 17, 16, 15, 'BULL'],
    21,
    7,
    3,
    12,
    'CCC',
    'SA',
    true,
    42,
    'ナンバー別マークを比較する。',
    'mark',
    true,
    false,
  ),
  drill(
    'cricket_close',
    'cricket_close',
    'cricket',
    'クローズ練習',
    '対象ナンバーを3マークするまで投げる',
    [20],
    15,
    null,
    null,
    8,
    'B',
    'SA',
    false,
    44,
    '最大投数内に3マークできるか記録する。',
    'mark',
    true,
    false,
  ),
  drill(
    'weak_cricket_number',
    'weak_cricket_number',
    'cricket',
    '苦手ナンバー集中',
    '過去データから弱いクリケットナンバーを候補表示する',
    [20, 19, 18, 17, 16, 15, 'BULL'],
    15,
    5,
    3,
    8,
    'B',
    'SA',
    false,
    46,
    '根拠を確認してから15投、30投、クローズまでを選ぶ。',
    'mark',
    true,
    false,
  ),
  drill(
    'random_cricket',
    'random_cricket',
    'cricket',
    'ランダムクリケット',
    'ラウンドごとに対象を切り替える',
    [20, 19, 18, 17, 16, 15, 'BULL'],
    30,
    10,
    3,
    15,
    'BBB',
    'SA',
    false,
    48,
    '平均マークと切替の苦手を記録する。',
    'mark',
    true,
    false,
  ),
  drill(
    'wide_single_round',
    'wide_single_round',
    'single',
    '大きいシングル一周',
    '1から20を順番に大きく狙う',
    Array.from({ length: 20 }, (_, index) => index + 1),
    20,
    20,
    1,
    10,
    'C',
    'BBB',
    true,
    60,
    'SINGLE/DOUBLE/TRIPLEは命中、隣は失敗。',
    'hit',
    false,
    false,
  ),
  drill(
    'number_three_dart',
    'number_three_dart',
    'single',
    'ナンバー3投チャレンジ',
    '指定ナンバーへ1本以上入れて次へ進む',
    Array.from({ length: 20 }, (_, index) => index + 1),
    60,
    20,
    3,
    25,
    'CC',
    'SA',
    false,
    62,
    '3投以内に1本以上入ればクリア。',
    'hit',
    false,
    false,
  ),
  drill(
    'odd_even_single',
    'odd_even_single',
    'single',
    '奇数・偶数練習',
    '奇数または偶数ナンバーをまとめて鍛える',
    [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    30,
    10,
    3,
    15,
    'C',
    'A',
    false,
    64,
    'モードを選んで対象番号へ命中させる。',
    'hit',
    false,
    false,
  ),
  drill(
    'double_round',
    'double_round',
    'double',
    'ダブル一周',
    'D1からD20の命中率を確認する',
    Array.from({ length: 20 }, (_, index) => `D${index + 1}`),
    60,
    20,
    3,
    25,
    'B',
    'SA',
    false,
    70,
    '指定ダブルへの命中数を保存する。',
    'hit',
    false,
    false,
  ),
  drill(
    'common_doubles',
    'common_doubles',
    'double',
    'よく使うダブル',
    'D20、D16、D12などを重点練習する',
    ['D20', 'D16', 'D12', 'D10', 'D8', 'D4', 'D2', 'D1'],
    48,
    8,
    6,
    20,
    'B',
    'SA',
    true,
    72,
    '各ダブルへ6投または9投。',
    'hit',
    false,
    false,
  ),
  drill(
    'double_close',
    'double_close',
    'double',
    'ダブルクローズ',
    '指定ダブルへ入るまで投げる',
    ['D20'],
    15,
    null,
    null,
    8,
    'BB',
    'SA',
    false,
    74,
    '入るまでの投数を保存する。',
    'hit',
    false,
    false,
  ),
  drill(
    't20_t19_focus',
    't20_t19_focus',
    'triple',
    'T20・T19集中',
    'T20とT19を重点的に鍛える',
    ['T20', 'T19'],
    30,
    10,
    3,
    15,
    'BBB',
    'SA',
    true,
    80,
    'TRIPLE数と対象ナンバー内命中を保存する。',
    'mark',
    false,
    false,
  ),
  drill(
    'triple_round',
    'triple_round',
    'triple',
    'トリプル一周',
    'T20からT15を各3投する',
    ['T20', 'T19', 'T18', 'T17', 'T16', 'T15'],
    18,
    6,
    3,
    10,
    'A',
    'SA',
    false,
    82,
    '対象トリプル命中を記録する。',
    'mark',
    false,
    false,
  ),
  drill(
    'triple_or_big_single',
    'triple_or_big_single',
    'triple',
    '大きいシングル優先モード',
    '細いトリプル狙いで崩れないようにする',
    ['T20'],
    30,
    10,
    3,
    15,
    'C',
    'B',
    false,
    84,
    'TRIPLE最優先または大きいシングルへまとめる。',
    'hit',
    false,
    false,
  ),
  drill(
    'no_score_form',
    'no_score_form',
    'form',
    'ノースコアフォーム',
    '得点を記録せず意識項目を確認する',
    [],
    15,
    5,
    3,
    10,
    'C',
    'SA',
    true,
    90,
    '1つまたは2つの意識項目と本人評価を保存する。',
    'self_rating',
    false,
    true,
  ),
  drill(
    'seventy_percent_throw',
    'seventy_percent_throw',
    'form',
    '70％スロー',
    '力みを減らし腕の軌道をそろえる',
    ['BULL', 20],
    15,
    5,
    3,
    10,
    'C',
    'SA',
    false,
    92,
    '通常より力を抑えて投げる。',
    'self_rating',
    false,
    true,
  ),
  drill(
    'follow_through_hold',
    'follow_through_hold',
    'form',
    'フォロースルー静止',
    '投げた後に約1秒静止する',
    [],
    15,
    5,
    3,
    10,
    'C',
    'SA',
    false,
    94,
    '手の終了位置を本人が評価する。',
    'self_rating',
    false,
    true,
  ),
  drill(
    'last_dart_pressure',
    'last_dart_pressure',
    'pressure',
    '最後の1本',
    '3投目だけを評価する',
    ['BULL'],
    30,
    10,
    3,
    12,
    'B',
    'SA',
    false,
    100,
    '3投目でBULLまたは指定ナンバーへ入るか記録する。',
    'hit',
    false,
    false,
  ),
  drill(
    'streak_challenge',
    'streak_challenge',
    'pressure',
    '連続成功チャレンジ',
    '目標連続数を設定して挑戦する',
    ['BULL', 20],
    30,
    null,
    null,
    15,
    'B',
    'SA',
    false,
    102,
    'BULL、大きい20、任意ナンバー、任意ダブルを対象にする。',
    'hit',
    false,
    false,
  ),
  drill(
    'reset_on_miss',
    'reset_on_miss',
    'pressure',
    'ミスでリセット',
    '指定本数まで外したら0に戻す',
    [20],
    30,
    null,
    null,
    15,
    'B',
    'SA',
    false,
    104,
    '初心者には強制せずB以上のおすすめにする。',
    'hit',
    false,
    false,
  ),
  drill(
    'daily_finish_three',
    'daily_finish_three',
    'daily_minimum',
    '締めの3投',
    'その日の終了時点の状態を記録する',
    ['BULL'],
    3,
    1,
    3,
    2,
    'C',
    'SA',
    true,
    110,
    'BULLまたは重点ナンバーへ3投。レベル上下には使わない。',
    'self_rating',
    true,
    false,
  ),
];

export const DAILY_MINIMUM_BY_LEVEL: Record<PlayerLevel, string[]> = {
  C: ['warmup_wide_single', 'bull_target_10', 'cricket_20_5_marks', 'daily_finish_three'],
  CC: ['warmup_wide_single', 'bull_target_10', 'cricket_20_19_5_marks', 'daily_finish_three'],
  CCC: ['bull_target_15', 'cricket_20_19_18_5_marks', 'cricket_full_round', 'daily_finish_three'],
  B: [
    'bull_target_30',
    'weak_cricket_number',
    'cricket_full_round',
    'common_doubles',
    'daily_finish_three',
  ],
  BB: ['bull_target_30', 't20_t19_focus', 'weak_cricket_number', 'common_doubles', 'no_score_form'],
  BBB: ['bull_target_30', 'bull_50', 'random_cricket', 't20_t19_focus', 'common_doubles'],
  A: ['bull_target_50', 'bull_100', 't20_t19_focus', 'double_round', 'last_dart_pressure'],
  AA: [
    'bull_target_50',
    'weak_cricket_number',
    'random_cricket',
    'common_doubles',
    'no_score_form',
  ],
  AAA: ['bull_target_50', 't20_t19_focus', 'random_cricket', 'double_round', 'streak_challenge'],
  SA: ['bull_target_50', 'weak_cricket_number', 'random_cricket', 'double_round', 'reset_on_miss'],
};

export function getBuiltInDrills() {
  return BUILTIN_DRILL_DEFINITIONS;
}

export function dailyMinimumForLevel(level: PlayerLevel) {
  const ids = DAILY_MINIMUM_BY_LEVEL[level];
  return ids
    .map((id) => BUILTIN_DRILL_DEFINITIONS.find((drill) => drill.id === id))
    .filter((drill): drill is DrillDefinition => Boolean(drill));
}

export function generateTimePreset(level: PlayerLevel, preset: TimePreset) {
  const minutes = preset === 'custom' ? 30 : Number.parseInt(preset, 10);
  if (minutes <= 5) {
    return ['bull_target_10', 'cricket_20_5_marks', 'daily_finish_three'].map(toShortPreset);
  }
  if (minutes <= 10) {
    return ['warmup_wide_single', 'bull_target_10', 'cricket_20_5_marks'].map(toShortPreset);
  }
  if (minutes <= 15) {
    return ['warmup_wide_single', 'bull_target_10', 'cricket_20_5_marks', 'daily_finish_three'].map(
      toShortPreset,
    );
  }
  return dailyMinimumForLevel(level).slice(0, minutes >= 45 ? 6 : 4);
}

export function summarizeDrillResult(input: DrillResultInput): DrillSummary {
  const roundResults = input.roundResults ?? [];
  const totalThrows = input.totalThrows;
  const hitCount = input.hitCount ?? (input.innerBull ?? 0) + (input.outerBull ?? 0);
  const markCount =
    input.markCount ?? roundResults.reduce((sum, round) => sum + (round.marks ?? 0), 0);
  const roundCount = Math.max(roundResults.length, 1);
  const byTarget = new Map<string, { value: number; count: number }>();
  for (const round of roundResults) {
    const key = String(round.targetNumber ?? input.targetNumber ?? '未指定');
    const value = round.marks ?? round.hits ?? 0;
    const current = byTarget.get(key) ?? { value: 0, count: 0 };
    current.value += value;
    current.count += 1;
    byTarget.set(key, current);
  }
  const ranked = [...byTarget.entries()].sort(
    (a, b) => b[1].value / b[1].count - a[1].value / a[1].count,
  );
  const positions = input.positions ?? [];
  const xs = positions.map((position) => position.x);
  const ys = positions.map((position) => position.y);
  const half = Math.floor(roundResults.length / 2);
  const firstHalf = roundResults
    .slice(0, half)
    .reduce((sum, round) => sum + (round.hits ?? round.marks ?? 0), 0);
  const secondHalf = roundResults
    .slice(half)
    .reduce((sum, round) => sum + (round.hits ?? round.marks ?? 0), 0);
  return {
    totalThrows,
    hitCount,
    markCount,
    successRate: totalThrows ? hitCount / totalThrows : 0,
    bullRate: totalThrows ? ((input.innerBull ?? 0) + (input.outerBull ?? 0)) / totalThrows : 0,
    roundAverage: roundResults.length
      ? roundResults.reduce((sum, round) => sum + (round.marks ?? round.hits ?? 0), 0) / roundCount
      : 0,
    zeroRounds: roundResults.filter((round) => (round.marks ?? round.hits ?? 0) === 0).length,
    threePlusMarkRounds: roundResults.filter((round) => (round.marks ?? 0) >= 3).length,
    bestTarget: ranked[0]?.[0] ?? null,
    weakestTarget: ranked.at(-1)?.[0] ?? null,
    longestStreak: longestStreak(roundResults.map((round) => (round.hits ?? round.marks ?? 0) > 0)),
    longestMissStreak: longestStreak(
      roundResults.map((round) => (round.hits ?? round.marks ?? 0) === 0),
    ),
    groupingRadius: positions.length
      ? Math.max(...positions.map((position) => position.radius))
      : null,
    horizontalSpread: xs.length ? Math.max(...xs) - Math.min(...xs) : null,
    verticalSpread: ys.length ? Math.max(...ys) - Math.min(...ys) : null,
    fatigueDrop:
      roundResults.length >= 2
        ? firstHalf / Math.max(half, 1) - secondHalf / Math.max(roundResults.length - half, 1)
        : null,
  };
}

export function summarizeDailyMinimum(
  items: { name: string; completed: boolean; totalThrows: number; durationSeconds: number }[],
  history: { date: string; achieved: boolean }[] = [],
): DailyMinimumSummary {
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.completed).length;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  return {
    totalItems,
    completedItems,
    completionRate: totalItems ? Math.round((completedItems / totalItems) * 100) : 0,
    totalThrows: items.reduce((sum, item) => sum + item.totalThrows, 0),
    durationSeconds: items.reduce((sum, item) => sum + item.durationSeconds, 0),
    incompleteNames: items.filter((item) => !item.completed).map((item) => item.name),
    streakDays: countStreak(history),
    achievedDaysThisWeek: history.filter(
      (entry) => entry.achieved && new Date(entry.date) >= weekStart,
    ).length,
  };
}

export function findWeakCricketTarget(
  results: { targetNumber: number | 'BULL'; averageMarks: number; samples: number }[],
) {
  const eligible = results.filter((result) => result.samples >= 2);
  const weakest = [...eligible].sort((a, b) => a.averageMarks - b.averageMarks)[0];
  if (!weakest) {
    return {
      targetNumber: 18 as const,
      reason: '十分な過去データがないため、初期候補として18ナンバー15投をおすすめします。',
    };
  }
  return {
    targetNumber: weakest.targetNumber,
    reason: `直近データで${weakest.targetNumber}の平均マークが最も低いため、${weakest.targetNumber}ナンバー15投をおすすめします。`,
  };
}

function drill(
  id: string,
  type: DrillType,
  category: DrillCategory,
  name: string,
  purpose: string,
  targetNumbers: (number | 'BULL' | string)[],
  totalThrows: number,
  rounds: number | null,
  throwsPerRound: number | null,
  estimatedMinutes: number,
  targetLevelMin: PlayerLevel,
  targetLevelMax: PlayerLevel,
  isDailyMinimum: boolean,
  sortOrder: number,
  successRule: string,
  scoringMode: DrillDefinition['scoringMode'],
  canUsePhoto: boolean,
  canUseVideo: boolean,
  overrides: Partial<
    Pick<DrillDefinition, 'inputMode' | 'markMode' | 'targetSuccessCount' | 'completionRule'>
  > = {},
): DrillDefinition {
  const targetSuccessCount = overrides.targetSuccessCount ?? parseTargetCount(successRule);
  const completionRule =
    overrides.completionRule ??
    (targetSuccessCount
      ? scoringMode === 'mark'
        ? targetNumbers.length > 1
          ? 'all_targets_mark_count'
          : 'mark_count'
        : 'bull_count'
      : totalThrows > 0
        ? 'fixed_throws'
        : 'manual');
  return {
    id,
    type,
    category,
    name,
    purpose,
    targetNumbers,
    totalThrows,
    rounds,
    throwsPerRound,
    estimatedMinutes,
    targetLevelMin,
    targetLevelMax,
    isDailyMinimum,
    isBuiltin: true,
    difficulty: sortOrder,
    sortOrder,
    successRule,
    scoringMode,
    inputMode: overrides.inputMode ?? 'round_three_throw',
    markMode:
      overrides.markMode ??
      (scoringMode === 'mark' ? 'cricket' : scoringMode === 'coordinate' ? 'bull_count' : 'none'),
    targetSuccessCount,
    completionRule,
    canUsePhoto,
    canUseVideo,
    instructions: createInstructionDetails({
      id,
      category,
      name,
      purpose,
      targetNumbers,
      totalThrows,
      rounds,
      throwsPerRound,
      successRule,
      scoringMode,
      canUsePhoto,
      canUseVideo,
      completionRule,
      targetSuccessCount,
    }),
  };
}

function parseTargetCount(successRule: string): number | null {
  const match = successRule.match(/(\d+)(?:本|マーク)/);
  return match ? Number.parseInt(match[1]!, 10) : null;
}

function createInstructionDetails(input: {
  id: string;
  category: DrillCategory;
  name: string;
  purpose: string;
  targetNumbers: (number | 'BULL' | string)[];
  totalThrows: number;
  rounds: number | null;
  throwsPerRound: number | null;
  successRule: string;
  scoringMode: DrillDefinition['scoringMode'];
  canUsePhoto: boolean;
  canUseVideo: boolean;
  completionRule: DrillCompletionRule;
  targetSuccessCount: number | null;
}): DrillInstructionDetails {
  const targetText = formatTargets(input.targetNumbers);
  const roundText = input.throwsPerRound
    ? `${input.throwsPerRound}投を1ラウンド`
    : '設定した区切り';
  const fixedFinish =
    input.totalThrows > 0 ? `${input.totalThrows}投で終了` : '目標達成ラウンドで終了';
  const common = {
    shortDescription: input.purpose,
    preparation: ['狙う場所と入力方式を確認する', '無理のない姿勢でスローラインに立つ'],
    instructions: [
      `${targetText}を狙う`,
      `${roundText}として投げる`,
      '3投が終わったらラウンド結果をまとめて入力する',
      '入力内容を確認してラウンドを確定する',
      '終了条件に達するまで次のラウンドへ進む',
    ],
    successCondition: input.successRule,
    finishCondition:
      input.completionRule === 'fixed_throws'
        ? fixedFinish
        : `${targetText}の累計が${input.targetSuccessCount ?? '設定'}に到達したラウンドで終了`,
    inputGuide:
      '標準は3投まとめて入力です。必要に応じて本数入力、3投個別入力、写真判定へ切り替えます。',
    recordedMetrics: ['総投矢数', 'ラウンド別結果', '命中率またはマーク平均', '中断・再開情報'],
    commonMistakes: [
      '投げる途中でスマートフォンを操作してリズムを崩す',
      '狙いと違う有効ナンバーのキャッチを見落とす',
    ],
    cautions: [
      '痛みや強い疲労がある場合は中断する',
      '得点だけでなく同じフォームで投げられたかも確認する',
    ],
    beginnerTips: ['細いエリアだけでなく、まず対象ナンバー全体へ集める意識で投げる'],
    photoScoringSupported: input.canUsePhoto,
    videoRecommended: input.canUseVideo,
  };

  if (input.category === 'bull') {
    return {
      ...common,
      preparation: ['BULLを狙える立ち位置を確認する', 'INNER/OUTER/MISSの入力方法を確認する'],
      instructions: [
        'BULLを狙って3投する',
        'ダーツを抜く前または抜いた後に盤面を確認する',
        'INNER本数とOUTER本数を入力する',
        'MISSは3本から自動計算される',
        'ラウンドを確定して次の3投へ進む',
      ],
      recordedMetrics: [
        '総投矢数',
        'INNER BULL数',
        'OUTER BULL数',
        'BULL合計',
        'BULL率',
        '10投・25投区間',
        '最大連続BULL',
      ],
      commonMistakes: ['BULLに入った本数だけを覚えて後で入力する', 'INNERとOUTERを混同する'],
      cautions: ['前のダーツへ無理に重ねない', '長時間ドリルでは短い休憩を入れてもよい'],
    };
  }

  if (input.category === 'cricket') {
    return {
      ...common,
      preparation: [
        '現在の狙いと対象ナンバーを確認する',
        'キャッチ入力が必要な場合は有効対象を確認する',
      ],
      instructions: [
        `${targetText}の現在の推奨狙いへ3投する`,
        '対象ナンバーのSINGLE/DOUBLE/TRIPLE本数を入力する',
        '別の有効対象に入った場合はキャッチとして追加する',
        '対象外に入った投数はその他として保存する',
        '全対象が目標マークへ到達するまで続ける',
      ],
      recordedMetrics: ['総投矢数', '対象別マーク', 'キャッチ', '平均マーク', '0マークラウンド'],
      commonMistakes: [
        '狙い以外の有効ナンバーをMISSとして捨てる',
        'BULLの本数ルールとマークルールを混同する',
      ],
      cautions: [
        'キャッチは断定評価ではなく着弾事実として記録する',
        '次の推奨狙いを確認してから投げる',
      ],
    };
  }

  if (input.category === 'form') {
    return {
      ...common,
      inputGuide: '得点より本人評価と動画記録を優先します。意識項目は最大2つまでにします。',
      recordedMetrics: ['セット別本人評価', '意識項目', '感覚メモ', '動画記録の有無'],
      commonMistakes: ['一度に多くの課題を意識する', '力みの有無を後から思い出そうとする'],
    };
  }

  return common;
}

export function formatTargets(targets: (number | 'BULL' | string)[]) {
  return targets.length > 0 ? targets.map(String).join('、') : '指定した対象';
}

function toShortPreset(drillId: string) {
  const drill = BUILTIN_DRILL_DEFINITIONS.find((candidate) => candidate.id === drillId);
  if (!drill) {
    throw new Error(`Unknown drill: ${drillId}`);
  }
  if (drillId === 'bull_30') {
    return {
      ...drill,
      id: 'preset_bull_12',
      name: 'BULL 12投',
      totalThrows: 12,
      estimatedMinutes: 3,
    };
  }
  if (drillId === 'cricket_number_15') {
    return {
      ...drill,
      id: 'preset_focus_3',
      name: '重点ナンバー3投',
      totalThrows: 3,
      estimatedMinutes: 1,
    };
  }
  if (drillId === 'warmup_wide_single') {
    return {
      ...drill,
      id: 'preset_warmup_9',
      name: 'ウォームアップ9投',
      totalThrows: 9,
      estimatedMinutes: 3,
    };
  }
  return drill;
}

function longestStreak(values: boolean[]) {
  let longest = 0;
  let current = 0;
  for (const value of values) {
    if (value) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

export function clampBullRound(innerBull: number, outerBull: number) {
  const inner = Math.max(0, Math.min(3, Math.trunc(innerBull) || 0));
  const outer = Math.max(0, Math.min(3 - inner, Math.trunc(outerBull) || 0));
  return {
    innerBull: inner,
    outerBull: outer,
    miss: 3 - inner - outer,
    bullCount: inner + outer,
  };
}

export function createBullRoundThrows(input: {
  roundNumber: number;
  overallThrowStart: number;
  innerBull: number;
  outerBull: number;
  inputMethod?: DrillThrowResultInput['inputMethod'];
}): DrillThrowResultInput[] {
  const round = clampBullRound(input.innerBull, input.outerBull);
  const resultTypes = [
    ...Array.from({ length: round.innerBull }, () => 'INNER_BULL'),
    ...Array.from({ length: round.outerBull }, () => 'OUTER_BULL'),
    ...Array.from({ length: round.miss }, () => 'MISS'),
  ];
  return resultTypes.map((resultType, index) => {
    const isInnerBull = resultType === 'INNER_BULL';
    const isOuterBull = resultType === 'OUTER_BULL';
    return {
      roundNumber: input.roundNumber,
      throwNumber: index + 1,
      overallThrowNumber: input.overallThrowStart + index + 1,
      resultType,
      intendedTarget: 'BULL',
      targetNumber: 'BULL',
      actualNumber: isInnerBull || isOuterBull ? 'BULL' : null,
      segment: resultType,
      multiplier: isInnerBull ? 2 : isOuterBull ? 1 : 0,
      score: isInnerBull ? 50 : isOuterBull ? 25 : 0,
      markCount: isInnerBull || isOuterBull ? 1 : 0,
      isHit: isInnerBull || isOuterBull,
      isInnerBull,
      isOuterBull,
      targetHit: isInnerBull || isOuterBull,
      catchHit: false,
      inputMethod: input.inputMethod ?? 'round_count',
    };
  });
}

export function createCricketRoundThrows(input: {
  roundNumber: number;
  overallThrowStart: number;
  intendedTarget: number | 'BULL';
  targetHits: { single: number; double: number; triple: number };
  catches?: { actualNumber: number | 'BULL' | string; multiplier: number; count: number }[];
  validTargets: (number | 'BULL' | string)[];
  inputMethod?: DrillThrowResultInput['inputMethod'];
}): DrillThrowResultInput[] {
  const validTargetSet = new Set(input.validTargets.map(String));
  const throws: DrillThrowResultInput[] = [];
  const add = (
    actualNumber: number | 'BULL' | string | null,
    multiplier: number,
    count: number,
  ) => {
    for (let index = 0; index < count && throws.length < 3; index += 1) {
      const actual = actualNumber ? String(actualNumber) : null;
      const target = String(input.intendedTarget);
      const isBullTarget = actual === 'BULL';
      const markCount =
        actual && validTargetSet.has(actual)
          ? actual === 'BULL'
            ? multiplier === 2
              ? 2
              : multiplier === 1
                ? 1
                : 0
            : Math.max(0, Math.min(3, multiplier))
          : 0;
      const targetHit = actual === target && markCount > 0;
      const catchHit = Boolean(actual && actual !== target && validTargetSet.has(actual));
      throws.push({
        roundNumber: input.roundNumber,
        throwNumber: throws.length + 1,
        overallThrowNumber: input.overallThrowStart + throws.length + 1,
        resultType: targetHit ? 'TARGET_MARK' : catchHit ? 'CATCH_MARK' : 'MISS',
        intendedTarget: input.intendedTarget,
        targetNumber: input.intendedTarget,
        actualNumber,
        segment: actual ? `${multiplierLabel(multiplier)}${actual}` : 'MISS',
        multiplier,
        score: actual === 'BULL' ? (multiplier === 2 ? 50 : 25) : Number(actual) * multiplier || 0,
        markCount,
        isHit: markCount > 0,
        isInnerBull: isBullTarget && multiplier === 2,
        isOuterBull: isBullTarget && multiplier === 1,
        targetHit,
        catchHit,
        inputMethod: input.inputMethod ?? 'round_count',
      });
    }
  };
  add(input.intendedTarget, 1, input.targetHits.single);
  add(input.intendedTarget, 2, input.targetHits.double);
  add(input.intendedTarget, 3, input.targetHits.triple);
  for (const catchInput of input.catches ?? []) {
    add(catchInput.actualNumber, catchInput.multiplier, catchInput.count);
  }
  add(null, 0, 3 - throws.length);
  return throws;
}

function multiplierLabel(multiplier: number) {
  if (multiplier === 3) {
    return 'T';
  }
  if (multiplier === 2) {
    return 'D';
  }
  if (multiplier === 1) {
    return 'S';
  }
  return '';
}

export function summarizeDrillThrows(throws: DrillThrowResultInput[]): DrillThrowSummary {
  const sorted = [...throws].sort((a, b) => a.overallThrowNumber - b.overallThrowNumber);
  const bullByThrow = sorted.map(
    (throwResult) => throwResult.isInnerBull || throwResult.isOuterBull,
  );
  const rounds = new Map<number, DrillThrowResultInput[]>();
  const targetProgress: Record<string, number> = {};
  for (const throwResult of sorted) {
    const round = rounds.get(throwResult.roundNumber) ?? [];
    round.push(throwResult);
    rounds.set(throwResult.roundNumber, round);
    const key = String(throwResult.actualNumber ?? throwResult.targetNumber ?? 'その他');
    if (throwResult.markCount > 0) {
      targetProgress[key] = (targetProgress[key] ?? 0) + throwResult.markCount;
    }
  }
  const totalThrows = sorted.length;
  const innerBull = sorted.filter((throwResult) => throwResult.isInnerBull).length;
  const outerBull = sorted.filter((throwResult) => throwResult.isOuterBull).length;
  const bullCount = innerBull + outerBull;
  const firstHalf = sorted.slice(0, Math.floor(totalThrows / 2));
  const secondHalf = sorted.slice(Math.floor(totalThrows / 2));
  const bullRateFor = (items: DrillThrowResultInput[]) =>
    items.length
      ? items.filter((throwResult) => throwResult.isInnerBull || throwResult.isOuterBull).length /
        items.length
      : null;
  const firstHalfBullRate = bullRateFor(firstHalf);
  const secondHalfBullRate = bullRateFor(secondHalf);
  return {
    totalThrows,
    hitCount: sorted.filter((throwResult) => throwResult.isHit).length,
    markCount: sorted.reduce((sum, throwResult) => sum + throwResult.markCount, 0),
    innerBull,
    outerBull,
    bullCount,
    bullRate: totalThrows ? bullCount / totalThrows : 0,
    innerRate: totalThrows ? innerBull / totalThrows : 0,
    singleCount: sorted.filter((throwResult) => throwResult.multiplier === 1 && throwResult.isHit)
      .length,
    doubleCount: sorted.filter((throwResult) => throwResult.multiplier === 2 && throwResult.isHit)
      .length,
    tripleCount: sorted.filter((throwResult) => throwResult.multiplier === 3 && throwResult.isHit)
      .length,
    longestBullStreak: longestStreak(bullByThrow),
    longestNoBullStreak: longestStreak(bullByThrow.map((value) => !value)),
    allBullRounds: [...rounds.values()].filter(
      (round) =>
        round.length === 3 &&
        round.every((throwResult) => throwResult.isInnerBull || throwResult.isOuterBull),
    ).length,
    allInnerRounds: [...rounds.values()].filter(
      (round) => round.length === 3 && round.every((throwResult) => throwResult.isInnerBull),
    ).length,
    zeroMarkRounds: [...rounds.values()].filter(
      (round) => round.reduce((sum, throwResult) => sum + throwResult.markCount, 0) === 0,
    ).length,
    tenThrowBullCounts: bucketBullCounts(sorted, 10),
    twentyFiveThrowBullCounts: bucketBullCounts(sorted, 25),
    firstHalfBullRate,
    secondHalfBullRate,
    fatigueDropCandidate:
      firstHalfBullRate !== null && secondHalfBullRate !== null
        ? secondHalfBullRate < firstHalfBullRate
        : false,
    targetProgress,
  };
}

function bucketBullCounts(throws: DrillThrowResultInput[], bucketSize: number) {
  const buckets: number[] = [];
  throws.forEach((throwResult, index) => {
    const bucketIndex = Math.floor(index / bucketSize);
    buckets[bucketIndex] = buckets[bucketIndex] ?? 0;
    if (throwResult.isInnerBull || throwResult.isOuterBull) {
      buckets[bucketIndex] += 1;
    }
  });
  return buckets;
}

export function isDrillCompletionReached(
  definition: Pick<
    DrillDefinition,
    'completionRule' | 'targetSuccessCount' | 'totalThrows' | 'targetNumbers'
  >,
  summary: DrillThrowSummary,
) {
  if (definition.completionRule === 'fixed_throws') {
    return summary.totalThrows >= definition.totalThrows;
  }
  if (definition.completionRule === 'bull_count') {
    return summary.bullCount >= (definition.targetSuccessCount ?? 0);
  }
  if (definition.completionRule === 'mark_count') {
    return (
      Math.max(...Object.values(summary.targetProgress), 0) >= (definition.targetSuccessCount ?? 0)
    );
  }
  if (definition.completionRule === 'all_targets_mark_count') {
    return definition.targetNumbers.every(
      (target) =>
        (summary.targetProgress[String(target)] ?? 0) >= (definition.targetSuccessCount ?? 0),
    );
  }
  return false;
}

function countStreak(history: { date: string; achieved: boolean }[]) {
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const entry of sorted) {
    if (!entry.achieved) {
      break;
    }
    streak += 1;
  }
  return streak;
}
