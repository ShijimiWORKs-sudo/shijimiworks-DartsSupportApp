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
        sort_order, is_favorite, is_ai_suggested, source_assessment_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    exportBackup,
    importBackup,
  };
}

export type SupportRepository = ReturnType<typeof createSupportRepository>;
