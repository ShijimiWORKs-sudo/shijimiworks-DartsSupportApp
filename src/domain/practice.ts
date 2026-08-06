import type { PracticeMenu, PracticeMenuInput, PracticeProgress } from './types';

const MAX_ROUNDS = 120;
const MAX_THROWS_PER_ROUND = 12;
const MAX_SETS = 50;
const MAX_MINUTES = 600;
const MAX_REST_SECONDS = 3600;

export type ValidationResult = { ok: true; value: PracticeMenu } | { ok: false; errors: string[] };

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalInt(
  value: string | number | undefined,
  label: string,
  max: number,
  errors: string[],
): number | null {
  if (value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) {
    errors.push(`${label}は整数で入力してください。`);
    return null;
  }
  if (parsed < 0) {
    errors.push(`${label}にマイナス値は保存できません。`);
    return null;
  }
  if (parsed > max) {
    errors.push(`${label}が大きすぎます。`);
    return null;
  }
  return parsed;
}

export function validatePracticeMenuInput(input: PracticeMenuInput): ValidationResult {
  const errors: string[] = [];
  const title = input.title.trim();

  if (title.length === 0) {
    errors.push('メニュー名を入力してください。');
  }

  const rounds = parseOptionalInt(input.rounds, 'ラウンド数', MAX_ROUNDS, errors);
  const throwsPerRound = parseOptionalInt(
    input.throwsPerRound,
    '1ラウンドの投数',
    MAX_THROWS_PER_ROUND,
    errors,
  );
  const sets = parseOptionalInt(input.sets, 'セット数', MAX_SETS, errors);
  const plannedMinutes = parseOptionalInt(input.plannedMinutes, '予定時間', MAX_MINUTES, errors);
  const restSeconds = parseOptionalInt(input.restSeconds, '休憩時間', MAX_REST_SECONDS, errors);
  const sortOrder = parseOptionalInt(input.sortOrder, '並び順', 10000, errors) ?? 0;

  if (!['once', 'daily', 'weekly'].includes(input.repeatType)) {
    errors.push('繰り返し種別が不正です。');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title,
      purpose: normalizeOptionalText(input.purpose),
      targetArea: normalizeOptionalText(input.targetArea),
      rounds,
      throwsPerRound,
      sets,
      targetValue: normalizeOptionalText(input.targetValue),
      plannedMinutes,
      restSeconds,
      focusNote: normalizeOptionalText(input.focusNote),
      memo: normalizeOptionalText(input.memo),
      sortOrder,
      isFavorite: Boolean(input.isFavorite),
      plannedDate: input.plannedDate,
      repeatType: input.repeatType,
      repeatWeekdays: normalizeOptionalText(input.repeatWeekdays),
      isAiSuggested: Boolean(input.isAiSuggested),
      sourceAssessmentId: input.sourceAssessmentId ?? null,
      drillDefinitionId: input.drillDefinitionId ?? null,
      drillType: input.drillType ?? null,
      inputMode: input.inputMode ?? null,
      targetType: input.targetType ?? null,
      targetNumbers: input.targetNumbers ?? null,
      totalThrows: input.totalThrows ?? null,
      targetSuccessCount: input.targetSuccessCount ?? null,
      scoringMode: input.scoringMode ?? null,
      markMode: input.markMode ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
    },
  };
}

export function createInitialProgress(): PracticeProgress {
  return {
    currentSet: 1,
    currentRound: 1,
    currentThrow: 0,
    elapsedSeconds: 0,
    status: 'planned',
    undoSnapshot: null,
  };
}

export function advanceThrow(
  progress: PracticeProgress,
  throwsPerRound: number | null,
  rounds: number | null,
  sets: number | null,
): PracticeProgress {
  const previous = { ...progress, undoSnapshot: null };
  const maxThrows = Math.max(throwsPerRound ?? 3, 1);
  const maxRounds = Math.max(rounds ?? progress.currentRound, 1);
  const maxSets = Math.max(sets ?? progress.currentSet, 1);

  let currentThrow = progress.currentThrow + 1;
  let currentRound = progress.currentRound;
  let currentSet = progress.currentSet;

  if (currentThrow > maxThrows) {
    currentThrow = 1;
    currentRound += 1;
  }
  if (currentRound > maxRounds) {
    currentRound = 1;
    currentSet += 1;
  }

  const isComplete = currentSet > maxSets;
  return {
    currentSet: isComplete ? maxSets : currentSet,
    currentRound: isComplete ? maxRounds : currentRound,
    currentThrow: isComplete ? maxThrows : currentThrow,
    elapsedSeconds: progress.elapsedSeconds,
    status: isComplete ? 'completed' : 'in_progress',
    undoSnapshot: previous,
  };
}

export function markRoundComplete(
  progress: PracticeProgress,
  rounds: number | null,
): PracticeProgress {
  const previous = { ...progress, undoSnapshot: null };
  const maxRounds = Math.max(rounds ?? progress.currentRound, 1);
  return {
    ...progress,
    currentRound: Math.min(progress.currentRound + 1, maxRounds),
    currentThrow: 0,
    status: 'in_progress',
    undoSnapshot: previous,
  };
}

export function markSetComplete(progress: PracticeProgress, sets: number | null): PracticeProgress {
  const previous = { ...progress, undoSnapshot: null };
  const maxSets = Math.max(sets ?? progress.currentSet, 1);
  return {
    ...progress,
    currentSet: Math.min(progress.currentSet + 1, maxSets),
    currentRound: 1,
    currentThrow: 0,
    status: 'in_progress',
    undoSnapshot: previous,
  };
}

export function undoProgress(progress: PracticeProgress): PracticeProgress {
  return progress.undoSnapshot ? { ...progress.undoSnapshot, undoSnapshot: null } : progress;
}

export function summarizeTodayProgress(
  items: { status: string; elapsed_seconds?: number | null }[],
) {
  const total = items.length;
  const completed = items.filter((item) => item.status === 'completed').length;
  const elapsedSeconds = items.reduce((sum, item) => sum + (item.elapsed_seconds ?? 0), 0);
  return {
    total,
    completed,
    completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
    elapsedSeconds,
    remaining: Math.max(total - completed, 0),
  };
}
