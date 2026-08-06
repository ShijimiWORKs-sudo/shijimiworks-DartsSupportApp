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
  | 'bull_30'
  | 'bull_50'
  | 'bull_100'
  | 'bull_grouping'
  | 'first_dart_bull'
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
  canUsePhoto: boolean;
  canUseVideo: boolean;
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
    'bull_30',
    'bull_30',
    'bull',
    'BULL 30',
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
    'BULL 50',
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
    'BULL 100',
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
  C: ['warmup_wide_single', 'bull_30', 'wide_single_round', 'daily_finish_three'],
  CC: ['warmup_wide_single', 'bull_30', 'cricket_number_15', 'daily_finish_three'],
  CCC: ['bull_30', 'cricket_number_15', 'cricket_full_round', 'daily_finish_three'],
  B: [
    'bull_50',
    'weak_cricket_number',
    'cricket_full_round',
    'common_doubles',
    'daily_finish_three',
  ],
  BB: ['bull_50', 't20_t19_focus', 'weak_cricket_number', 'common_doubles', 'no_score_form'],
  BBB: ['bull_50', 'bull_grouping', 'random_cricket', 't20_t19_focus', 'common_doubles'],
  A: ['bull_100', 't20_t19_focus', 'cricket_full_round', 'double_round', 'last_dart_pressure'],
  AA: ['bull_100', 'weak_cricket_number', 'random_cricket', 'common_doubles', 'no_score_form'],
  AAA: ['bull_100', 't20_t19_focus', 'random_cricket', 'double_round', 'streak_challenge'],
  SA: ['bull_100', 'weak_cricket_number', 'random_cricket', 'double_round', 'reset_on_miss'],
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
    return ['bull_30', 'cricket_number_15', 'daily_finish_three'].map(toShortPreset);
  }
  if (minutes <= 10) {
    return ['warmup_wide_single', 'bull_30', 'cricket_number_15'].map(toShortPreset);
  }
  if (minutes <= 15) {
    return ['warmup_wide_single', 'bull_30', 'cricket_number_15', 'daily_finish_three'].map(
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
): DrillDefinition {
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
    canUsePhoto,
    canUseVideo,
  };
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
