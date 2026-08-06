import type { PracticeMenu } from './types';

export const PLAYER_LEVELS = ['C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'SA'] as const;

export type PlayerLevel = (typeof PLAYER_LEVELS)[number];
export type TrainingGameType =
  | 'COUNT_UP'
  | 'CRICKET_COUNT_UP'
  | 'SHOOT_OUT'
  | 'EAGLES_EYE'
  | 'FINISH_TRAINER'
  | 'DARTS_LEVEL_CHECK';
export type BullMode = 'fat_bull' | 'separate_bull';
export type InputMethod = 'photo_auto' | 'photo_adjusted' | 'photo_manual' | 'manual_score';
export type FinishOutMode = 'single' | 'master' | 'double';

export type ThrowPosition = {
  x: number;
  y: number;
  radius: number;
  angle: number;
  segment: number | 'BULL' | 'OUT';
  multiplier: 0 | 1 | 2 | 3;
  score: number;
  confidence: number;
  inputMethod: InputMethod;
};

export type TrainingThrowInput = {
  roundNumber: number;
  throwNumber: number;
  targetNumber?: number | 'BULL' | null;
  segment?: number | 'BULL' | 'OUT' | null;
  multiplier?: 0 | 1 | 2 | 3;
  score: number;
  x?: number | null;
  y?: number | null;
  radius?: number | null;
  angle?: number | null;
  confidence?: number;
  inputMethod: InputMethod;
  isManualOverride?: boolean;
};

export type TrainingGameDefinition = {
  type: TrainingGameType;
  title: string;
  rounds: number;
  throwsPerRound: number;
  description: string;
};

export type LevelProfile = {
  currentLevel: PlayerLevel;
  provisionalLevel: PlayerLevel | null;
  promotionReady: boolean;
  promotionTestCount: number;
  promotionTestPassCount: number;
  levelConfidence: number;
  totalPracticeCount: number;
};

export const BOARD_SEGMENTS = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
] as const;

export const TRAINING_GAMES: TrainingGameDefinition[] = [
  {
    type: 'COUNT_UP',
    title: 'COUNT-UP',
    rounds: 8,
    throwsPerRound: 3,
    description: '8ラウンド24投の合計点を記録します。',
  },
  {
    type: 'CRICKET_COUNT_UP',
    title: 'CRICKET COUNT-UP',
    rounds: 7,
    throwsPerRound: 3,
    description: '20から15とBULLを各3投し、マーク数を記録します。',
  },
  {
    type: 'SHOOT_OUT',
    title: 'SHOOT OUT',
    rounds: 21,
    throwsPerRound: 3,
    description: '1から20、最後にBULLを3投以内で狙います。',
  },
  {
    type: 'EAGLES_EYE',
    title: "EAGLE'S EYE",
    rounds: 8,
    throwsPerRound: 3,
    description: 'BULLだけを得点化し、中心距離とまとまりも確認します。',
  },
  {
    type: 'FINISH_TRAINER',
    title: 'FINISH TRAINER',
    rounds: 5,
    throwsPerRound: 3,
    description: '2から60を3投以内で上がる練習です。',
  },
  {
    type: 'DARTS_LEVEL_CHECK',
    title: 'DARTS LEVEL CHECK',
    rounds: 6,
    throwsPerRound: 3,
    description: 'DartsSupportApp独自基準で総合レベルを確認します。',
  },
];

export function initialLevelProfile(): LevelProfile {
  return {
    currentLevel: 'C',
    provisionalLevel: null,
    promotionReady: false,
    promotionTestCount: 0,
    promotionTestPassCount: 0,
    levelConfidence: 0,
    totalPracticeCount: 0,
  };
}

export function nextLevel(level: PlayerLevel): PlayerLevel | null {
  const index = PLAYER_LEVELS.indexOf(level);
  return PLAYER_LEVELS[index + 1] ?? null;
}

export function evaluatePromotion(profile: LevelProfile, latestPassed: boolean): LevelProfile {
  const promotionTestCount = profile.promotionTestCount + 1;
  const promotionTestPassCount = profile.promotionTestPassCount + (latestPassed ? 1 : 0);
  const promotionReady = promotionTestCount >= 3 && promotionTestPassCount >= 2;
  return {
    ...profile,
    provisionalLevel: promotionReady ? nextLevel(profile.currentLevel) : profile.provisionalLevel,
    promotionReady,
    promotionTestCount,
    promotionTestPassCount,
  };
}

export function confirmPromotion(profile: LevelProfile): LevelProfile {
  if (!profile.promotionReady || !profile.provisionalLevel) {
    return profile;
  }
  return {
    ...profile,
    currentLevel: profile.provisionalLevel,
    provisionalLevel: null,
    promotionReady: false,
    promotionTestCount: 0,
    promotionTestPassCount: 0,
  };
}

export function assessDemotionCandidate(profile: LevelProfile, recentPassRate: number) {
  return {
    demotionCandidate: recentPassRate < 0.25 && PLAYER_LEVELS.indexOf(profile.currentLevel) > 0,
    autoDemoted: false,
  };
}

export function recommendMenusForLevel(level: PlayerLevel, plannedDate: string): PracticeMenu[] {
  const presets: Record<PlayerLevel, string[]> = {
    C: ['BULLに近づける 24投', '大きいシングル 20分'],
    CC: ['BULL 30投', '1-10 シングル確認'],
    CCC: ['COUNT-UP 1回', '20/19/18 シングル練習'],
    B: ['COUNT-UP 2回', 'CRICKET 20-15 各3投'],
    BB: ['BULL 50投', 'SHOOT OUT 1-20'],
    BBB: ['EAGLE’S EYE 24投', 'FINISH 2-40'],
    A: ['CRICKET COUNT-UP', 'FINISH 41-60'],
    AA: ['20ナンバー集中 45投', 'DARTS LEVEL CHECK'],
    AAA: ['高負荷 COUNT-UP 3回', 'FINISH 5問 精度重視'],
    SA: ['維持チェック一式', '弱点番号の重点補正'],
  };
  return presets[level].map((title, index) => ({
    title,
    purpose: `${level}向けレベル別おすすめ`,
    targetArea: title.includes('BULL') ? 'BULL' : null,
    rounds: title.includes('COUNT-UP') || title.includes('EYE') ? 8 : null,
    throwsPerRound: 3,
    sets: 1,
    targetValue: null,
    plannedMinutes: 20,
    restSeconds: 60,
    focusNote: 'ユーザー確認後に今日または明日へ追加してください。',
    memo: 'DartsSupportAppレベル別おすすめから生成',
    sortOrder: 700 + index,
    isFavorite: false,
    plannedDate,
    repeatType: 'once',
    repeatWeekdays: null,
    isAiSuggested: false,
    sourceAssessmentId: null,
  }));
}

export function segmentFromAngle(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  const index = Math.floor(((normalized + 9) % 360) / 18);
  return BOARD_SEGMENTS[index] ?? 20;
}

export function scoreNormalizedPoint(
  x: number,
  y: number,
  inputMethod: InputMethod,
  confidence = 1,
): ThrowPosition {
  const radius = Math.sqrt(x * x + y * y);
  const angle = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  if (radius <= 0.06) {
    return {
      x,
      y,
      radius,
      angle,
      segment: 'BULL',
      multiplier: 2,
      score: 50,
      confidence,
      inputMethod,
    };
  }
  if (radius <= 0.14) {
    return {
      x,
      y,
      radius,
      angle,
      segment: 'BULL',
      multiplier: 1,
      score: 25,
      confidence,
      inputMethod,
    };
  }
  if (radius > 1) {
    return {
      x,
      y,
      radius,
      angle,
      segment: 'OUT',
      multiplier: 0,
      score: 0,
      confidence,
      inputMethod,
    };
  }
  const segment = segmentFromAngle(angle);
  const multiplier = radius >= 0.94 ? 2 : radius >= 0.55 && radius <= 0.62 ? 3 : 1;
  return {
    x,
    y,
    radius,
    angle,
    segment,
    multiplier,
    score: segment * multiplier,
    confidence,
    inputMethod,
  };
}

export function normalizeFromCalibration(
  point: { x: number; y: number },
  calibration: { centerX: number; centerY: number; outerRadius: number; rotationDegrees: number },
) {
  const dx = (point.x - calibration.centerX) / calibration.outerRadius;
  const dy = (point.y - calibration.centerY) / calibration.outerRadius;
  const radians = (-calibration.rotationDegrees * Math.PI) / 180;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

export function calculateCricketMark(multiplier: number, segment: number | 'BULL' | 'OUT') {
  if (segment === 'BULL') {
    return multiplier === 2 ? 2 : multiplier === 1 ? 1 : 0;
  }
  if (segment === 'OUT') {
    return 0;
  }
  return [15, 16, 17, 18, 19, 20].includes(segment) ? Math.min(multiplier, 3) : 0;
}

export function summarizeTrainingGame(gameType: TrainingGameType, throws: TrainingThrowInput[]) {
  const scores = throws.map((dart) => dart.score);
  const rounds = new Map<number, TrainingThrowInput[]>();
  for (const dart of throws) {
    rounds.set(dart.roundNumber, [...(rounds.get(dart.roundNumber) ?? []), dart]);
  }
  const roundScores = [...rounds.values()].map((round) =>
    round.reduce((sum, dart) => sum + dart.score, 0),
  );
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const bullCount = throws.filter((dart) => dart.segment === 'BULL').length;
  const doubleCount = throws.filter((dart) => dart.multiplier === 2).length;
  const tripleCount = throws.filter((dart) => dart.multiplier === 3).length;
  const missCount = throws.filter((dart) => dart.score === 0).length;
  const totalMarks = throws.reduce(
    (sum, dart) => sum + calculateCricketMark(dart.multiplier ?? 0, dart.segment ?? 'OUT'),
    0,
  );
  const innerBullCount = throws.filter(
    (dart) => dart.segment === 'BULL' && dart.multiplier === 2,
  ).length;
  const outerBullCount = throws.filter(
    (dart) => dart.segment === 'BULL' && dart.multiplier === 1,
  ).length;
  return {
    gameType,
    totalScore,
    roundAverage: roundScores.length ? totalScore / roundScores.length : 0,
    throwAverage: throws.length ? totalScore / throws.length : 0,
    highestRound: roundScores.length ? Math.max(...roundScores) : 0,
    lowestRound: roundScores.length ? Math.min(...roundScores) : 0,
    bullCount,
    doubleCount,
    tripleCount,
    missCount,
    totalMarks,
    zeroMarkRounds: [...rounds.values()].filter(
      (round) =>
        round.reduce(
          (sum, dart) => sum + calculateCricketMark(dart.multiplier ?? 0, dart.segment ?? 'OUT'),
          0,
        ) === 0,
    ).length,
    successCount: throws.filter((dart) => dart.score > 0).length,
    totalThrows: throws.length,
    longestSuccessStreak: longestSuccessStreak(throws),
    innerBullCount,
    outerBullCount,
    bullRate: throws.length ? bullCount / throws.length : 0,
    averageCenterDistance: throws.length
      ? throws.reduce((sum, dart) => sum + (dart.radius ?? 1), 0) / throws.length
      : 0,
  };
}

export function isFinishSuccess(startScore: number, throws: number[], mode: FinishOutMode) {
  const remaining = throws.reduce((score, value) => score - value, startScore);
  if (remaining !== 0) {
    return false;
  }
  if (mode === 'single') {
    return true;
  }
  return mode === 'master';
}

export function calculateLevelCheckScore(parts: {
  countUp: number;
  bull: number;
  twenty: number;
  cricket: number;
  finish: number;
  stability: number;
}) {
  return (
    parts.countUp * 0.25 +
    parts.bull * 0.2 +
    parts.twenty * 0.15 +
    parts.cricket * 0.2 +
    parts.finish * 0.1 +
    parts.stability * 0.1
  );
}

export function proposeLevelFromScore(score: number): PlayerLevel {
  const index = Math.min(PLAYER_LEVELS.length - 1, Math.max(0, Math.floor(score / 10)));
  return PLAYER_LEVELS[index] ?? 'C';
}

export function createPhotoCandidates(points: { x: number; y: number }[]): ThrowPosition[] {
  return points
    .slice(0, 3)
    .map((point) => scoreNormalizedPoint(point.x, point.y, 'photo_auto', 0.55));
}

export function confirmThreeThrows(candidates: ThrowPosition[]) {
  return candidates.slice(0, 3).map((candidate, index) => ({
    ...candidate,
    inputMethod: candidate.inputMethod === 'photo_auto' ? 'photo_adjusted' : candidate.inputMethod,
    throwNumber: index + 1,
  }));
}

function longestSuccessStreak(throws: TrainingThrowInput[]) {
  let longest = 0;
  let current = 0;
  for (const dart of throws) {
    if (dart.score > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}
