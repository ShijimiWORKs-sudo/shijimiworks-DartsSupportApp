import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import {
  deriveNextFocusItems,
  derivePracticeRecommendations,
  hashAssessmentRawText,
  parseChatGptAssessment,
} from '../domain/assessment';
import type {
  AssessmentSections,
  ImprovementIssueStatus,
  NextFocusStatus,
  PracticeItemStatus,
  PracticeMenu,
  PracticeProgress,
  RecommendationStatus,
  VideoDirection,
} from '../domain/types';
import {
  TRAINING_GAMES,
  calculateLevelCheckScore,
  confirmPromotion,
  evaluatePromotion,
  proposeLevelFromScore,
  recommendMenusForLevel,
  summarizeTrainingGame,
  type BullMode,
  type FinishOutMode,
  type PlayerLevel,
  type ThrowPosition,
  type TrainingGameType,
  type TrainingThrowInput,
} from '../domain/training';
import {
  dailyMinimumForLevel,
  findWeakCricketTarget,
  generateTimePreset,
  isDrillCompletionReached,
  summarizeDailyMinimum,
  summarizeDrillResult,
  summarizeDrillThrows,
  type DrillCategory,
  type DrillResultInput,
  type DrillThrowResultInput,
  type DrillType,
  type TimePreset,
} from '../domain/drills';

export const DEFAULT_ACCOUNT_ID = 'local-account';
export const DEFAULT_PLAYER_ID = 'owner-player';

export type DailyPracticeItemRow = PracticeMenu & {
  id: string;
  plan_id: string;
  template_id: string | null;
  status: PracticeItemStatus;
  started_at: string | null;
  completed_at: string | null;
  elapsed_seconds?: number | null;
};

export type PracticeSessionRow = {
  id: string;
  daily_item_id: string | null;
  title_snapshot: string;
  status: PracticeItemStatus;
  current_set: number;
  current_round: number;
  current_throw: number;
  elapsed_seconds: number;
  undo_snapshot_json: string | null;
  started_at: string;
  paused_at: string | null;
  completed_at: string | null;
};

export type FormVideoRow = {
  id: string;
  practice_session_id: string | null;
  direction: VideoDirection;
  uri: string;
  captured_at: string;
  duration_ms: number | null;
  file_size_bytes: number | null;
  handedness: string | null;
  dart_weight_grams: number | null;
  memo: string | null;
  is_missing_file: number;
  created_at: string;
};

export type AssessmentRow = {
  id: string;
  practice_session_id: string | null;
  form_video_id: string | null;
  raw_text: string;
  raw_hash: string;
  parsed_json: string;
  parse_status: string;
  recognized_heading_count: number;
  compared_to_assessment_id: string | null;
  user_note: string | null;
  created_at: string;
};

export type ImprovementIssueRow = {
  id: string;
  title: string;
  detail: string | null;
  target_part: string | null;
  status: ImprovementIssueStatus;
  priority: number;
  first_found_date: string;
  last_checked_date: string;
  resolved_date: string | null;
  source_assessment_id: string | null;
  user_note: string | null;
  next_check_note: string | null;
};

export type NextFocusRow = {
  id: string;
  assessment_id: string | null;
  issue_id: string | null;
  title: string;
  priority: number;
  status: NextFocusStatus;
  created_at: string;
};

export type RecommendationRow = {
  id: string;
  assessment_id: string | null;
  title: string;
  detail: string | null;
  status: RecommendationStatus;
  source_text: string | null;
};

export type PracticeResultInput = {
  practiceSessionId: string;
  actualMinutes?: number | null;
  actualRounds?: number | null;
  actualSets?: number | null;
  totalThrows?: number | null;
  bullCount?: number | null;
  optionalScore?: string | null;
  achievementLevel?: string | null;
  conditionLabel?: string | null;
  bodyFeel?: string | null;
  goodPoints?: string | null;
  concernPoints?: string | null;
  nextFocusNote?: string | null;
  memo?: string | null;
};

export type SaveVideoInput = {
  practiceSessionId?: string | null;
  direction: VideoDirection;
  uri: string;
  durationMs?: number | null;
  fileSizeBytes?: number | null;
  handedness?: string | null;
  dartWeightGrams?: number | null;
  memo?: string | null;
};

export type SkillProfileRow = {
  id: string;
  current_level: PlayerLevel;
  provisional_level: PlayerLevel | null;
  level_started_at: string;
  promotion_ready: number;
  promotion_test_count: number;
  promotion_test_pass_count: number;
  last_level_check_at: string | null;
  level_confidence: number;
  total_practice_count: number;
};

export type LevelHistoryRow = {
  id: string;
  previous_level: PlayerLevel;
  next_level: PlayerLevel;
  reason: string;
  judgement_json: string;
  user_confirmed: number;
  created_at: string;
};

export type TrainingGameSessionRow = {
  id: string;
  practice_session_id: string | null;
  daily_item_id: string | null;
  game_type: TrainingGameType;
  title: string;
  status: string;
  current_round: number;
  current_throw: number;
  bull_mode: BullMode | null;
  out_mode: FinishOutMode | null;
  target_json: string | null;
  summary_json: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

export type TrainingThrowRow = {
  id: string;
  game_session_id: string;
  round_number: number;
  throw_number: number;
  target_number: string | null;
  segment: string | null;
  multiplier: number;
  score: number;
  normalized_x: number | null;
  normalized_y: number | null;
  radius: number | null;
  angle: number | null;
  confidence: number;
  input_method: string;
  is_manual_override: number;
  created_at: string;
};

export type ThrowPhotoSessionRow = {
  id: string;
  game_session_id: string | null;
  practice_session_id: string | null;
  round_number: number;
  original_photo_uri: string;
  corrected_photo_uri: string | null;
  calibration_json: string | null;
  auto_candidates_json: string | null;
  confirmed_positions_json: string | null;
  confidence: number;
  has_manual_adjustment: number;
  status: string;
  created_at: string;
};

export type StartTrainingGameInput = {
  gameType: TrainingGameType;
  practiceSessionId?: string | null;
  dailyItemId?: string | null;
  bullMode?: BullMode | null;
  outMode?: FinishOutMode | null;
  targetJson?: string | null;
};

export type SavePhotoSessionInput = {
  gameSessionId?: string | null;
  practiceSessionId?: string | null;
  roundNumber: number;
  originalPhotoUri: string;
  correctedPhotoUri?: string | null;
  calibration: unknown;
  autoCandidates: ThrowPosition[];
  confirmedPositions: ThrowPosition[];
  hasManualAdjustment: boolean;
};

export type DrillDefinitionRow = {
  id: string;
  drill_type: DrillType;
  category: DrillCategory;
  name: string;
  purpose: string;
  target_type?: string | null;
  target_numbers: string | null;
  rounds: number | null;
  throws_per_round: number | null;
  total_throws: number;
  success_rule: string | null;
  scoring_mode: string;
  estimated_minutes: number;
  target_level_min: PlayerLevel;
  target_level_max: PlayerLevel;
  is_daily_minimum: number;
  is_builtin: number;
  can_use_photo: number;
  can_use_video: number;
  difficulty: number;
  sort_order: number;
  is_favorite?: number;
  source_reason?: string | null;
  short_description?: string | null;
  preparation_json?: string | null;
  instructions_json?: string | null;
  success_condition?: string | null;
  finish_condition?: string | null;
  input_guide?: string | null;
  recorded_metrics_json?: string | null;
  common_mistakes_json?: string | null;
  cautions_json?: string | null;
  beginner_tips_json?: string | null;
  input_mode?: string | null;
  mark_mode?: string | null;
  target_success_count?: number | null;
  completion_rule?: string | null;
};

export type DailyMinimumPlanRow = {
  id: string;
  practice_date: string;
  level_snapshot: PlayerLevel;
  target_minutes: number;
  status: string;
  total_items: number;
  completed_items: number;
  total_throws: number;
  duration_seconds: number;
};

export type DailyMinimumItemRow = {
  id: string;
  plan_id: string;
  drill_definition_id: string;
  name_snapshot: string;
  target_throws: number;
  estimated_minutes: number;
  status: string;
  actual_throws: number;
  duration_seconds: number;
  sort_order: number;
  source_reason: string | null;
};

export type DrillSessionRow = {
  id: string;
  drill_definition_id: string;
  daily_minimum_item_id: string | null;
  status: string;
  current_round: number;
  current_throw: number;
  elapsed_seconds: number;
  target_number: string | null;
  mode: string | null;
  started_at: string;
  paused_at: string | null;
  completed_at: string | null;
  round_input_mode?: string | null;
  round_status?: string | null;
  intended_target?: string | null;
  round_draft_json?: string | null;
  completion_rule?: string | null;
  completion_target?: number | null;
  finish_at_round_end?: number | null;
};

export type DrillThrowResultRow = {
  id: string;
  drill_session_id: string;
  round_number: number;
  throw_number: number;
  overall_throw_number: number;
  result_type: string;
  intended_target: string | null;
  target_number: string | null;
  actual_number: string | null;
  segment: string | null;
  multiplier: number;
  score: number;
  mark_count: number;
  is_hit: number;
  is_inner_bull: number;
  is_outer_bull: number;
  target_hit: number;
  catch_hit: number;
  input_method: string;
  created_at: string;
};

export type DrillResultRow = {
  id: string;
  drill_session_id: string;
  drill_definition_id: string;
  total_throws: number;
  hit_count: number;
  mark_count: number;
  success_rate: number;
  bull_rate: number;
  round_average: number;
  best_target: string | null;
  weakest_target: string | null;
  summary_json: string;
  created_at: string;
};

export type RecommendedDrillRow = {
  id: string;
  drill_definition_id: string | null;
  practice_date: string;
  source_reason: string;
  priority: number;
  status: string;
  time_preset: string | null;
  name?: string;
};

export type DailyMinimumBundle = {
  plan: DailyMinimumPlanRow;
  items: DailyMinimumItemRow[];
  summary: ReturnType<typeof summarizeDailyMinimum>;
};

export type CreateCustomDrillInput = {
  name: string;
  purpose: string;
  category: DrillCategory;
  targetNumbers?: string;
  rounds?: number | null;
  throwsPerRound?: number | null;
  totalThrows?: number | null;
  successRule?: string | null;
  scoringMode?: string;
  estimatedMinutes?: number | null;
  targetLevelMin?: PlayerLevel;
  targetLevelMax?: PlayerLevel;
  isDailyMinimum?: boolean;
  isFavorite?: boolean;
  canUsePhoto?: boolean;
  canUseVideo?: boolean;
  memo?: string | null;
  instructions?: string | null;
  inputGuide?: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function toDbBool(value: boolean): number {
  return value ? 1 : 0;
}

function fromDbBool(value: number): boolean {
  return value === 1;
}

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function stringifyTarget(value: number | 'BULL' | string | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}

function parseTargetNumbers(value: string | null | undefined): (number | 'BULL' | string)[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

function toDomainDrillThrow(row: DrillThrowResultRow): DrillThrowResultInput {
  return {
    roundNumber: row.round_number,
    throwNumber: row.throw_number,
    overallThrowNumber: row.overall_throw_number,
    resultType: row.result_type,
    intendedTarget: row.intended_target,
    targetNumber: row.target_number,
    actualNumber: row.actual_number,
    segment: row.segment,
    multiplier: row.multiplier,
    score: row.score,
    markCount: row.mark_count,
    isHit: fromDbBool(row.is_hit),
    isInnerBull: fromDbBool(row.is_inner_bull),
    isOuterBull: fromDbBool(row.is_outer_bull),
    targetHit: fromDbBool(row.target_hit),
    catchHit: fromDbBool(row.catch_hit),
    inputMethod: row.input_method as DrillThrowResultInput['inputMethod'],
  };
}

function bestTarget(progress: Record<string, number>): string | null {
  return [...Object.entries(progress)].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function weakestTarget(progress: Record<string, number>): string | null {
  return [...Object.entries(progress)].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
}

function splitInstructionLines(value: string | null | undefined): string[] {
  const lines = (value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : ['3投まとめて実施し、ラウンド結果を入力する'];
}

function itemRow(row: any): DailyPracticeItemRow {
  return {
    id: row.id,
    plan_id: row.plan_id,
    template_id: row.template_id,
    title: row.title,
    purpose: row.purpose,
    targetArea: row.target_area,
    rounds: row.rounds,
    throwsPerRound: row.throws_per_round,
    sets: row.sets,
    targetValue: row.target_value,
    plannedMinutes: row.planned_minutes,
    restSeconds: row.rest_seconds,
    focusNote: row.focus_note,
    memo: row.memo,
    sortOrder: row.sort_order,
    isFavorite: fromDbBool(row.is_favorite),
    plannedDate: row.practice_date ?? '',
    repeatType: 'once',
    repeatWeekdays: null,
    isAiSuggested: fromDbBool(row.is_ai_suggested),
    sourceAssessmentId: row.source_assessment_id,
    drillDefinitionId: row.drill_definition_id ?? null,
    drillType: row.drill_type ?? null,
    inputMode: row.input_mode ?? null,
    targetType: row.target_type ?? null,
    targetNumbers: row.target_numbers ?? null,
    totalThrows: row.total_throws ?? null,
    targetSuccessCount: row.target_success_count ?? null,
    scoringMode: row.scoring_mode ?? null,
    markMode: row.mark_mode ?? null,
    sourceType: row.source_type ?? null,
    sourceId: row.source_id ?? null,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    elapsed_seconds: row.elapsed_seconds,
  };
}

export function createSupportRepository(db: SQLiteDatabase) {
  async function getOrCreatePlan(date: string) {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM daily_practice_plans
       WHERE account_id = ? AND player_id = ? AND practice_date = ? AND deleted_at IS NULL`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      date,
    );
    if (existing) {
      return existing.id;
    }

    const planId = id('plan');
    const timestamp = nowIso();
    await db.runAsync(
      `INSERT INTO daily_practice_plans(
         id, account_id, player_id, practice_date, title, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'planned', ?, ?)`,
      planId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      date,
      `${date} の練習`,
      timestamp,
      timestamp,
    );
    return planId;
  }

  async function listTodayItems(date: string): Promise<DailyPracticeItemRow[]> {
    const planId = await getOrCreatePlan(date);
    const rows = await db.getAllAsync<any>(
      `SELECT dpi.*, dpp.practice_date, ps.elapsed_seconds
       FROM daily_practice_items dpi
       JOIN daily_practice_plans dpp ON dpp.id = dpi.plan_id
       LEFT JOIN practice_sessions ps ON ps.daily_item_id = dpi.id AND ps.deleted_at IS NULL
       WHERE dpi.plan_id = ? AND dpi.deleted_at IS NULL
       ORDER BY dpi.sort_order ASC, dpi.created_at ASC`,
      planId,
    );
    return rows.map(itemRow);
  }

  async function listTemplates(): Promise<DailyPracticeItemRow[]> {
    const rows = await db.getAllAsync<any>(
      `SELECT *, NULL as plan_id, NULL as template_id, 'planned' as status, NULL as started_at,
              NULL as completed_at, NULL as practice_date, NULL as elapsed_seconds
       FROM practice_menu_templates
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY is_favorite DESC, sort_order ASC, updated_at DESC`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    return rows.map(itemRow);
  }

  async function addPracticeMenu(menu: PracticeMenu, saveAsTemplate: boolean): Promise<string> {
    const planId = await getOrCreatePlan(menu.plannedDate);
    const timestamp = nowIso();
    let templateId: string | null = null;

    await db.withTransactionAsync(async () => {
      if (saveAsTemplate) {
        templateId = id('tmpl');
        await db.runAsync(
          `INSERT INTO practice_menu_templates(
            id, account_id, player_id, title, purpose, target_area, rounds, throws_per_round, sets,
            target_value, planned_minutes, rest_seconds, focus_note, memo, sort_order, is_favorite,
            repeat_type, repeat_weekdays, is_ai_suggested, source_assessment_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          templateId,
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          menu.title,
          menu.purpose,
          menu.targetArea,
          menu.rounds,
          menu.throwsPerRound,
          menu.sets,
          menu.targetValue,
          menu.plannedMinutes,
          menu.restSeconds,
          menu.focusNote,
          menu.memo,
          menu.sortOrder,
          toDbBool(menu.isFavorite),
          menu.repeatType,
          menu.repeatWeekdays,
          toDbBool(menu.isAiSuggested),
          menu.sourceAssessmentId,
          timestamp,
          timestamp,
        );
      }

      await insertDailyItem(planId, templateId, menu, timestamp);
    });

    return templateId ?? '';
  }

  async function insertDailyItem(
    planId: string,
    templateId: string | null,
    menu: PracticeMenu,
    timestamp = nowIso(),
  ): Promise<string> {
    const itemId = id('item');
    await db.runAsync(
      `INSERT INTO daily_practice_items(
        id, plan_id, account_id, player_id, template_id, title, purpose, target_area, rounds,
        throws_per_round, sets, target_value, planned_minutes, rest_seconds, focus_note, memo,
        sort_order, is_favorite, is_ai_suggested, source_assessment_id, drill_definition_id,
        drill_type, input_mode, target_type, target_numbers, total_throws, target_success_count,
        scoring_mode, mark_mode, source_type, source_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      itemId,
      planId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      templateId,
      menu.title,
      menu.purpose,
      menu.targetArea,
      menu.rounds,
      menu.throwsPerRound,
      menu.sets,
      menu.targetValue,
      menu.plannedMinutes,
      menu.restSeconds,
      menu.focusNote,
      menu.memo,
      menu.sortOrder,
      toDbBool(menu.isFavorite),
      toDbBool(menu.isAiSuggested),
      menu.sourceAssessmentId,
      menu.drillDefinitionId,
      menu.drillType,
      menu.inputMode,
      menu.targetType,
      menu.targetNumbers,
      menu.totalThrows,
      menu.targetSuccessCount,
      menu.scoringMode,
      menu.markMode,
      menu.sourceType,
      menu.sourceId,
      timestamp,
      timestamp,
    );
    return itemId;
  }

  async function addTemplateToDate(templateId: string, date: string): Promise<void> {
    const template = await db.getFirstAsync<any>(
      `SELECT * FROM practice_menu_templates
       WHERE id = ? AND account_id = ? AND player_id = ? AND deleted_at IS NULL`,
      templateId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    if (!template) {
      throw new Error('テンプレートが見つかりません。');
    }
    const planId = await getOrCreatePlan(date);
    await insertDailyItem(planId, templateId, {
      title: template.title,
      purpose: template.purpose,
      targetArea: template.target_area,
      rounds: template.rounds,
      throwsPerRound: template.throws_per_round,
      sets: template.sets,
      targetValue: template.target_value,
      plannedMinutes: template.planned_minutes,
      restSeconds: template.rest_seconds,
      focusNote: template.focus_note,
      memo: template.memo,
      sortOrder: template.sort_order,
      isFavorite: fromDbBool(template.is_favorite),
      plannedDate: date,
      repeatType: template.repeat_type,
      repeatWeekdays: template.repeat_weekdays,
      isAiSuggested: fromDbBool(template.is_ai_suggested),
      sourceAssessmentId: template.source_assessment_id,
      drillDefinitionId: null,
      drillType: null,
      inputMode: null,
      targetType: null,
      targetNumbers: null,
      totalThrows: null,
      targetSuccessCount: null,
      scoringMode: null,
      markMode: null,
      sourceType: 'template',
      sourceId: template.id,
    });
  }

  async function deleteTemplate(templateId: string): Promise<void> {
    await db.runAsync(
      `UPDATE practice_menu_templates
       SET deleted_at = ?, updated_at = ?
       WHERE id = ? AND account_id = ? AND player_id = ?`,
      nowIso(),
      nowIso(),
      templateId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function moveItem(itemId: string, direction: -1 | 1): Promise<void> {
    const item = await db.getFirstAsync<{ plan_id: string; sort_order: number }>(
      'SELECT plan_id, sort_order FROM daily_practice_items WHERE id = ?',
      itemId,
    );
    if (!item) {
      return;
    }
    const rows = await db.getAllAsync<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM daily_practice_items
       WHERE plan_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC`,
      item.plan_id,
    );
    const index = rows.findIndex((row) => row.id === itemId);
    const swapWith = rows[index + direction];
    if (!swapWith) {
      return;
    }
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE daily_practice_items SET sort_order = ?, updated_at = ? WHERE id = ?',
        swapWith.sort_order,
        nowIso(),
        itemId,
      );
      await db.runAsync(
        'UPDATE daily_practice_items SET sort_order = ?, updated_at = ? WHERE id = ?',
        item.sort_order,
        nowIso(),
        swapWith.id,
      );
    });
  }

  async function startSession(item: DailyPracticeItemRow): Promise<string> {
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM practice_sessions
       WHERE daily_item_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 1`,
      item.id,
    );
    const timestamp = nowIso();
    if (existing) {
      await db.runAsync(
        `UPDATE practice_sessions SET status = 'in_progress', paused_at = NULL, updated_at = ? WHERE id = ?`,
        timestamp,
        existing.id,
      );
      await db.runAsync(
        `UPDATE daily_practice_items SET status = 'in_progress', started_at = COALESCE(started_at, ?), updated_at = ? WHERE id = ?`,
        timestamp,
        timestamp,
        item.id,
      );
      return existing.id;
    }

    const sessionId = id('sess');
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO practice_sessions(
          id, account_id, player_id, daily_item_id, title_snapshot, status, started_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?)`,
        sessionId,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        item.id,
        item.title,
        timestamp,
        timestamp,
        timestamp,
      );
      await db.runAsync(
        `UPDATE daily_practice_items SET status = 'in_progress', started_at = ?, updated_at = ? WHERE id = ?`,
        timestamp,
        timestamp,
        item.id,
      );
    });
    return sessionId;
  }

  async function updateSessionProgress(
    sessionId: string,
    progress: PracticeProgress,
  ): Promise<void> {
    await db.runAsync(
      `UPDATE practice_sessions
       SET current_set = ?, current_round = ?, current_throw = ?, elapsed_seconds = ?,
           status = ?, undo_snapshot_json = ?, updated_at = ?
       WHERE id = ? AND account_id = ? AND player_id = ?`,
      progress.currentSet,
      progress.currentRound,
      progress.currentThrow,
      progress.elapsedSeconds,
      progress.status,
      progress.undoSnapshot ? JSON.stringify(progress.undoSnapshot) : null,
      nowIso(),
      sessionId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function setItemStatus(itemId: string, status: PracticeItemStatus): Promise<void> {
    const timestamp = nowIso();
    const completedAt = status === 'completed' ? timestamp : null;
    const skippedAt = status === 'skipped' ? timestamp : null;
    const abortedAt = status === 'aborted' ? timestamp : null;
    await db.runAsync(
      `UPDATE daily_practice_items
       SET status = ?, completed_at = COALESCE(?, completed_at),
           skipped_at = COALESCE(?, skipped_at), aborted_at = COALESCE(?, aborted_at), updated_at = ?
       WHERE id = ? AND account_id = ? AND player_id = ?`,
      status,
      completedAt,
      skippedAt,
      abortedAt,
      timestamp,
      itemId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function completeSession(sessionId: string, itemId: string | null): Promise<void> {
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE practice_sessions
         SET status = 'completed', completed_at = ?, updated_at = ?
         WHERE id = ? AND account_id = ? AND player_id = ?`,
        timestamp,
        timestamp,
        sessionId,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
      );
      if (itemId) {
        await setItemStatus(itemId, 'completed');
      }
    });
  }

  async function savePracticeResult(input: PracticeResultInput): Promise<void> {
    const timestamp = nowIso();
    await db.runAsync(
      `INSERT INTO practice_results(
        id, account_id, player_id, practice_session_id, actual_minutes, actual_rounds, actual_sets,
        total_throws, bull_count, optional_score, achievement_level, condition_label, body_feel,
        good_points, concern_points, next_focus_note, memo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(practice_session_id) DO UPDATE SET
        actual_minutes = excluded.actual_minutes,
        actual_rounds = excluded.actual_rounds,
        actual_sets = excluded.actual_sets,
        total_throws = excluded.total_throws,
        bull_count = excluded.bull_count,
        optional_score = excluded.optional_score,
        achievement_level = excluded.achievement_level,
        condition_label = excluded.condition_label,
        body_feel = excluded.body_feel,
        good_points = excluded.good_points,
        concern_points = excluded.concern_points,
        next_focus_note = excluded.next_focus_note,
        memo = excluded.memo,
        updated_at = excluded.updated_at`,
      id('result'),
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      input.practiceSessionId,
      input.actualMinutes ?? null,
      input.actualRounds ?? null,
      input.actualSets ?? null,
      input.totalThrows ?? null,
      input.bullCount ?? null,
      optionalText(input.optionalScore),
      input.achievementLevel ?? null,
      optionalText(input.conditionLabel),
      optionalText(input.bodyFeel),
      optionalText(input.goodPoints),
      optionalText(input.concernPoints),
      optionalText(input.nextFocusNote),
      optionalText(input.memo),
      timestamp,
      timestamp,
    );
  }

  async function listSessions(): Promise<PracticeSessionRow[]> {
    return db.getAllAsync<PracticeSessionRow>(
      `SELECT * FROM practice_sessions
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 30`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function saveVideo(input: SaveVideoInput): Promise<string> {
    const timestamp = nowIso();
    const videoId = id('video');
    await db.runAsync(
      `INSERT INTO form_videos(
        id, account_id, player_id, practice_session_id, direction, uri, captured_at, duration_ms,
        file_size_bytes, handedness, dart_weight_grams, memo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      videoId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      input.practiceSessionId ?? null,
      input.direction,
      input.uri,
      timestamp,
      input.durationMs ?? null,
      input.fileSizeBytes ?? null,
      optionalText(input.handedness),
      input.dartWeightGrams ?? null,
      optionalText(input.memo),
      timestamp,
      timestamp,
    );
    return videoId;
  }

  async function listVideos(): Promise<FormVideoRow[]> {
    return db.getAllAsync<FormVideoRow>(
      `SELECT * FROM form_videos
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function deleteVideo(videoId: string): Promise<void> {
    await db.runAsync(
      `UPDATE form_videos SET deleted_at = ?, updated_at = ? WHERE id = ? AND account_id = ?`,
      nowIso(),
      nowIso(),
      videoId,
      DEFAULT_ACCOUNT_ID,
    );
  }

  async function latestAssessmentBefore(sessionId: string | null): Promise<AssessmentRow | null> {
    const args = sessionId
      ? [DEFAULT_ACCOUNT_ID, DEFAULT_PLAYER_ID, sessionId]
      : [DEFAULT_ACCOUNT_ID, DEFAULT_PLAYER_ID];
    const where = sessionId
      ? 'AND id NOT IN (SELECT id FROM ai_form_assessments WHERE practice_session_id = ?)'
      : '';
    return db.getFirstAsync<AssessmentRow>(
      `SELECT * FROM ai_form_assessments
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL ${where}
       ORDER BY created_at DESC LIMIT 1`,
      ...args,
    );
  }

  async function saveAssessment(
    rawText: string,
    sections: AssessmentSections,
    practiceSessionId: string | null,
    formVideoId: string | null,
    userNote?: string | null,
  ): Promise<{ id: string; duplicate: boolean; parseStatus: string }> {
    const rawHash = hashAssessmentRawText(rawText);
    const duplicate = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM ai_form_assessments
       WHERE practice_session_id IS ? AND raw_hash = ? AND deleted_at IS NULL`,
      practiceSessionId,
      rawHash,
    );
    if (duplicate) {
      return { id: duplicate.id, duplicate: true, parseStatus: 'duplicate' };
    }

    const parsed = parseChatGptAssessment(rawText);
    const timestamp = nowIso();
    const assessmentId = id('assess');
    const previous = await latestAssessmentBefore(practiceSessionId);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO ai_form_assessments(
          id, account_id, player_id, practice_session_id, form_video_id, raw_text, raw_hash,
          parsed_json, parse_status, recognized_heading_count, compared_to_assessment_id,
          user_note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        assessmentId,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        practiceSessionId,
        formVideoId,
        rawText,
        rawHash,
        JSON.stringify(sections),
        parsed.hasRecognizedHeading ? 'parsed' : 'raw_only',
        parsed.recognizedCount,
        previous?.id ?? null,
        optionalText(userNote),
        timestamp,
        timestamp,
      );

      const focusItems = deriveNextFocusItems(sections);
      for (let index = 0; index < focusItems.length; index += 1) {
        const focusTitle = focusItems[index];
        if (!focusTitle) {
          continue;
        }
        await db.runAsync(
          `INSERT INTO next_focus_items(
            id, account_id, player_id, assessment_id, title, priority, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          id('focus'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          assessmentId,
          focusTitle,
          index + 1,
          timestamp,
          timestamp,
        );
      }

      for (const title of derivePracticeRecommendations(sections)) {
        await db.runAsync(
          `INSERT INTO practice_recommendations(
            id, account_id, player_id, assessment_id, title, detail, status, source_text, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?)`,
          id('rec'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          assessmentId,
          title,
          sections.recommendedPractice,
          sections.recommendedPractice,
          timestamp,
          timestamp,
        );
      }

      const issueTitles = deriveNextFocusItems(sections);
      for (const title of issueTitles) {
        const issueId = id('issue');
        await db.runAsync(
          `INSERT INTO improvement_issues(
            id, account_id, player_id, title, detail, target_part, status, priority,
            first_found_date, last_checked_date, source_assessment_id, source_video_id,
            source_session_id, next_check_note, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'その他', 'NEW', 2, ?, ?, ?, ?, ?, ?, ?, ?)`,
          issueId,
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          title,
          sections.improvementPoints || sections.notImprovedYet || null,
          timestamp.slice(0, 10),
          timestamp.slice(0, 10),
          assessmentId,
          formVideoId,
          practiceSessionId,
          title,
          timestamp,
          timestamp,
        );
        await db.runAsync(
          `INSERT INTO improvement_issue_history(
            id, account_id, player_id, issue_id, assessment_id, previous_status, next_status, note, created_at
          ) VALUES (?, ?, ?, ?, ?, NULL, 'NEW', ?, ?)`,
          id('hist'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          issueId,
          assessmentId,
          'ChatGPT評価の取り込みから作成',
          timestamp,
        );
      }
    });

    return {
      id: assessmentId,
      duplicate: false,
      parseStatus: parsed.hasRecognizedHeading ? 'parsed' : 'raw_only',
    };
  }

  async function listAssessments(): Promise<AssessmentRow[]> {
    return db.getAllAsync<AssessmentRow>(
      `SELECT * FROM ai_form_assessments
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function listIssues(): Promise<ImprovementIssueRow[]> {
    return db.getAllAsync<ImprovementIssueRow>(
      `SELECT * FROM improvement_issues
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY status ASC, priority ASC, updated_at DESC`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function updateIssueStatus(issueId: string, status: ImprovementIssueStatus): Promise<void> {
    const issue = await db.getFirstAsync<{ status: ImprovementIssueStatus }>(
      'SELECT status FROM improvement_issues WHERE id = ? AND account_id = ?',
      issueId,
      DEFAULT_ACCOUNT_ID,
    );
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE improvement_issues
         SET status = ?, resolved_date = CASE WHEN ? = 'RESOLVED' THEN ? ELSE resolved_date END,
             last_checked_date = ?, updated_at = ?
         WHERE id = ? AND account_id = ? AND player_id = ?`,
        status,
        status,
        timestamp.slice(0, 10),
        timestamp.slice(0, 10),
        timestamp,
        issueId,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
      );
      await db.runAsync(
        `INSERT INTO improvement_issue_history(
          id, account_id, player_id, issue_id, previous_status, next_status, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'ユーザー確認による状態変更', ?)`,
        id('hist'),
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        issueId,
        issue?.status ?? null,
        status,
        timestamp,
      );
    });
  }

  async function listNextFocus(): Promise<NextFocusRow[]> {
    return db.getAllAsync<NextFocusRow>(
      `SELECT * FROM next_focus_items
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, priority ASC, created_at DESC
       LIMIT 12`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function updateNextFocusStatus(focusId: string, status: NextFocusStatus): Promise<void> {
    await db.runAsync(
      `UPDATE next_focus_items
       SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END,
           updated_at = ?
       WHERE id = ? AND account_id = ? AND player_id = ?`,
      status,
      status,
      nowIso(),
      nowIso(),
      focusId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function listRecommendations(): Promise<RecommendationRow[]> {
    return db.getAllAsync<RecommendationRow>(
      `SELECT * FROM practice_recommendations
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY CASE status WHEN 'candidate' THEN 0 ELSE 1 END, created_at DESC`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function applyRecommendation(
    recommendation: RecommendationRow,
    date: string,
    saveAsTemplate: boolean,
  ): Promise<void> {
    await addPracticeMenu(
      {
        title: recommendation.title,
        purpose: 'ChatGPT評価からの練習候補',
        targetArea: null,
        rounds: null,
        throwsPerRound: null,
        sets: null,
        targetValue: null,
        plannedMinutes: null,
        restSeconds: null,
        focusNote: recommendation.detail,
        memo: '不足値は実施前に確認してください。',
        sortOrder: 999,
        isFavorite: false,
        plannedDate: date,
        repeatType: 'once',
        repeatWeekdays: null,
        isAiSuggested: true,
        sourceAssessmentId: recommendation.assessment_id,
        drillDefinitionId: null,
        drillType: null,
        inputMode: null,
        targetType: null,
        targetNumbers: null,
        totalThrows: null,
        targetSuccessCount: null,
        scoringMode: null,
        markMode: null,
        sourceType: 'assessment_recommendation',
        sourceId: recommendation.id,
      },
      saveAsTemplate,
    );
    await db.runAsync(
      `UPDATE practice_recommendations SET status = ?, updated_at = ? WHERE id = ?`,
      saveAsTemplate ? 'saved_template' : 'added',
      nowIso(),
      recommendation.id,
    );
  }

  async function updateRecommendationStatus(
    recommendationId: string,
    status: RecommendationStatus,
  ): Promise<void> {
    await db.runAsync(
      `UPDATE practice_recommendations
       SET status = ?, updated_at = ?
       WHERE id = ? AND account_id = ? AND player_id = ?`,
      status,
      nowIso(),
      recommendationId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function getSkillProfile(): Promise<SkillProfileRow> {
    const existing = await db.getFirstAsync<SkillProfileRow>(
      `SELECT * FROM player_skill_profiles WHERE account_id = ? AND player_id = ?`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    if (existing) {
      return existing;
    }
    const timestamp = nowIso();
    await db.runAsync(
      `INSERT INTO player_skill_profiles(
        id, account_id, player_id, current_level, provisional_level, level_started_at,
        promotion_ready, promotion_test_count, promotion_test_pass_count, last_level_check_at,
        level_confidence, total_practice_count, created_at, updated_at
      ) VALUES (?, ?, ?, 'C', NULL, ?, 0, 0, 0, NULL, 0, 0, ?, ?)`,
      'skill-owner-player',
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      timestamp,
      timestamp,
      timestamp,
    );
    return (await db.getFirstAsync<SkillProfileRow>(
      `SELECT * FROM player_skill_profiles WHERE account_id = ? AND player_id = ?`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    )) as SkillProfileRow;
  }

  async function listLevelHistory(): Promise<LevelHistoryRow[]> {
    return db.getAllAsync<LevelHistoryRow>(
      `SELECT * FROM player_level_history
       WHERE account_id = ? AND player_id = ?
       ORDER BY created_at DESC`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function recordLevelCheck(parts: {
    countUp: number;
    bull: number;
    twenty: number;
    cricket: number;
    finish: number;
    stability: number;
  }): Promise<{ id: string; overallScore: number; proposedLevel: PlayerLevel; passed: boolean }> {
    const profile = await getSkillProfile();
    const overallScore = calculateLevelCheckScore(parts);
    const proposedLevel = proposeLevelFromScore(overallScore);
    const passed = proposedLevel !== profile.current_level;
    const timestamp = nowIso();
    const sessionId = id('levelcheck');
    const weights = [
      ['countUp', 'COUNT-UP', parts.countUp, 0.25],
      ['bull', 'BULL 30投', parts.bull, 0.2],
      ['twenty', '20ナンバー15投', parts.twenty, 0.15],
      ['cricket', 'CRICKET', parts.cricket, 0.2],
      ['finish', 'FINISH 5問', parts.finish, 0.1],
      ['stability', '安定性評価', parts.stability, 0.1],
    ] as const;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO level_check_sessions(
          id, account_id, player_id, started_level, proposed_level, overall_score, passed,
          criteria_label, started_at, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DartsSupportApp独自基準', ?, ?, ?, ?)`,
        sessionId,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        profile.current_level,
        proposedLevel,
        overallScore,
        toDbBool(passed),
        timestamp,
        timestamp,
        timestamp,
        timestamp,
      );
      for (const [key, label, raw, weight] of weights) {
        await db.runAsync(
          `INSERT INTO level_check_results(
            id, account_id, player_id, level_check_session_id, part_key, part_label,
            raw_value, normalized_score, weight, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id('levelpart'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          sessionId,
          key,
          label,
          raw,
          raw,
          weight,
          timestamp,
        );
      }
      const nextProfile = evaluatePromotion(
        {
          currentLevel: profile.current_level,
          provisionalLevel: profile.provisional_level,
          promotionReady: fromDbBool(profile.promotion_ready),
          promotionTestCount: profile.promotion_test_count,
          promotionTestPassCount: profile.promotion_test_pass_count,
          levelConfidence: profile.level_confidence,
          totalPracticeCount: profile.total_practice_count,
        },
        passed,
      );
      await db.runAsync(
        `UPDATE player_skill_profiles
         SET provisional_level = ?, promotion_ready = ?, promotion_test_count = ?,
             promotion_test_pass_count = ?, last_level_check_at = ?, level_confidence = ?,
             total_practice_count = total_practice_count + 1, updated_at = ?
         WHERE account_id = ? AND player_id = ?`,
        nextProfile.provisionalLevel,
        toDbBool(nextProfile.promotionReady),
        nextProfile.promotionTestCount,
        nextProfile.promotionTestPassCount,
        timestamp,
        overallScore,
        timestamp,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
      );
    });
    return { id: sessionId, overallScore, proposedLevel, passed };
  }

  async function confirmLevelPromotion(): Promise<void> {
    const profile = await getSkillProfile();
    const nextProfile = confirmPromotion({
      currentLevel: profile.current_level,
      provisionalLevel: profile.provisional_level,
      promotionReady: fromDbBool(profile.promotion_ready),
      promotionTestCount: profile.promotion_test_count,
      promotionTestPassCount: profile.promotion_test_pass_count,
      levelConfidence: profile.level_confidence,
      totalPracticeCount: profile.total_practice_count,
    });
    if (nextProfile.currentLevel === profile.current_level) {
      return;
    }
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE player_skill_profiles
         SET current_level = ?, provisional_level = NULL, promotion_ready = 0,
             promotion_test_count = 0, promotion_test_pass_count = 0,
             level_started_at = ?, updated_at = ?
         WHERE account_id = ? AND player_id = ?`,
        nextProfile.currentLevel,
        timestamp,
        timestamp,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
      );
      await db.runAsync(
        `INSERT INTO player_level_history(
          id, account_id, player_id, previous_level, next_level, reason,
          judgement_json, user_confirmed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        id('levelhist'),
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        profile.current_level,
        nextProfile.currentLevel,
        'レベルチェック3回中2回合格後のユーザー確認',
        JSON.stringify({
          promotionTestCount: profile.promotion_test_count,
          promotionTestPassCount: profile.promotion_test_pass_count,
          criteria: 'DartsSupportApp独自基準',
        }),
        timestamp,
      );
    });
  }

  async function listLevelRecommendations(date: string): Promise<PracticeMenu[]> {
    const profile = await getSkillProfile();
    return recommendMenusForLevel(profile.current_level, date);
  }

  async function startTrainingGame(input: StartTrainingGameInput): Promise<string> {
    const definition = TRAINING_GAMES.find((game) => game.type === input.gameType);
    if (!definition) {
      throw new Error('未対応の練習ゲームです。');
    }
    const timestamp = nowIso();
    const sessionId = id('game');
    await db.runAsync(
      `INSERT INTO training_game_sessions(
        id, account_id, player_id, practice_session_id, daily_item_id, game_type, title,
        status, current_round, current_throw, bull_mode, out_mode, target_json,
        started_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 1, 0, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      input.practiceSessionId ?? null,
      input.dailyItemId ?? null,
      input.gameType,
      definition.title,
      input.bullMode ?? null,
      input.outMode ?? null,
      input.targetJson ?? null,
      timestamp,
      timestamp,
      timestamp,
    );
    return sessionId;
  }

  async function saveTrainingThrows(
    gameSessionId: string,
    throws: TrainingThrowInput[],
  ): Promise<void> {
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      for (const dart of throws) {
        const roundId = id('round');
        await db.runAsync(
          `INSERT OR IGNORE INTO training_rounds(
            id, account_id, player_id, game_session_id, round_number, target_number,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          roundId,
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          gameSessionId,
          dart.roundNumber,
          dart.targetNumber == null ? null : String(dart.targetNumber),
          timestamp,
          timestamp,
        );
        await db.runAsync(
          `INSERT INTO training_throws(
            id, account_id, player_id, game_session_id, round_number, throw_number,
            target_number, segment, multiplier, score, normalized_x, normalized_y, radius,
            angle, confidence, input_method, is_manual_override, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id('throw'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          gameSessionId,
          dart.roundNumber,
          dart.throwNumber,
          dart.targetNumber == null ? null : String(dart.targetNumber),
          dart.segment == null ? null : String(dart.segment),
          dart.multiplier ?? 0,
          dart.score,
          dart.x ?? null,
          dart.y ?? null,
          dart.radius ?? null,
          dart.angle ?? null,
          dart.confidence ?? 1,
          dart.inputMethod,
          toDbBool(dart.isManualOverride ?? false),
          timestamp,
          timestamp,
        );
      }
      await refreshTrainingGameSummary(gameSessionId);
    });
  }

  async function refreshTrainingGameSummary(gameSessionId: string): Promise<void> {
    const rows = await db.getAllAsync<TrainingThrowRow>(
      `SELECT * FROM training_throws WHERE game_session_id = ? ORDER BY round_number, throw_number`,
      gameSessionId,
    );
    const session = await db.getFirstAsync<{ game_type: TrainingGameType }>(
      `SELECT game_type FROM training_game_sessions WHERE id = ?`,
      gameSessionId,
    );
    const throws = rows.map((row) => ({
      roundNumber: row.round_number,
      throwNumber: row.throw_number,
      targetNumber: row.target_number,
      segment:
        row.segment === 'BULL' || row.segment === 'OUT'
          ? row.segment
          : row.segment
            ? Number(row.segment)
            : null,
      multiplier: row.multiplier as 0 | 1 | 2 | 3,
      score: row.score,
      x: row.normalized_x,
      y: row.normalized_y,
      radius: row.radius,
      angle: row.angle,
      confidence: row.confidence,
      inputMethod: row.input_method as TrainingThrowInput['inputMethod'],
      isManualOverride: fromDbBool(row.is_manual_override),
    })) as TrainingThrowInput[];
    await db.runAsync(
      `UPDATE training_game_sessions
       SET summary_json = ?, current_round = COALESCE((SELECT MAX(round_number) FROM training_throws WHERE game_session_id = ?), current_round),
           current_throw = COALESCE((SELECT MAX(throw_number) FROM training_throws WHERE game_session_id = ? AND round_number = current_round), current_throw),
           updated_at = ?
       WHERE id = ?`,
      JSON.stringify(summarizeTrainingGame(session?.game_type ?? 'COUNT_UP', throws)),
      gameSessionId,
      gameSessionId,
      nowIso(),
      gameSessionId,
    );
  }

  async function completeTrainingGame(gameSessionId: string): Promise<void> {
    await refreshTrainingGameSummary(gameSessionId);
    await db.runAsync(
      `UPDATE training_game_sessions SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`,
      nowIso(),
      nowIso(),
      gameSessionId,
    );
  }

  async function listTrainingGames(): Promise<TrainingGameSessionRow[]> {
    return db.getAllAsync<TrainingGameSessionRow>(
      `SELECT * FROM training_game_sessions
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 50`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function listTrainingThrows(gameSessionId: string): Promise<TrainingThrowRow[]> {
    return db.getAllAsync<TrainingThrowRow>(
      `SELECT * FROM training_throws
       WHERE account_id = ? AND player_id = ? AND game_session_id = ?
       ORDER BY round_number, throw_number`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      gameSessionId,
    );
  }

  async function saveThrowPhotoSession(input: SavePhotoSessionInput): Promise<string> {
    const timestamp = nowIso();
    const photoSessionId = id('photo');
    const averageConfidence = input.confirmedPositions.length
      ? input.confirmedPositions.reduce((sum, dart) => sum + dart.confidence, 0) /
        input.confirmedPositions.length
      : 0;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO throw_photo_sessions(
          id, account_id, player_id, game_session_id, practice_session_id, round_number,
          original_photo_uri, corrected_photo_uri, calibration_json, auto_candidates_json,
          confirmed_positions_json, confidence, has_manual_adjustment, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
        photoSessionId,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        input.gameSessionId ?? null,
        input.practiceSessionId ?? null,
        input.roundNumber,
        input.originalPhotoUri,
        input.correctedPhotoUri ?? null,
        JSON.stringify(input.calibration),
        JSON.stringify(input.autoCandidates),
        JSON.stringify(input.confirmedPositions),
        averageConfidence,
        toDbBool(input.hasManualAdjustment),
        timestamp,
        timestamp,
      );
      for (let index = 0; index < input.autoCandidates.length; index += 1) {
        const candidate = input.autoCandidates[index];
        if (!candidate) {
          continue;
        }
        await db.runAsync(
          `INSERT INTO throw_detection_candidates(
            id, account_id, player_id, photo_session_id, candidate_index, normalized_x,
            normalized_y, radius, angle, segment, multiplier, score, confidence, input_method,
            accepted, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          id('candidate'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          photoSessionId,
          index + 1,
          candidate.x,
          candidate.y,
          candidate.radius,
          candidate.angle,
          String(candidate.segment),
          candidate.multiplier,
          candidate.score,
          candidate.confidence,
          candidate.inputMethod,
          timestamp,
        );
      }
      for (let index = 0; index < input.confirmedPositions.length; index += 1) {
        const position = input.confirmedPositions[index];
        if (!position) {
          continue;
        }
        await db.runAsync(
          `INSERT INTO confirmed_throw_positions(
            id, account_id, player_id, photo_session_id, game_session_id, round_number,
            throw_number, normalized_x, normalized_y, radius, angle, segment, multiplier,
            score, confidence, input_method, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id('confirmed'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          photoSessionId,
          input.gameSessionId ?? null,
          input.roundNumber,
          index + 1,
          position.x,
          position.y,
          position.radius,
          position.angle,
          String(position.segment),
          position.multiplier,
          position.score,
          position.confidence,
          position.inputMethod,
          timestamp,
        );
      }
    });
    if (input.gameSessionId) {
      await saveTrainingThrows(
        input.gameSessionId,
        input.confirmedPositions.map((position, index) => ({
          roundNumber: input.roundNumber,
          throwNumber: index + 1,
          segment: position.segment,
          multiplier: position.multiplier,
          score: position.score,
          x: position.x,
          y: position.y,
          radius: position.radius,
          angle: position.angle,
          confidence: position.confidence,
          inputMethod: position.inputMethod,
          isManualOverride: input.hasManualAdjustment,
        })),
      );
    }
    return photoSessionId;
  }

  async function listThrowPhotoSessions(): Promise<ThrowPhotoSessionRow[]> {
    return db.getAllAsync<ThrowPhotoSessionRow>(
      `SELECT * FROM throw_photo_sessions
       WHERE account_id = ? AND player_id = ?
       ORDER BY created_at DESC LIMIT 30`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function listDrillDefinitions(category?: DrillCategory): Promise<DrillDefinitionRow[]> {
    const rows = await db.getAllAsync<DrillDefinitionRow>(
      `SELECT tdd.*, COALESCE(pdp.is_favorite, 0) AS is_favorite
       FROM training_drill_definitions tdd
       LEFT JOIN player_drill_preferences pdp
         ON pdp.drill_definition_id = tdd.id
        AND pdp.account_id = ?
        AND pdp.player_id = ?
       WHERE tdd.deleted_at IS NULL
         AND tdd.is_hidden = 0
         AND COALESCE(pdp.is_hidden, 0) = 0
         ${category ? 'AND tdd.category = ?' : ''}
       ORDER BY tdd.category, COALESCE(pdp.is_favorite, 0) DESC, tdd.sort_order, tdd.name`,
      ...(category
        ? [DEFAULT_ACCOUNT_ID, DEFAULT_PLAYER_ID, category]
        : [DEFAULT_ACCOUNT_ID, DEFAULT_PLAYER_ID]),
    );
    return rows;
  }

  async function getOrCreateDailyMinimumPlan(date: string): Promise<DailyMinimumBundle> {
    const profile = await getSkillProfile();
    const timestamp = nowIso();
    let plan = await db.getFirstAsync<DailyMinimumPlanRow>(
      `SELECT * FROM daily_minimum_plans WHERE account_id = ? AND player_id = ? AND practice_date = ?`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      date,
    );
    if (!plan) {
      const planId = id('dailymin');
      const definitions = dailyMinimumForLevel(profile.current_level);
      const targetMinutes = definitions.reduce((sum, drill) => sum + drill.estimatedMinutes, 0);
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO daily_minimum_plans(
            id, account_id, player_id, practice_date, level_snapshot, target_minutes,
            total_items, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          planId,
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          date,
          profile.current_level,
          targetMinutes,
          definitions.length,
          timestamp,
          timestamp,
        );
        for (let index = 0; index < definitions.length; index += 1) {
          const drill = definitions[index];
          if (!drill) {
            continue;
          }
          await db.runAsync(
            `INSERT OR IGNORE INTO daily_minimum_items(
              id, account_id, player_id, plan_id, drill_definition_id, name_snapshot,
              target_throws, estimated_minutes, sort_order, source_reason, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            id('dailyitem'),
            DEFAULT_ACCOUNT_ID,
            DEFAULT_PLAYER_ID,
            planId,
            drill.id,
            drill.name,
            drill.totalThrows,
            drill.estimatedMinutes,
            index,
            `${profile.current_level}レベルのデイリーミニマム`,
            timestamp,
            timestamp,
          );
        }
      });
      plan = (await db.getFirstAsync<DailyMinimumPlanRow>(
        `SELECT * FROM daily_minimum_plans WHERE id = ?`,
        planId,
      )) as DailyMinimumPlanRow;
    }
    const items = await listDailyMinimumItems(plan.id);
    return { plan, items, summary: await buildDailyMinimumSummary(plan, items) };
  }

  async function listDailyMinimumItems(planId: string): Promise<DailyMinimumItemRow[]> {
    return db.getAllAsync<DailyMinimumItemRow>(
      `SELECT * FROM daily_minimum_items
       WHERE account_id = ? AND player_id = ? AND plan_id = ?
       ORDER BY sort_order, created_at`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      planId,
    );
  }

  async function buildDailyMinimumSummary(
    plan: DailyMinimumPlanRow,
    items: DailyMinimumItemRow[],
  ): Promise<DailyMinimumBundle['summary']> {
    const history = await db.getAllAsync<{ practice_date: string; achieved: number }>(
      `SELECT practice_date, achieved FROM daily_minimum_completion
       WHERE account_id = ? AND player_id = ?
       ORDER BY practice_date DESC LIMIT 14`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    return summarizeDailyMinimum(
      items.map((item) => ({
        name: item.name_snapshot,
        completed: item.status === 'completed',
        totalThrows: item.actual_throws,
        durationSeconds: item.duration_seconds,
      })),
      history.map((entry) => ({ date: entry.practice_date, achieved: fromDbBool(entry.achieved) })),
    );
  }

  async function startDrillSession(
    drillDefinitionId: string,
    dailyMinimumItemId?: string | null,
  ): Promise<string> {
    const definition = await db.getFirstAsync<DrillDefinitionRow>(
      `SELECT * FROM training_drill_definitions WHERE id = ? AND deleted_at IS NULL`,
      drillDefinitionId,
    );
    if (!definition) {
      throw new Error('ドリルが見つかりません。');
    }
    const existing = dailyMinimumItemId
      ? await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM drill_sessions
           WHERE daily_minimum_item_id = ? AND deleted_at IS NULL
           ORDER BY updated_at DESC LIMIT 1`,
          dailyMinimumItemId,
        )
      : null;
    const timestamp = nowIso();
    if (existing) {
      await db.runAsync(
        `UPDATE drill_sessions SET status = 'in_progress', paused_at = NULL, updated_at = ? WHERE id = ?`,
        timestamp,
        existing.id,
      );
      return existing.id;
    }
    const sessionId = id('drillsess');
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO drill_sessions(
          id, account_id, player_id, drill_definition_id, daily_minimum_item_id,
          status, round_input_mode, completion_rule, completion_target, finish_at_round_end,
          started_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?, 1, ?, ?, ?)`,
        sessionId,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        drillDefinitionId,
        dailyMinimumItemId ?? null,
        definition.input_mode ?? 'round_three_throw',
        definition.completion_rule ?? 'fixed_throws',
        definition.target_success_count ?? definition.total_throws,
        timestamp,
        timestamp,
        timestamp,
      );
      if (dailyMinimumItemId) {
        await db.runAsync(
          `UPDATE daily_minimum_items
           SET status = 'in_progress', started_at = COALESCE(started_at, ?), updated_at = ?
           WHERE id = ?`,
          timestamp,
          timestamp,
          dailyMinimumItemId,
        );
      }
    });
    return sessionId;
  }

  async function updateDrillSessionProgress(
    drillSessionId: string,
    status: 'in_progress' | 'paused' | 'completed' | 'aborted',
    currentRound: number,
    currentThrow: number,
    elapsedSeconds: number,
  ): Promise<void> {
    await db.runAsync(
      `UPDATE drill_sessions
       SET status = ?, current_round = ?, current_throw = ?, elapsed_seconds = ?,
           paused_at = CASE WHEN ? = 'paused' THEN ? ELSE paused_at END,
           completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END,
           updated_at = ?
       WHERE id = ? AND account_id = ? AND player_id = ?`,
      status,
      currentRound,
      currentThrow,
      elapsedSeconds,
      status,
      nowIso(),
      status,
      nowIso(),
      nowIso(),
      drillSessionId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function getDrillDefinition(drillDefinitionId: string): Promise<DrillDefinitionRow | null> {
    return db.getFirstAsync<DrillDefinitionRow>(
      `SELECT tdd.*, COALESCE(pdp.is_favorite, 0) as is_favorite
       FROM training_drill_definitions tdd
       LEFT JOIN player_drill_preferences pdp
         ON pdp.drill_definition_id = tdd.id
        AND pdp.account_id = ?
        AND pdp.player_id = ?
       WHERE tdd.id = ? AND tdd.deleted_at IS NULL`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      drillDefinitionId,
    );
  }

  async function listDrillThrowResults(drillSessionId: string): Promise<DrillThrowResultRow[]> {
    return db.getAllAsync<DrillThrowResultRow>(
      `SELECT * FROM drill_throw_results
       WHERE drill_session_id = ? AND account_id = ? AND player_id = ?
       ORDER BY overall_throw_number ASC`,
      drillSessionId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function recordDrillRound(
    drillSessionId: string,
    throws: DrillThrowResultInput[],
  ): Promise<void> {
    if (throws.length === 0 || throws.length > 3) {
      throw new Error('ラウンドは1～3投で確定してください。');
    }
    const session = await db.getFirstAsync<DrillSessionRow>(
      `SELECT * FROM drill_sessions WHERE id = ? AND account_id = ? AND player_id = ?`,
      drillSessionId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    if (!session) {
      throw new Error('ドリルセッションが見つかりません。');
    }
    const definition = await getDrillDefinition(session.drill_definition_id);
    if (!definition) {
      throw new Error('ドリル定義が見つかりません。');
    }
    const roundNumber = throws[0]?.roundNumber ?? session.current_round;
    if (throws.some((throwResult) => throwResult.roundNumber !== roundNumber)) {
      throw new Error('同じラウンドの3投だけを確定してください。');
    }
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM drill_throw_results
         WHERE drill_session_id = ? AND round_number = ? AND account_id = ? AND player_id = ?`,
        drillSessionId,
        roundNumber,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
      );
      for (const throwResult of throws) {
        await db.runAsync(
          `INSERT INTO drill_throw_results(
            id, account_id, player_id, drill_session_id, round_number, throw_number,
            overall_throw_number, result_type, intended_target, target_number, actual_number,
            segment, multiplier, score, mark_count, is_hit, is_inner_bull, is_outer_bull,
            target_hit, catch_hit, input_method, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id('drillthrow'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          drillSessionId,
          throwResult.roundNumber,
          throwResult.throwNumber,
          throwResult.overallThrowNumber,
          throwResult.resultType,
          stringifyTarget(throwResult.intendedTarget),
          stringifyTarget(throwResult.targetNumber),
          stringifyTarget(throwResult.actualNumber),
          throwResult.segment ?? null,
          throwResult.multiplier,
          throwResult.score,
          throwResult.markCount,
          toDbBool(throwResult.isHit),
          toDbBool(throwResult.isInnerBull),
          toDbBool(throwResult.isOuterBull),
          toDbBool(throwResult.targetHit),
          toDbBool(throwResult.catchHit),
          throwResult.inputMethod,
          timestamp,
        );
      }
      const roundSummary = summarizeDrillThrows(throws);
      await db.runAsync(
        `INSERT INTO drill_rounds(
          id, account_id, player_id, drill_session_id, round_number, target_number,
          throws, hit_count, mark_count, inner_bull, outer_bull, single_count,
          double_count, triple_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(drill_session_id, round_number) DO UPDATE SET
          target_number = excluded.target_number,
          throws = excluded.throws,
          hit_count = excluded.hit_count,
          mark_count = excluded.mark_count,
          inner_bull = excluded.inner_bull,
          outer_bull = excluded.outer_bull,
          single_count = excluded.single_count,
          double_count = excluded.double_count,
          triple_count = excluded.triple_count,
          updated_at = excluded.updated_at`,
        id('drillround'),
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        drillSessionId,
        roundNumber,
        stringifyTarget(throws[0]?.intendedTarget ?? throws[0]?.targetNumber),
        roundSummary.totalThrows,
        roundSummary.hitCount,
        roundSummary.markCount,
        roundSummary.innerBull,
        roundSummary.outerBull,
        roundSummary.singleCount,
        roundSummary.doubleCount,
        roundSummary.tripleCount,
        timestamp,
        timestamp,
      );
    });
    await rebuildDrillResultFromThrows(session, definition, timestamp);
  }

  async function undoLastDrillRound(drillSessionId: string): Promise<void> {
    const session = await db.getFirstAsync<DrillSessionRow>(
      `SELECT * FROM drill_sessions WHERE id = ? AND account_id = ? AND player_id = ?`,
      drillSessionId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    if (!session) {
      throw new Error('ドリルセッションが見つかりません。');
    }
    const definition = await getDrillDefinition(session.drill_definition_id);
    if (!definition) {
      throw new Error('ドリル定義が見つかりません。');
    }
    const latest = await db.getFirstAsync<{ round_number: number }>(
      `SELECT MAX(round_number) as round_number FROM drill_throw_results
       WHERE drill_session_id = ? AND account_id = ? AND player_id = ?`,
      drillSessionId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    if (!latest?.round_number) {
      return;
    }
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM drill_throw_results
         WHERE drill_session_id = ? AND round_number = ? AND account_id = ? AND player_id = ?`,
        drillSessionId,
        latest.round_number,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
      );
      await db.runAsync(
        `DELETE FROM drill_rounds
         WHERE drill_session_id = ? AND round_number = ? AND account_id = ? AND player_id = ?`,
        drillSessionId,
        latest.round_number,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
      );
    });
    await rebuildDrillResultFromThrows(session, definition, timestamp, 'in_progress');
  }

  async function rebuildDrillResultFromThrows(
    session: DrillSessionRow,
    definition: DrillDefinitionRow,
    timestamp: string,
    forcedStatus?: 'in_progress' | 'paused' | 'completed' | 'aborted',
  ): Promise<void> {
    const rows = await listDrillThrowResults(session.id);
    const throws = rows.map(toDomainDrillThrow);
    const summary = summarizeDrillThrows(throws);
    const targetNumbers = parseTargetNumbers(definition.target_numbers);
    const completionReached =
      forcedStatus === undefined &&
      isDrillCompletionReached(
        {
          completionRule: (definition.completion_rule ?? 'fixed_throws') as never,
          targetSuccessCount: definition.target_success_count ?? null,
          totalThrows: definition.total_throws,
          targetNumbers,
        },
        summary,
      );
    const nextStatus = forcedStatus ?? (completionReached ? 'completed' : 'in_progress');
    const nextRound = Math.floor(summary.totalThrows / 3) + 1;
    const nextThrow = summary.totalThrows % 3;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO drill_results(
          id, account_id, player_id, drill_session_id, drill_definition_id, total_throws,
          hit_count, mark_count, success_rate, bull_rate, round_average, inner_bull,
          outer_bull, single_count, double_count, triple_count, zero_rounds,
          three_plus_mark_rounds, best_target, weakest_target, longest_streak,
          longest_miss_streak, grouping_radius, horizontal_spread, vertical_spread,
          fatigue_drop, summary_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(drill_session_id) DO UPDATE SET
          total_throws = excluded.total_throws,
          hit_count = excluded.hit_count,
          mark_count = excluded.mark_count,
          success_rate = excluded.success_rate,
          bull_rate = excluded.bull_rate,
          round_average = excluded.round_average,
          inner_bull = excluded.inner_bull,
          outer_bull = excluded.outer_bull,
          single_count = excluded.single_count,
          double_count = excluded.double_count,
          triple_count = excluded.triple_count,
          zero_rounds = excluded.zero_rounds,
          three_plus_mark_rounds = excluded.three_plus_mark_rounds,
          best_target = excluded.best_target,
          weakest_target = excluded.weakest_target,
          longest_streak = excluded.longest_streak,
          longest_miss_streak = excluded.longest_miss_streak,
          fatigue_drop = excluded.fatigue_drop,
          summary_json = excluded.summary_json,
          updated_at = excluded.updated_at`,
        id('drillresult'),
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        session.id,
        session.drill_definition_id,
        summary.totalThrows,
        summary.hitCount,
        summary.markCount,
        summary.totalThrows ? summary.hitCount / summary.totalThrows : 0,
        summary.bullRate,
        Math.ceil(summary.totalThrows / 3)
          ? summary.markCount / Math.ceil(summary.totalThrows / 3)
          : 0,
        summary.innerBull,
        summary.outerBull,
        summary.singleCount,
        summary.doubleCount,
        summary.tripleCount,
        summary.zeroMarkRounds,
        [...Object.values(summary.targetProgress)].filter((value) => value >= 3).length,
        bestTarget(summary.targetProgress),
        weakestTarget(summary.targetProgress),
        summary.longestBullStreak,
        summary.longestNoBullStreak,
        null,
        null,
        null,
        summary.firstHalfBullRate !== null && summary.secondHalfBullRate !== null
          ? summary.firstHalfBullRate - summary.secondHalfBullRate
          : null,
        JSON.stringify(summary),
        timestamp,
        timestamp,
      );
      await db.runAsync(
        `UPDATE drill_sessions
         SET status = ?, current_round = ?, current_throw = ?, round_status = 'idle',
             round_draft_json = NULL,
             completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, ?) ELSE NULL END,
             updated_at = ?
         WHERE id = ? AND account_id = ? AND player_id = ?`,
        nextStatus,
        nextRound,
        nextThrow,
        nextStatus,
        timestamp,
        timestamp,
        session.id,
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
      );
      if (session.daily_minimum_item_id) {
        await db.runAsync(
          `UPDATE daily_minimum_items
           SET status = ?, actual_throws = ?, duration_seconds = ?, completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, ?) ELSE NULL END,
               updated_at = ?
           WHERE id = ?`,
          nextStatus,
          summary.totalThrows,
          session.elapsed_seconds,
          nextStatus,
          timestamp,
          timestamp,
          session.daily_minimum_item_id,
        );
        await refreshDailyMinimumCompletion(session.daily_minimum_item_id);
      }
    });
  }

  async function saveDrillResult(
    drillSessionId: string,
    input: DrillResultInput & {
      feelingLabel?: string | null;
      tensionLabel?: string | null;
      fatigueLabel?: string | null;
      note?: string | null;
    },
  ): Promise<void> {
    const session = await db.getFirstAsync<DrillSessionRow>(
      `SELECT * FROM drill_sessions WHERE id = ? AND account_id = ? AND player_id = ?`,
      drillSessionId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    if (!session) {
      throw new Error('ドリルセッションが見つかりません。');
    }
    const summary = summarizeDrillResult(input);
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO drill_results(
          id, account_id, player_id, drill_session_id, drill_definition_id, total_throws,
          hit_count, mark_count, success_rate, bull_rate, round_average, inner_bull,
          outer_bull, single_count, double_count, triple_count, zero_rounds,
          three_plus_mark_rounds, best_target, weakest_target, longest_streak,
          longest_miss_streak, grouping_radius, horizontal_spread, vertical_spread,
          fatigue_drop, feeling_label, tension_label, fatigue_label, note, summary_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(drill_session_id) DO UPDATE SET
          total_throws = excluded.total_throws,
          hit_count = excluded.hit_count,
          mark_count = excluded.mark_count,
          success_rate = excluded.success_rate,
          bull_rate = excluded.bull_rate,
          round_average = excluded.round_average,
          inner_bull = excluded.inner_bull,
          outer_bull = excluded.outer_bull,
          single_count = excluded.single_count,
          double_count = excluded.double_count,
          triple_count = excluded.triple_count,
          zero_rounds = excluded.zero_rounds,
          three_plus_mark_rounds = excluded.three_plus_mark_rounds,
          best_target = excluded.best_target,
          weakest_target = excluded.weakest_target,
          longest_streak = excluded.longest_streak,
          longest_miss_streak = excluded.longest_miss_streak,
          grouping_radius = excluded.grouping_radius,
          horizontal_spread = excluded.horizontal_spread,
          vertical_spread = excluded.vertical_spread,
          fatigue_drop = excluded.fatigue_drop,
          feeling_label = excluded.feeling_label,
          tension_label = excluded.tension_label,
          fatigue_label = excluded.fatigue_label,
          note = excluded.note,
          summary_json = excluded.summary_json,
          updated_at = excluded.updated_at`,
        id('drillresult'),
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        drillSessionId,
        session.drill_definition_id,
        summary.totalThrows,
        summary.hitCount,
        summary.markCount,
        summary.successRate,
        summary.bullRate,
        summary.roundAverage,
        input.innerBull ?? 0,
        input.outerBull ?? 0,
        input.singleCount ?? 0,
        input.doubleCount ?? 0,
        input.tripleCount ?? 0,
        summary.zeroRounds,
        summary.threePlusMarkRounds,
        summary.bestTarget,
        summary.weakestTarget,
        summary.longestStreak,
        summary.longestMissStreak,
        summary.groupingRadius,
        summary.horizontalSpread,
        summary.verticalSpread,
        summary.fatigueDrop,
        optionalText(input.feelingLabel),
        optionalText(input.tensionLabel),
        optionalText(input.fatigueLabel),
        optionalText(input.note),
        JSON.stringify(summary),
        timestamp,
        timestamp,
      );
      await db.runAsync(
        `UPDATE drill_sessions SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`,
        timestamp,
        timestamp,
        drillSessionId,
      );
      if (session.daily_minimum_item_id) {
        await db.runAsync(
          `UPDATE daily_minimum_items
           SET status = 'completed', actual_throws = ?, duration_seconds = ?,
               completed_at = ?, updated_at = ?
           WHERE id = ?`,
          summary.totalThrows,
          input.durationSeconds ?? session.elapsed_seconds,
          timestamp,
          timestamp,
          session.daily_minimum_item_id,
        );
        await refreshDailyMinimumCompletion(session.daily_minimum_item_id);
      }
    });
  }

  async function refreshDailyMinimumCompletion(itemId: string): Promise<void> {
    const item = await db.getFirstAsync<{ plan_id: string }>(
      `SELECT plan_id FROM daily_minimum_items WHERE id = ?`,
      itemId,
    );
    if (!item) {
      return;
    }
    const plan = await db.getFirstAsync<DailyMinimumPlanRow>(
      `SELECT * FROM daily_minimum_plans WHERE id = ?`,
      item.plan_id,
    );
    if (!plan) {
      return;
    }
    const items = await listDailyMinimumItems(plan.id);
    const summary = await buildDailyMinimumSummary(plan, items);
    const timestamp = nowIso();
    await db.runAsync(
      `UPDATE daily_minimum_plans
       SET completed_items = ?, total_items = ?, total_throws = ?, duration_seconds = ?,
           status = ?, updated_at = ?
       WHERE id = ?`,
      summary.completedItems,
      summary.totalItems,
      summary.totalThrows,
      summary.durationSeconds,
      summary.completedItems === summary.totalItems ? 'completed' : 'partial',
      timestamp,
      plan.id,
    );
    await db.runAsync(
      `INSERT INTO daily_minimum_completion(
        id, account_id, player_id, practice_date, completed_items, total_items,
        completion_rate, total_throws, duration_seconds, achieved, incomplete_items_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id, player_id, practice_date) DO UPDATE SET
        completed_items = excluded.completed_items,
        total_items = excluded.total_items,
        completion_rate = excluded.completion_rate,
        total_throws = excluded.total_throws,
        duration_seconds = excluded.duration_seconds,
        achieved = excluded.achieved,
        incomplete_items_json = excluded.incomplete_items_json,
        updated_at = excluded.updated_at`,
      id('dailycomp'),
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      plan.practice_date,
      summary.completedItems,
      summary.totalItems,
      summary.completionRate,
      summary.totalThrows,
      summary.durationSeconds,
      toDbBool(summary.completedItems === summary.totalItems),
      JSON.stringify(summary.incompleteNames),
      timestamp,
      timestamp,
    );
  }

  async function listDrillSessions(): Promise<DrillSessionRow[]> {
    return db.getAllAsync<DrillSessionRow>(
      `SELECT * FROM drill_sessions
       WHERE account_id = ? AND player_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC LIMIT 50`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function listDrillResults(): Promise<DrillResultRow[]> {
    return db.getAllAsync<DrillResultRow>(
      `SELECT * FROM drill_results
       WHERE account_id = ? AND player_id = ?
       ORDER BY created_at DESC LIMIT 80`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
  }

  async function generateRecommendedDrills(date: string, preset: TimePreset): Promise<void> {
    const profile = await getSkillProfile();
    const definitions = generateTimePreset(profile.current_level, preset);
    const results = await db.getAllAsync<{
      weakest_target: string | null;
      round_average: number;
      drill_definition_id: string;
    }>(
      `SELECT weakest_target, round_average, drill_definition_id
       FROM drill_results
       WHERE account_id = ? AND player_id = ?
       ORDER BY created_at DESC LIMIT 30`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    const weak = findWeakCricketTarget(
      results
        .filter((row) => row.weakest_target)
        .map((row) => ({
          targetNumber: Number(row.weakest_target) || 'BULL',
          averageMarks: row.round_average,
          samples: 2,
        })),
    );
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      let priority = 1;
      for (const definition of definitions) {
        await db.runAsync(
          `INSERT INTO recommended_drills(
            id, account_id, player_id, drill_definition_id, practice_date, source_reason,
            priority, status, time_preset, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?)`,
          id('recdrill'),
          DEFAULT_ACCOUNT_ID,
          DEFAULT_PLAYER_ID,
          definition.id,
          date,
          `${profile.current_level}レベルと${preset}分プリセットに基づく候補です。ユーザー確認まで予定には追加しません。`,
          priority,
          preset,
          timestamp,
          timestamp,
        );
        priority += 1;
      }
      await db.runAsync(
        `INSERT INTO recommended_drills(
          id, account_id, player_id, drill_definition_id, practice_date, source_reason,
          priority, status, time_preset, created_at, updated_at
        ) VALUES (?, ?, ?, 'weak_cricket_number', ?, ?, ?, 'candidate', ?, ?, ?)`,
        id('recdrill'),
        DEFAULT_ACCOUNT_ID,
        DEFAULT_PLAYER_ID,
        date,
        weak.reason,
        priority,
        preset,
        timestamp,
        timestamp,
      );
    });
  }

  async function listRecommendedDrills(date: string): Promise<RecommendedDrillRow[]> {
    return db.getAllAsync<RecommendedDrillRow>(
      `SELECT rd.*, tdd.name
       FROM recommended_drills rd
       LEFT JOIN training_drill_definitions tdd ON tdd.id = rd.drill_definition_id
       WHERE rd.account_id = ? AND rd.player_id = ? AND rd.practice_date = ? AND rd.deleted_at IS NULL
       ORDER BY rd.status, rd.priority, rd.created_at DESC`,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      date,
    );
  }

  async function applyRecommendedDrill(recommendationId: string, date: string): Promise<void> {
    const recommendation = await db.getFirstAsync<RecommendedDrillRow & DrillDefinitionRow>(
      `SELECT rd.*, tdd.*
       FROM recommended_drills rd
       JOIN training_drill_definitions tdd ON tdd.id = rd.drill_definition_id
       WHERE rd.id = ? AND rd.account_id = ? AND rd.player_id = ?`,
      recommendationId,
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
    );
    if (!recommendation) {
      throw new Error('おすすめが見つかりません。');
    }
    await addPracticeMenu(
      {
        title: recommendation.name,
        purpose: 'ドリルおすすめから追加',
        targetArea: null,
        rounds: null,
        throwsPerRound: null,
        sets: 1,
        targetValue: null,
        plannedMinutes: null,
        restSeconds: null,
        focusNote: recommendation.source_reason,
        memo: 'ユーザー確認により今日の予定へ追加しました。',
        sortOrder: 850,
        isFavorite: false,
        plannedDate: date,
        repeatType: 'once',
        repeatWeekdays: null,
        isAiSuggested: false,
        sourceAssessmentId: null,
        drillDefinitionId: recommendation.drill_definition_id,
        drillType: recommendation.drill_type,
        inputMode: recommendation.input_mode ?? 'round_three_throw',
        targetType: recommendation.target_type ?? null,
        targetNumbers: recommendation.target_numbers ?? null,
        totalThrows: recommendation.total_throws,
        targetSuccessCount: recommendation.target_success_count ?? null,
        scoringMode: recommendation.scoring_mode,
        markMode: recommendation.mark_mode ?? null,
        sourceType: 'recommended_drill',
        sourceId: recommendation.id,
      },
      false,
    );
    await db.runAsync(
      `UPDATE recommended_drills SET status = 'added', updated_at = ? WHERE id = ?`,
      nowIso(),
      recommendationId,
    );
  }

  async function createCustomDrill(input: CreateCustomDrillInput): Promise<string> {
    const customId = id('customdrill');
    const timestamp = nowIso();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO training_drill_definitions(
          id, drill_type, category, name, purpose, target_type, target_numbers, rounds,
          throws_per_round, total_throws, success_rule, scoring_mode, estimated_minutes,
          target_level_min, target_level_max, is_daily_minimum, is_builtin, can_use_photo,
          can_use_video, difficulty, sort_order, short_description, preparation_json,
          instructions_json, success_condition, finish_condition, input_guide,
          recorded_metrics_json, common_mistakes_json, cautions_json, beginner_tips_json,
          input_mode, mark_mode, target_success_count, completion_rule, created_at, updated_at
        ) VALUES (?, 'custom', ?, ?, ?, 'custom', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 5, 999, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'round_three_throw', 'none', NULL, 'manual', ?, ?)`,
        customId,
        input.category,
        input.name.trim(),
        input.purpose.trim(),
        input.targetNumbers ?? null,
        input.rounds ?? null,
        input.throwsPerRound ?? null,
        input.totalThrows ?? 0,
        input.successRule ?? null,
        input.scoringMode ?? 'hit',
        input.estimatedMinutes ?? 10,
        input.targetLevelMin ?? 'C',
        input.targetLevelMax ?? 'SA',
        toDbBool(input.isDailyMinimum ?? false),
        toDbBool(input.canUsePhoto ?? false),
        toDbBool(input.canUseVideo ?? false),
        input.purpose.trim(),
        JSON.stringify(['狙う場所と入力方法を確認する']),
        JSON.stringify(
          splitInstructionLines(input.instructions ?? input.successRule ?? input.purpose),
        ),
        input.successRule ?? 'ユーザーが設定した条件を満たす',
        input.totalThrows ? `${input.totalThrows}投で終了` : 'ユーザー判断で終了',
        input.inputGuide ?? '3投まとめて入力し、必要に応じて結果を補正します。',
        JSON.stringify(['総投矢数', '命中数', 'メモ']),
        JSON.stringify(['目的を確認しないまま始める']),
        JSON.stringify(['痛みや強い疲労がある場合は中断する']),
        JSON.stringify(['最初は少ない投数で試す']),
        timestamp,
        timestamp,
      );
      if (input.isFavorite) {
        await updateDrillFavorite(customId, true);
      }
    });
    return customId;
  }

  async function updateDrillFavorite(drillDefinitionId: string, favorite: boolean): Promise<void> {
    await db.runAsync(
      `INSERT INTO player_drill_preferences(
        id, account_id, player_id, drill_definition_id, is_favorite, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id, player_id, drill_definition_id) DO UPDATE SET
        is_favorite = excluded.is_favorite,
        updated_at = excluded.updated_at`,
      id('drillpref'),
      DEFAULT_ACCOUNT_ID,
      DEFAULT_PLAYER_ID,
      drillDefinitionId,
      toDbBool(favorite),
      nowIso(),
    );
  }

  async function hideDrillDefinition(drillDefinitionId: string): Promise<void> {
    const definition = await db.getFirstAsync<{ is_builtin: number }>(
      `SELECT is_builtin FROM training_drill_definitions WHERE id = ?`,
      drillDefinitionId,
    );
    if (definition?.is_builtin) {
      throw new Error('ビルトイン練習は削除できません。非表示または複製で調整してください。');
    }
    await db.runAsync(
      `UPDATE training_drill_definitions SET deleted_at = ?, updated_at = ? WHERE id = ?`,
      nowIso(),
      nowIso(),
      drillDefinitionId,
    );
  }

  async function exportBackup(): Promise<string> {
    const tables = [
      'accounts',
      'players',
      'practice_menu_templates',
      'daily_practice_plans',
      'daily_practice_items',
      'practice_sessions',
      'practice_results',
      'form_videos',
      'ai_form_assessments',
      'improvement_issues',
      'improvement_issue_history',
      'practice_recommendations',
      'next_focus_items',
      'player_skill_profiles',
      'player_level_history',
      'level_check_sessions',
      'level_check_results',
      'training_game_sessions',
      'training_rounds',
      'training_throws',
      'board_calibrations',
      'throw_photo_sessions',
      'throw_detection_candidates',
      'confirmed_throw_positions',
      'training_drill_definitions',
      'player_drill_preferences',
      'daily_minimum_plans',
      'daily_minimum_items',
      'drill_sessions',
      'drill_rounds',
      'drill_throw_results',
      'drill_results',
      'drill_target_results',
      'daily_minimum_completion',
      'recommended_drills',
    ];
    const payload: Record<string, unknown> = {
      app: 'DartsSupportApp',
      schemaVersion: 1,
      exportedAt: nowIso(),
      videoPolicy: '動画本体はバックアップ対象外です。form_videos.uri とメタデータのみを含みます。',
      photoPolicy:
        '写真本体はバックアップ対象外です。throw_photo_sessions.original_photo_uri と判定メタデータのみを含みます。',
    };
    for (const table of tables) {
      payload[table] = await db.getAllAsync(`SELECT * FROM ${table}`);
    }
    return JSON.stringify(payload, null, 2);
  }

  async function importBackup(
    jsonText: string,
  ): Promise<{ importedRows: number; skippedTables: string[] }> {
    const payload = JSON.parse(jsonText) as Record<string, unknown>;
    if (payload.app !== 'DartsSupportApp') {
      throw new Error('DartsSupportAppのバックアップJSONではありません。');
    }
    if (typeof payload.schemaVersion === 'number' && payload.schemaVersion > 1) {
      throw new Error(
        'このアプリより新しいバックアップ形式です。アプリ更新後に取り込んでください。',
      );
    }

    const tableColumns: Record<string, string[]> = {
      accounts: ['id', 'display_name', 'status', 'created_at', 'updated_at', 'deleted_at'],
      players: [
        'id',
        'account_id',
        'display_name',
        'handedness',
        'dart_weight_grams',
        'player_type',
        'is_archived',
        'created_at',
        'updated_at',
      ],
      practice_menu_templates: [
        'id',
        'account_id',
        'player_id',
        'title',
        'purpose',
        'target_area',
        'rounds',
        'throws_per_round',
        'sets',
        'target_value',
        'planned_minutes',
        'rest_seconds',
        'focus_note',
        'memo',
        'sort_order',
        'is_favorite',
        'repeat_type',
        'repeat_weekdays',
        'is_ai_suggested',
        'source_assessment_id',
        'schema_version',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      daily_practice_plans: [
        'id',
        'account_id',
        'player_id',
        'practice_date',
        'title',
        'status',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      daily_practice_items: [
        'id',
        'plan_id',
        'account_id',
        'player_id',
        'template_id',
        'title',
        'purpose',
        'target_area',
        'rounds',
        'throws_per_round',
        'sets',
        'target_value',
        'planned_minutes',
        'rest_seconds',
        'focus_note',
        'memo',
        'sort_order',
        'is_favorite',
        'is_ai_suggested',
        'source_assessment_id',
        'drill_definition_id',
        'drill_type',
        'input_mode',
        'target_type',
        'target_numbers',
        'total_throws',
        'target_success_count',
        'scoring_mode',
        'mark_mode',
        'source_type',
        'source_id',
        'status',
        'started_at',
        'completed_at',
        'skipped_at',
        'aborted_at',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      practice_sessions: [
        'id',
        'account_id',
        'player_id',
        'daily_item_id',
        'title_snapshot',
        'status',
        'current_set',
        'current_round',
        'current_throw',
        'elapsed_seconds',
        'undo_snapshot_json',
        'started_at',
        'paused_at',
        'completed_at',
        'aborted_at',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      practice_results: [
        'id',
        'account_id',
        'player_id',
        'practice_session_id',
        'actual_minutes',
        'actual_rounds',
        'actual_sets',
        'total_throws',
        'bull_count',
        'optional_score',
        'achievement_level',
        'condition_label',
        'body_feel',
        'good_points',
        'concern_points',
        'next_focus_note',
        'memo',
        'created_at',
        'updated_at',
      ],
      form_videos: [
        'id',
        'account_id',
        'player_id',
        'practice_session_id',
        'direction',
        'uri',
        'captured_at',
        'duration_ms',
        'file_size_bytes',
        'handedness',
        'dart_weight_grams',
        'memo',
        'is_missing_file',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      ai_form_assessments: [
        'id',
        'account_id',
        'player_id',
        'practice_session_id',
        'form_video_id',
        'raw_text',
        'raw_hash',
        'parsed_json',
        'parse_status',
        'recognized_heading_count',
        'compared_to_assessment_id',
        'user_note',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      improvement_issues: [
        'id',
        'account_id',
        'player_id',
        'title',
        'detail',
        'target_part',
        'status',
        'priority',
        'first_found_date',
        'last_checked_date',
        'resolved_date',
        'source_assessment_id',
        'source_video_id',
        'source_session_id',
        'user_note',
        'next_check_note',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      improvement_issue_history: [
        'id',
        'account_id',
        'player_id',
        'issue_id',
        'assessment_id',
        'previous_status',
        'next_status',
        'note',
        'created_at',
      ],
      practice_recommendations: [
        'id',
        'account_id',
        'player_id',
        'assessment_id',
        'title',
        'detail',
        'status',
        'source_text',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      next_focus_items: [
        'id',
        'account_id',
        'player_id',
        'assessment_id',
        'issue_id',
        'title',
        'priority',
        'status',
        'created_at',
        'updated_at',
        'completed_at',
        'deleted_at',
      ],
      player_skill_profiles: [
        'id',
        'account_id',
        'player_id',
        'current_level',
        'provisional_level',
        'level_started_at',
        'promotion_ready',
        'promotion_test_count',
        'promotion_test_pass_count',
        'last_level_check_at',
        'level_confidence',
        'total_practice_count',
        'created_at',
        'updated_at',
      ],
      player_level_history: [
        'id',
        'account_id',
        'player_id',
        'previous_level',
        'next_level',
        'reason',
        'judgement_json',
        'user_confirmed',
        'created_at',
      ],
      level_check_sessions: [
        'id',
        'account_id',
        'player_id',
        'training_game_session_id',
        'started_level',
        'proposed_level',
        'overall_score',
        'passed',
        'criteria_label',
        'started_at',
        'completed_at',
        'created_at',
        'updated_at',
      ],
      level_check_results: [
        'id',
        'account_id',
        'player_id',
        'level_check_session_id',
        'part_key',
        'part_label',
        'raw_value',
        'normalized_score',
        'weight',
        'created_at',
      ],
      training_game_sessions: [
        'id',
        'account_id',
        'player_id',
        'practice_session_id',
        'daily_item_id',
        'game_type',
        'title',
        'status',
        'current_round',
        'current_throw',
        'bull_mode',
        'out_mode',
        'target_json',
        'summary_json',
        'started_at',
        'completed_at',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      training_rounds: [
        'id',
        'account_id',
        'player_id',
        'game_session_id',
        'round_number',
        'target_number',
        'score',
        'marks',
        'success',
        'created_at',
        'updated_at',
      ],
      training_throws: [
        'id',
        'account_id',
        'player_id',
        'game_session_id',
        'round_id',
        'round_number',
        'throw_number',
        'target_number',
        'segment',
        'multiplier',
        'score',
        'normalized_x',
        'normalized_y',
        'radius',
        'angle',
        'confidence',
        'input_method',
        'is_manual_override',
        'created_at',
        'updated_at',
      ],
      board_calibrations: [
        'id',
        'account_id',
        'player_id',
        'photo_session_id',
        'center_x',
        'center_y',
        'twenty_x',
        'twenty_y',
        'outer_points_json',
        'outer_radius',
        'rotation_degrees',
        'transform_json',
        'created_at',
      ],
      throw_photo_sessions: [
        'id',
        'account_id',
        'player_id',
        'game_session_id',
        'practice_session_id',
        'round_number',
        'original_photo_uri',
        'corrected_photo_uri',
        'calibration_json',
        'auto_candidates_json',
        'confirmed_positions_json',
        'confidence',
        'has_manual_adjustment',
        'status',
        'created_at',
        'updated_at',
      ],
      throw_detection_candidates: [
        'id',
        'account_id',
        'player_id',
        'photo_session_id',
        'candidate_index',
        'normalized_x',
        'normalized_y',
        'radius',
        'angle',
        'segment',
        'multiplier',
        'score',
        'confidence',
        'input_method',
        'accepted',
        'created_at',
      ],
      confirmed_throw_positions: [
        'id',
        'account_id',
        'player_id',
        'photo_session_id',
        'game_session_id',
        'round_number',
        'throw_number',
        'normalized_x',
        'normalized_y',
        'radius',
        'angle',
        'segment',
        'multiplier',
        'score',
        'confidence',
        'input_method',
        'created_at',
      ],
      training_drill_definitions: [
        'id',
        'drill_type',
        'category',
        'name',
        'purpose',
        'target_type',
        'target_numbers',
        'rounds',
        'throws_per_round',
        'total_throws',
        'success_rule',
        'scoring_mode',
        'estimated_minutes',
        'target_level_min',
        'target_level_max',
        'is_daily_minimum',
        'is_builtin',
        'can_use_photo',
        'can_use_video',
        'difficulty',
        'sort_order',
        'is_hidden',
        'short_description',
        'preparation_json',
        'instructions_json',
        'success_condition',
        'finish_condition',
        'input_guide',
        'recorded_metrics_json',
        'common_mistakes_json',
        'cautions_json',
        'beginner_tips_json',
        'input_mode',
        'mark_mode',
        'target_success_count',
        'completion_rule',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      player_drill_preferences: [
        'id',
        'account_id',
        'player_id',
        'drill_definition_id',
        'is_favorite',
        'is_hidden',
        'custom_total_throws',
        'custom_estimated_minutes',
        'include_in_daily_minimum',
        'updated_at',
      ],
      daily_minimum_plans: [
        'id',
        'account_id',
        'player_id',
        'practice_date',
        'level_snapshot',
        'target_minutes',
        'status',
        'total_items',
        'completed_items',
        'total_throws',
        'duration_seconds',
        'created_at',
        'updated_at',
      ],
      daily_minimum_items: [
        'id',
        'account_id',
        'player_id',
        'plan_id',
        'drill_definition_id',
        'name_snapshot',
        'target_throws',
        'estimated_minutes',
        'status',
        'actual_throws',
        'duration_seconds',
        'sort_order',
        'source_reason',
        'started_at',
        'completed_at',
        'created_at',
        'updated_at',
      ],
      drill_sessions: [
        'id',
        'account_id',
        'player_id',
        'drill_definition_id',
        'daily_minimum_item_id',
        'practice_session_id',
        'status',
        'current_round',
        'current_throw',
        'elapsed_seconds',
        'target_number',
        'mode',
        'user_note',
        'undo_snapshot_json',
        'round_input_mode',
        'round_status',
        'intended_target',
        'round_draft_json',
        'completion_rule',
        'completion_target',
        'finish_at_round_end',
        'started_at',
        'paused_at',
        'completed_at',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
      drill_rounds: [
        'id',
        'account_id',
        'player_id',
        'drill_session_id',
        'round_number',
        'target_number',
        'throws',
        'hit_count',
        'mark_count',
        'inner_bull',
        'outer_bull',
        'single_count',
        'double_count',
        'triple_count',
        'created_at',
        'updated_at',
      ],
      drill_throw_results: [
        'id',
        'account_id',
        'player_id',
        'drill_session_id',
        'round_number',
        'throw_number',
        'overall_throw_number',
        'result_type',
        'intended_target',
        'target_number',
        'actual_number',
        'segment',
        'multiplier',
        'score',
        'mark_count',
        'is_hit',
        'is_inner_bull',
        'is_outer_bull',
        'target_hit',
        'catch_hit',
        'input_method',
        'created_at',
      ],
      drill_results: [
        'id',
        'account_id',
        'player_id',
        'drill_session_id',
        'drill_definition_id',
        'total_throws',
        'hit_count',
        'mark_count',
        'success_rate',
        'bull_rate',
        'round_average',
        'inner_bull',
        'outer_bull',
        'single_count',
        'double_count',
        'triple_count',
        'zero_rounds',
        'three_plus_mark_rounds',
        'best_target',
        'weakest_target',
        'longest_streak',
        'longest_miss_streak',
        'grouping_radius',
        'horizontal_spread',
        'vertical_spread',
        'fatigue_drop',
        'feeling_label',
        'tension_label',
        'fatigue_label',
        'note',
        'summary_json',
        'created_at',
        'updated_at',
      ],
      drill_target_results: [
        'id',
        'account_id',
        'player_id',
        'drill_result_id',
        'target_number',
        'throws',
        'hit_count',
        'mark_count',
        'success_rate',
        'created_at',
      ],
      daily_minimum_completion: [
        'id',
        'account_id',
        'player_id',
        'practice_date',
        'completed_items',
        'total_items',
        'completion_rate',
        'total_throws',
        'duration_seconds',
        'achieved',
        'incomplete_items_json',
        'created_at',
        'updated_at',
      ],
      recommended_drills: [
        'id',
        'account_id',
        'player_id',
        'drill_definition_id',
        'practice_date',
        'source_reason',
        'priority',
        'status',
        'time_preset',
        'created_at',
        'updated_at',
        'deleted_at',
      ],
    };

    let importedRows = 0;
    const skippedTables: string[] = [];

    await db.withTransactionAsync(async () => {
      for (const [table, columns] of Object.entries(tableColumns)) {
        const rows = payload[table];
        if (!Array.isArray(rows)) {
          skippedTables.push(table);
          continue;
        }
        for (const row of rows) {
          if (!row || typeof row !== 'object') {
            continue;
          }
          const record = row as Record<string, unknown>;
          const insertColumns = columns.filter((column) => column in record);
          if (insertColumns.length === 0) {
            continue;
          }
          const placeholders = insertColumns.map(() => '?').join(', ');
          await db.runAsync(
            `INSERT OR REPLACE INTO ${table}(${insertColumns.join(', ')}) VALUES (${placeholders})`,
            ...insertColumns.map((column) => record[column] as SQLiteBindValue),
          );
          importedRows += 1;
        }
      }
    });

    return { importedRows, skippedTables };
  }

  return {
    getOrCreatePlan,
    listTodayItems,
    listTemplates,
    addPracticeMenu,
    addTemplateToDate,
    deleteTemplate,
    moveItem,
    startSession,
    updateSessionProgress,
    setItemStatus,
    completeSession,
    savePracticeResult,
    listSessions,
    saveVideo,
    listVideos,
    deleteVideo,
    saveAssessment,
    listAssessments,
    listIssues,
    updateIssueStatus,
    listNextFocus,
    updateNextFocusStatus,
    listRecommendations,
    applyRecommendation,
    updateRecommendationStatus,
    getSkillProfile,
    listLevelHistory,
    recordLevelCheck,
    confirmLevelPromotion,
    listLevelRecommendations,
    startTrainingGame,
    saveTrainingThrows,
    completeTrainingGame,
    listTrainingGames,
    listTrainingThrows,
    saveThrowPhotoSession,
    listThrowPhotoSessions,
    listDrillDefinitions,
    getDrillDefinition,
    getOrCreateDailyMinimumPlan,
    startDrillSession,
    updateDrillSessionProgress,
    recordDrillRound,
    undoLastDrillRound,
    listDrillThrowResults,
    saveDrillResult,
    listDrillSessions,
    listDrillResults,
    generateRecommendedDrills,
    listRecommendedDrills,
    applyRecommendedDrill,
    createCustomDrill,
    updateDrillFavorite,
    hideDrillDefinition,
    exportBackup,
    importBackup,
  };
}

export type SupportRepository = ReturnType<typeof createSupportRepository>;
