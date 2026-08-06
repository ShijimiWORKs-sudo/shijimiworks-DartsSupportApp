import {
  deriveNextFocusItems,
  derivePracticeRecommendations,
  hashAssessmentRawText,
  parseChatGptAssessment,
} from '../domain/assessment';
import {
  BACKUP_CONTRACT_VERSION,
  createBackupEnvelope,
  parseBackupJson,
  validateBackupPayload,
} from '../domain/backup';
import type {
  AssessmentSections,
  ImprovementIssueStatus,
  NextFocusStatus,
  PracticeItemStatus,
  PracticeMenu,
  PracticeProgress,
  RecommendationStatus,
} from '../domain/types';
import type {
  AssessmentRow,
  DailyPracticeItemRow,
  DailyMinimumBundle,
  DailyMinimumItemRow,
  CreateCustomDrillInput,
  DrillDefinitionRow,
  DrillResultRow,
  DrillSessionRow,
  FormVideoRow,
  ImprovementIssueRow,
  LevelHistoryRow,
  NextFocusRow,
  PracticeResultInput,
  PracticeSessionRow,
  RecommendationRow,
  RecommendedDrillRow,
  SavePhotoSessionInput,
  SaveVideoInput,
  SkillProfileRow,
  StartTrainingGameInput,
  SupportRepository,
  ThrowPhotoSessionRow,
  TrainingGameSessionRow,
  TrainingThrowRow,
} from './repository';
import {
  dailyMinimumForLevel,
  findWeakCricketTarget,
  generateTimePreset,
  getBuiltInDrills,
  isDrillCompletionReached,
  summarizeDailyMinimum,
  summarizeDrillResult,
  summarizeDrillThrows,
  type DrillCategory,
  type DrillResultInput,
  type DrillThrowSummary,
  type DrillThrowResultInput,
  type TimePreset,
} from '../domain/drills';
import {
  TRAINING_GAMES,
  calculateLevelCheckScore,
  confirmPromotion,
  evaluatePromotion,
  initialLevelProfile,
  proposeLevelFromScore,
  recommendMenusForLevel,
  summarizeTrainingGame,
  type TrainingThrowInput,
} from '../domain/training';
import { CURRENT_SCHEMA_VERSION } from './schema';

const accountId = 'local-account';
const playerId = 'owner-player';

type MemoryDrillThrowResult = DrillThrowResultInput & { drillSessionId: string };

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function itemFromMenu(
  menu: PracticeMenu,
  planId: string,
  templateId: string | null,
): DailyPracticeItemRow {
  return {
    ...menu,
    id: id('item'),
    plan_id: planId,
    template_id: templateId,
    status: 'planned',
    started_at: null,
    completed_at: null,
    elapsed_seconds: 0,
  };
}

export function createMemorySupportRepository(): SupportRepository {
  const planId = 'web-preview-plan';
  const items: DailyPracticeItemRow[] = [
    itemFromMenu(
      {
        title: 'ブル練習',
        purpose: 'リリースの再現性確認',
        targetArea: 'BULL',
        rounds: 8,
        throwsPerRound: 3,
        sets: 1,
        targetValue: 'BULL 10本',
        plannedMinutes: 20,
        restSeconds: 60,
        focusNote: '腕を狙った方向へ伸ばす',
        memo: null,
        sortOrder: 1,
        isFavorite: true,
        plannedDate: todayIso(),
        repeatType: 'once',
        repeatWeekdays: null,
        isAiSuggested: false,
        sourceAssessmentId: null,
        drillDefinitionId: null,
        drillType: null,
        inputMode: null,
        targetType: null,
        targetNumbers: null,
        totalThrows: null,
        targetSuccessCount: null,
        scoringMode: null,
        markMode: null,
        sourceType: null,
        sourceId: null,
      },
      planId,
      null,
    ),
  ];
  const templates: DailyPracticeItemRow[] = [];
  const sessions: PracticeSessionRow[] = [];
  const videos: FormVideoRow[] = [];
  const assessments: AssessmentRow[] = [];
  const issues: ImprovementIssueRow[] = [];
  const focusItems: NextFocusRow[] = [];
  const recommendations: RecommendationRow[] = [];
  const initialProfile = initialLevelProfile();
  const skillProfile: SkillProfileRow = {
    id: 'skill-owner-player',
    current_level: initialProfile.currentLevel,
    provisional_level: initialProfile.provisionalLevel,
    level_started_at: nowIso(),
    promotion_ready: 0,
    promotion_test_count: 0,
    promotion_test_pass_count: 0,
    last_level_check_at: null,
    level_confidence: 0,
    total_practice_count: 0,
  };
  const levelHistory: LevelHistoryRow[] = [];
  const trainingGames: TrainingGameSessionRow[] = [];
  const trainingThrows: TrainingThrowRow[] = [];
  const photoSessions: ThrowPhotoSessionRow[] = [];
  const drillDefinitions: DrillDefinitionRow[] = getBuiltInDrills().map((drill) => ({
    id: drill.id,
    drill_type: drill.type,
    category: drill.category,
    name: drill.name,
    purpose: drill.purpose,
    target_numbers: JSON.stringify(drill.targetNumbers),
    rounds: drill.rounds,
    throws_per_round: drill.throwsPerRound,
    total_throws: drill.totalThrows,
    success_rule: drill.successRule,
    scoring_mode: drill.scoringMode,
    estimated_minutes: drill.estimatedMinutes,
    target_level_min: drill.targetLevelMin,
    target_level_max: drill.targetLevelMax,
    is_daily_minimum: drill.isDailyMinimum ? 1 : 0,
    is_builtin: 1,
    can_use_photo: drill.canUsePhoto ? 1 : 0,
    can_use_video: drill.canUseVideo ? 1 : 0,
    difficulty: drill.difficulty,
    sort_order: drill.sortOrder,
    is_favorite: 0,
    short_description: drill.instructions.shortDescription,
    preparation_json: JSON.stringify(drill.instructions.preparation),
    instructions_json: JSON.stringify(drill.instructions.instructions),
    success_condition: drill.instructions.successCondition,
    finish_condition: drill.instructions.finishCondition,
    input_guide: drill.instructions.inputGuide,
    recorded_metrics_json: JSON.stringify(drill.instructions.recordedMetrics),
    common_mistakes_json: JSON.stringify(drill.instructions.commonMistakes),
    cautions_json: JSON.stringify(drill.instructions.cautions),
    beginner_tips_json: JSON.stringify(drill.instructions.beginnerTips),
    input_mode: drill.inputMode,
    mark_mode: drill.markMode,
    target_success_count: drill.targetSuccessCount,
    completion_rule: drill.completionRule,
  }));
  const dailyMinimumPlans: DailyMinimumBundle[] = [];
  const drillSessions: DrillSessionRow[] = [];
  const drillThrowResults: MemoryDrillThrowResult[] = [];
  const drillResults: DrillResultRow[] = [];
  const recommendedDrills: RecommendedDrillRow[] = [];

  function parseTargets(value: string | null | undefined): (number | 'BULL' | string)[] {
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

  function upsertMemoryDrillResult(session: DrillSessionRow, summary: DrillThrowSummary) {
    const existing = drillResults.find((candidate) => candidate.drill_session_id === session.id);
    const result: DrillResultRow = {
      id: existing?.id ?? id('drillresult'),
      drill_session_id: session.id,
      drill_definition_id: session.drill_definition_id,
      total_throws: summary.totalThrows,
      hit_count: summary.hitCount,
      mark_count: summary.markCount,
      success_rate: summary.totalThrows ? summary.hitCount / summary.totalThrows : 0,
      bull_rate: summary.bullRate,
      round_average: Math.ceil(summary.totalThrows / 3)
        ? summary.markCount / Math.ceil(summary.totalThrows / 3)
        : 0,
      best_target:
        Object.entries(summary.targetProgress).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      weakest_target:
        Object.entries(summary.targetProgress).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null,
      summary_json: JSON.stringify(summary),
      created_at: nowIso(),
    };
    if (existing) {
      Object.assign(existing, result);
    } else {
      drillResults.unshift(result);
    }
  }

  const repo: SupportRepository = {
    async getOrCreatePlan() {
      return planId;
    },
    async listTodayItems() {
      return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async listTemplates() {
      return [...templates];
    },
    async addPracticeMenu(menu, saveAsTemplate) {
      const templateId = saveAsTemplate ? id('tmpl') : null;
      const item = itemFromMenu(menu, planId, templateId);
      items.push(item);
      if (saveAsTemplate) {
        templates.push({ ...item, id: templateId as string, template_id: null });
      }
      return templateId ?? '';
    },
    async addTemplateToDate(templateId, date) {
      const template = templates.find((candidate) => candidate.id === templateId);
      if (template) {
        items.push(itemFromMenu({ ...template, plannedDate: date }, planId, templateId));
      }
    },
    async deleteTemplate(templateId) {
      const index = templates.findIndex((template) => template.id === templateId);
      if (index >= 0) {
        templates.splice(index, 1);
      }
    },
    async moveItem(itemId, direction) {
      const index = items.findIndex((item) => item.id === itemId);
      const other = items[index + direction];
      const item = items[index];
      if (item && other) {
        const order = item.sortOrder;
        item.sortOrder = other.sortOrder;
        other.sortOrder = order;
      }
    },
    async startSession(item) {
      const existing = sessions.find((session) => session.daily_item_id === item.id);
      if (existing) {
        existing.status = 'in_progress';
        return existing.id;
      }
      const timestamp = nowIso();
      const session: PracticeSessionRow = {
        id: id('sess'),
        daily_item_id: item.id,
        title_snapshot: item.title,
        status: 'in_progress',
        current_set: 1,
        current_round: 1,
        current_throw: 0,
        elapsed_seconds: 0,
        undo_snapshot_json: null,
        started_at: timestamp,
        paused_at: null,
        completed_at: null,
      };
      sessions.unshift(session);
      item.status = 'in_progress';
      item.started_at = timestamp;
      return session.id;
    },
    async updateSessionProgress(sessionId, progress: PracticeProgress) {
      const session = sessions.find((candidate) => candidate.id === sessionId);
      if (session) {
        session.current_set = progress.currentSet;
        session.current_round = progress.currentRound;
        session.current_throw = progress.currentThrow;
        session.elapsed_seconds = progress.elapsedSeconds;
        session.status = progress.status;
        session.undo_snapshot_json = progress.undoSnapshot
          ? JSON.stringify(progress.undoSnapshot)
          : null;
      }
    },
    async setItemStatus(itemId, status: PracticeItemStatus) {
      const item = items.find((candidate) => candidate.id === itemId);
      if (item) {
        item.status = status;
        item.completed_at = status === 'completed' ? nowIso() : item.completed_at;
      }
    },
    async completeSession(sessionId, itemId) {
      const session = sessions.find((candidate) => candidate.id === sessionId);
      if (session) {
        session.status = 'completed';
        session.completed_at = nowIso();
      }
      if (itemId) {
        await repo.setItemStatus(itemId, 'completed');
      }
    },
    async savePracticeResult(_input: PracticeResultInput) {},
    async listSessions() {
      return [...sessions];
    },
    async saveVideo(input: SaveVideoInput) {
      const videoId = id('video');
      videos.unshift({
        id: videoId,
        practice_session_id: input.practiceSessionId ?? null,
        direction: input.direction,
        uri: input.uri,
        captured_at: nowIso(),
        duration_ms: input.durationMs ?? null,
        file_size_bytes: input.fileSizeBytes ?? null,
        handedness: input.handedness ?? null,
        dart_weight_grams: input.dartWeightGrams ?? null,
        memo: input.memo ?? null,
        is_missing_file: 0,
        created_at: nowIso(),
      });
      return videoId;
    },
    async listVideos() {
      return [...videos];
    },
    async deleteVideo(videoId) {
      const index = videos.findIndex((video) => video.id === videoId);
      if (index >= 0) {
        videos.splice(index, 1);
      }
    },
    async saveAssessment(rawText, sections: AssessmentSections, practiceSessionId, formVideoId) {
      const rawHash = hashAssessmentRawText(rawText);
      const duplicate = assessments.find(
        (assessment) =>
          assessment.practice_session_id === practiceSessionId && assessment.raw_hash === rawHash,
      );
      if (duplicate) {
        return { id: duplicate.id, duplicate: true, parseStatus: 'duplicate' };
      }
      const parsed = parseChatGptAssessment(rawText);
      const assessmentId = id('assess');
      assessments.unshift({
        id: assessmentId,
        practice_session_id: practiceSessionId,
        form_video_id: formVideoId,
        raw_text: rawText,
        raw_hash: rawHash,
        parsed_json: JSON.stringify(sections),
        parse_status: parsed.hasRecognizedHeading ? 'parsed' : 'raw_only',
        recognized_heading_count: parsed.recognizedCount,
        compared_to_assessment_id: assessments[0]?.id ?? null,
        user_note: null,
        created_at: nowIso(),
      });
      deriveNextFocusItems(sections).forEach((title, index) => {
        focusItems.unshift({
          id: id('focus'),
          assessment_id: assessmentId,
          issue_id: null,
          title,
          priority: index + 1,
          status: 'active',
          created_at: nowIso(),
        });
        issues.unshift({
          id: id('issue'),
          title,
          detail: sections.improvementPoints || null,
          target_part: 'その他',
          status: 'NEW',
          priority: 2,
          first_found_date: todayIso(),
          last_checked_date: todayIso(),
          resolved_date: null,
          source_assessment_id: assessmentId,
          user_note: null,
          next_check_note: title,
        });
      });
      derivePracticeRecommendations(sections).forEach((title) => {
        recommendations.unshift({
          id: id('rec'),
          assessment_id: assessmentId,
          title,
          detail: sections.recommendedPractice,
          status: 'candidate',
          source_text: sections.recommendedPractice,
        });
      });
      return {
        id: assessmentId,
        duplicate: false,
        parseStatus: parsed.hasRecognizedHeading ? 'parsed' : 'raw_only',
      };
    },
    async listAssessments() {
      return [...assessments];
    },
    async listIssues() {
      return [...issues];
    },
    async updateIssueStatus(issueId, status: ImprovementIssueStatus) {
      const issue = issues.find((candidate) => candidate.id === issueId);
      if (issue) {
        issue.status = status;
        issue.resolved_date = status === 'RESOLVED' ? todayIso() : issue.resolved_date;
      }
    },
    async listNextFocus() {
      return [...focusItems];
    },
    async updateNextFocusStatus(focusId, status: NextFocusStatus) {
      const focus = focusItems.find((candidate) => candidate.id === focusId);
      if (focus) {
        focus.status = status;
      }
    },
    async listRecommendations() {
      return [...recommendations];
    },
    async applyRecommendation(recommendation, date, saveAsTemplate) {
      await repo.addPracticeMenu(
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
      recommendation.status = saveAsTemplate ? 'saved_template' : 'added';
    },
    async updateRecommendationStatus(recommendationId, status: RecommendationStatus) {
      const recommendation = recommendations.find((candidate) => candidate.id === recommendationId);
      if (recommendation) {
        recommendation.status = status;
      }
    },
    async getSkillProfile() {
      return { ...skillProfile };
    },
    async listLevelHistory() {
      return [...levelHistory];
    },
    async recordLevelCheck(parts) {
      const overallScore = calculateLevelCheckScore(parts);
      const proposedLevel = proposeLevelFromScore(overallScore);
      const passed = proposedLevel !== skillProfile.current_level;
      const evaluated = evaluatePromotion(
        {
          currentLevel: skillProfile.current_level,
          provisionalLevel: skillProfile.provisional_level,
          promotionReady: skillProfile.promotion_ready === 1,
          promotionTestCount: skillProfile.promotion_test_count,
          promotionTestPassCount: skillProfile.promotion_test_pass_count,
          levelConfidence: skillProfile.level_confidence,
          totalPracticeCount: skillProfile.total_practice_count,
        },
        passed,
      );
      skillProfile.provisional_level = evaluated.provisionalLevel;
      skillProfile.promotion_ready = evaluated.promotionReady ? 1 : 0;
      skillProfile.promotion_test_count = evaluated.promotionTestCount;
      skillProfile.promotion_test_pass_count = evaluated.promotionTestPassCount;
      skillProfile.level_confidence = overallScore;
      skillProfile.total_practice_count += 1;
      skillProfile.last_level_check_at = nowIso();
      return { id: id('levelcheck'), overallScore, proposedLevel, passed };
    },
    async confirmLevelPromotion() {
      const promoted = confirmPromotion({
        currentLevel: skillProfile.current_level,
        provisionalLevel: skillProfile.provisional_level,
        promotionReady: skillProfile.promotion_ready === 1,
        promotionTestCount: skillProfile.promotion_test_count,
        promotionTestPassCount: skillProfile.promotion_test_pass_count,
        levelConfidence: skillProfile.level_confidence,
        totalPracticeCount: skillProfile.total_practice_count,
      });
      if (promoted.currentLevel !== skillProfile.current_level) {
        levelHistory.unshift({
          id: id('levelhist'),
          previous_level: skillProfile.current_level,
          next_level: promoted.currentLevel,
          reason: 'レベルチェック3回中2回合格後のユーザー確認',
          judgement_json: JSON.stringify({ criteria: 'DartsSupportApp独自基準' }),
          user_confirmed: 1,
          created_at: nowIso(),
        });
      }
      skillProfile.current_level = promoted.currentLevel;
      skillProfile.provisional_level = promoted.provisionalLevel;
      skillProfile.promotion_ready = promoted.promotionReady ? 1 : 0;
      skillProfile.promotion_test_count = promoted.promotionTestCount;
      skillProfile.promotion_test_pass_count = promoted.promotionTestPassCount;
      skillProfile.level_started_at = nowIso();
    },
    async listLevelRecommendations(date) {
      return recommendMenusForLevel(skillProfile.current_level, date);
    },
    async startTrainingGame(input: StartTrainingGameInput) {
      const definition = TRAINING_GAMES.find((game) => game.type === input.gameType);
      const gameId = id('game');
      trainingGames.unshift({
        id: gameId,
        practice_session_id: input.practiceSessionId ?? null,
        daily_item_id: input.dailyItemId ?? null,
        game_type: input.gameType,
        title: definition?.title ?? input.gameType,
        status: 'in_progress',
        current_round: 1,
        current_throw: 0,
        bull_mode: input.bullMode ?? null,
        out_mode: input.outMode ?? null,
        target_json: input.targetJson ?? null,
        summary_json: null,
        started_at: nowIso(),
        completed_at: null,
        created_at: nowIso(),
      });
      return gameId;
    },
    async saveTrainingThrows(gameSessionId, throws: TrainingThrowInput[]) {
      for (const dart of throws) {
        trainingThrows.push({
          id: id('throw'),
          game_session_id: gameSessionId,
          round_number: dart.roundNumber,
          throw_number: dart.throwNumber,
          target_number: dart.targetNumber == null ? null : String(dart.targetNumber),
          segment: dart.segment == null ? null : String(dart.segment),
          multiplier: dart.multiplier ?? 0,
          score: dart.score,
          normalized_x: dart.x ?? null,
          normalized_y: dart.y ?? null,
          radius: dart.radius ?? null,
          angle: dart.angle ?? null,
          confidence: dart.confidence ?? 1,
          input_method: dart.inputMethod,
          is_manual_override: dart.isManualOverride ? 1 : 0,
          created_at: nowIso(),
        });
      }
      const game = trainingGames.find((candidate) => candidate.id === gameSessionId);
      if (game) {
        const sessionThrows: TrainingThrowInput[] = trainingThrows
          .filter((candidate) => candidate.game_session_id === gameSessionId)
          .map((row) => ({
            roundNumber: row.round_number,
            throwNumber: row.throw_number,
            targetNumber:
              row.target_number === 'BULL'
                ? 'BULL'
                : row.target_number
                  ? Number(row.target_number)
                  : null,
            segment:
              row.segment === 'BULL' || row.segment === 'OUT'
                ? row.segment
                : row.segment
                  ? Number(row.segment)
                  : null,
            multiplier: row.multiplier as 0 | 1 | 2 | 3,
            score: row.score,
            radius: row.radius,
            inputMethod: row.input_method as TrainingThrowInput['inputMethod'],
          }));
        game.summary_json = JSON.stringify(summarizeTrainingGame(game.game_type, sessionThrows));
      }
    },
    async completeTrainingGame(gameSessionId) {
      const game = trainingGames.find((candidate) => candidate.id === gameSessionId);
      if (game) {
        game.status = 'completed';
        game.completed_at = nowIso();
      }
    },
    async listTrainingGames() {
      return [...trainingGames];
    },
    async listTrainingThrows(gameSessionId) {
      return trainingThrows.filter((dart) => dart.game_session_id === gameSessionId);
    },
    async saveThrowPhotoSession(input: SavePhotoSessionInput) {
      const photoId = id('photo');
      const averageConfidence = input.confirmedPositions.length
        ? input.confirmedPositions.reduce((sum, dart) => sum + dart.confidence, 0) /
          input.confirmedPositions.length
        : 0;
      photoSessions.unshift({
        id: photoId,
        game_session_id: input.gameSessionId ?? null,
        practice_session_id: input.practiceSessionId ?? null,
        round_number: input.roundNumber,
        original_photo_uri: input.originalPhotoUri,
        corrected_photo_uri: input.correctedPhotoUri ?? null,
        calibration_json: JSON.stringify(input.calibration),
        auto_candidates_json: JSON.stringify(input.autoCandidates),
        confirmed_positions_json: JSON.stringify(input.confirmedPositions),
        confidence: averageConfidence,
        has_manual_adjustment: input.hasManualAdjustment ? 1 : 0,
        status: 'confirmed',
        created_at: nowIso(),
      });
      if (input.gameSessionId) {
        await repo.saveTrainingThrows(
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
      return photoId;
    },
    async listThrowPhotoSessions() {
      return [...photoSessions];
    },
    async listDrillDefinitions(category?: DrillCategory) {
      return drillDefinitions
        .filter((drill) => !category || drill.category === category)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
    async getDrillDefinition(drillDefinitionId) {
      return drillDefinitions.find((definition) => definition.id === drillDefinitionId) ?? null;
    },
    async getOrCreateDailyMinimumPlan(date): Promise<DailyMinimumBundle> {
      const existing = dailyMinimumPlans.find((plan) => plan.plan.practice_date === date);
      if (existing) {
        return existing;
      }
      const definitions = dailyMinimumForLevel(skillProfile.current_level);
      const planId = id('dailymin');
      const items: DailyMinimumItemRow[] = definitions.map((drill, index) => ({
        id: id('dailyitem'),
        plan_id: planId,
        drill_definition_id: drill.id,
        name_snapshot: drill.name,
        target_throws: drill.totalThrows,
        estimated_minutes: drill.estimatedMinutes,
        status: 'planned',
        actual_throws: 0,
        duration_seconds: 0,
        sort_order: index,
        source_reason: `${skillProfile.current_level}レベルのデイリーミニマム`,
      }));
      const plan = {
        id: planId,
        practice_date: date,
        level_snapshot: skillProfile.current_level,
        target_minutes: definitions.reduce((sum, drill) => sum + drill.estimatedMinutes, 0),
        status: 'planned',
        total_items: items.length,
        completed_items: 0,
        total_throws: 0,
        duration_seconds: 0,
      };
      const bundle: DailyMinimumBundle = {
        plan,
        items,
        summary: summarizeDailyMinimum(
          items.map((item) => ({
            name: item.name_snapshot,
            completed: item.status === 'completed',
            totalThrows: item.actual_throws,
            durationSeconds: item.duration_seconds,
          })),
        ),
      };
      dailyMinimumPlans.push(bundle);
      return bundle;
    },
    async startDrillSession(drillDefinitionId, dailyMinimumItemId) {
      const sessionId = id('drillsess');
      drillSessions.unshift({
        id: sessionId,
        drill_definition_id: drillDefinitionId,
        daily_minimum_item_id: dailyMinimumItemId ?? null,
        status: 'in_progress',
        current_round: 1,
        current_throw: 0,
        elapsed_seconds: 0,
        target_number: null,
        mode: null,
        round_input_mode: 'round_three_throw',
        round_status: 'idle',
        intended_target: null,
        round_draft_json: null,
        completion_rule:
          drillDefinitions.find((definition) => definition.id === drillDefinitionId)
            ?.completion_rule ?? null,
        completion_target:
          drillDefinitions.find((definition) => definition.id === drillDefinitionId)
            ?.target_success_count ?? null,
        finish_at_round_end: 1,
        started_at: nowIso(),
        paused_at: null,
        completed_at: null,
      });
      for (const bundle of dailyMinimumPlans) {
        const item = bundle.items.find((candidate) => candidate.id === dailyMinimumItemId);
        if (item) {
          item.status = 'in_progress';
        }
      }
      return sessionId;
    },
    async updateDrillSessionProgress(
      drillSessionId,
      status,
      currentRound,
      currentThrow,
      elapsedSeconds,
    ) {
      const session = drillSessions.find((candidate) => candidate.id === drillSessionId);
      if (session) {
        session.status = status;
        session.current_round = currentRound;
        session.current_throw = currentThrow;
        session.elapsed_seconds = elapsedSeconds;
        session.paused_at = status === 'paused' ? nowIso() : session.paused_at;
        session.completed_at = status === 'completed' ? nowIso() : session.completed_at;
      }
    },
    async recordDrillRound(drillSessionId, throws) {
      if (throws.length === 0 || throws.length > 3) {
        throw new Error('ラウンドは1～3投で確定してください。');
      }
      const session = drillSessions.find((candidate) => candidate.id === drillSessionId);
      if (!session) {
        throw new Error('ドリルセッションが見つかりません。');
      }
      const definition = drillDefinitions.find(
        (candidate) => candidate.id === session.drill_definition_id,
      );
      if (!definition) {
        throw new Error('ドリル定義が見つかりません。');
      }
      const roundNumber = throws[0]?.roundNumber ?? session.current_round;
      for (let index = drillThrowResults.length - 1; index >= 0; index -= 1) {
        const throwResult = drillThrowResults[index];
        if (!throwResult) {
          continue;
        }
        if (
          throwResult.drillSessionId === drillSessionId &&
          throwResult.roundNumber === roundNumber
        ) {
          drillThrowResults.splice(index, 1);
        }
      }
      drillThrowResults.push(...throws.map((throwResult) => ({ ...throwResult, drillSessionId })));
      const sessionThrows = drillThrowResults.filter(
        (throwResult) => throwResult.drillSessionId === drillSessionId,
      );
      const summary = summarizeDrillThrows(sessionThrows);
      const targets = parseTargets(definition.target_numbers);
      const completed = isDrillCompletionReached(
        {
          completionRule: definition.completion_rule as never,
          targetSuccessCount: definition.target_success_count ?? null,
          totalThrows: definition.total_throws,
          targetNumbers: targets,
        },
        summary,
      );
      session.current_round = Math.floor(summary.totalThrows / 3) + 1;
      session.current_throw = summary.totalThrows % 3;
      session.status = completed ? 'completed' : 'in_progress';
      session.completed_at = completed ? nowIso() : null;
      upsertMemoryDrillResult(session, summary);
    },
    async undoLastDrillRound(drillSessionId) {
      const session = drillSessions.find((candidate) => candidate.id === drillSessionId);
      if (!session) {
        return;
      }
      const sessionThrows = drillThrowResults.filter(
        (throwResult) => throwResult.drillSessionId === drillSessionId,
      );
      const latestRound = Math.max(
        ...sessionThrows.map((throwResult) => throwResult.roundNumber),
        0,
      );
      for (let index = drillThrowResults.length - 1; index >= 0; index -= 1) {
        const throwResult = drillThrowResults[index];
        if (!throwResult) {
          continue;
        }
        if (
          throwResult.drillSessionId === drillSessionId &&
          throwResult.roundNumber === latestRound
        ) {
          drillThrowResults.splice(index, 1);
        }
      }
      const summary = summarizeDrillThrows(
        drillThrowResults.filter((throwResult) => throwResult.drillSessionId === drillSessionId),
      );
      session.current_round = Math.floor(summary.totalThrows / 3) + 1;
      session.current_throw = summary.totalThrows % 3;
      session.status = 'in_progress';
      session.completed_at = null;
      upsertMemoryDrillResult(session, summary);
    },
    async listDrillThrowResults(drillSessionId) {
      return drillThrowResults
        .filter((throwResult) => throwResult.drillSessionId === drillSessionId)
        .map((throwResult) => ({
          id: `${drillSessionId}-${throwResult.overallThrowNumber}`,
          drill_session_id: drillSessionId,
          round_number: throwResult.roundNumber,
          throw_number: throwResult.throwNumber,
          overall_throw_number: throwResult.overallThrowNumber,
          result_type: throwResult.resultType,
          intended_target: String(throwResult.intendedTarget ?? ''),
          target_number: String(throwResult.targetNumber ?? ''),
          actual_number: throwResult.actualNumber ? String(throwResult.actualNumber) : null,
          segment: throwResult.segment ?? null,
          multiplier: throwResult.multiplier,
          score: throwResult.score,
          mark_count: throwResult.markCount,
          is_hit: throwResult.isHit ? 1 : 0,
          is_inner_bull: throwResult.isInnerBull ? 1 : 0,
          is_outer_bull: throwResult.isOuterBull ? 1 : 0,
          target_hit: throwResult.targetHit ? 1 : 0,
          catch_hit: throwResult.catchHit ? 1 : 0,
          input_method: throwResult.inputMethod,
          created_at: nowIso(),
        }));
    },
    async saveDrillResult(drillSessionId, input: DrillResultInput) {
      const session = drillSessions.find((candidate) => candidate.id === drillSessionId);
      if (!session) {
        throw new Error('ドリルセッションが見つかりません。');
      }
      const summary = summarizeDrillResult(input);
      const existing = drillResults.find(
        (candidate) => candidate.drill_session_id === drillSessionId,
      );
      const result: DrillResultRow = {
        id: existing?.id ?? id('drillresult'),
        drill_session_id: drillSessionId,
        drill_definition_id: session.drill_definition_id,
        total_throws: summary.totalThrows,
        hit_count: summary.hitCount,
        mark_count: summary.markCount,
        success_rate: summary.successRate,
        bull_rate: summary.bullRate,
        round_average: summary.roundAverage,
        best_target: summary.bestTarget,
        weakest_target: summary.weakestTarget,
        summary_json: JSON.stringify(summary),
        created_at: nowIso(),
      };
      if (existing) {
        Object.assign(existing, result);
      } else {
        drillResults.unshift(result);
      }
      session.status = 'completed';
      session.completed_at = nowIso();
      for (const bundle of dailyMinimumPlans) {
        const item = bundle.items.find(
          (candidate) => candidate.id === session.daily_minimum_item_id,
        );
        if (item) {
          item.status = 'completed';
          item.actual_throws = summary.totalThrows;
          item.duration_seconds = input.durationSeconds ?? session.elapsed_seconds;
          bundle.summary = summarizeDailyMinimum(
            bundle.items.map((candidate) => ({
              name: candidate.name_snapshot,
              completed: candidate.status === 'completed',
              totalThrows: candidate.actual_throws,
              durationSeconds: candidate.duration_seconds,
            })),
          );
        }
      }
    },
    async listDrillSessions() {
      return [...drillSessions];
    },
    async listDrillResults() {
      return [...drillResults];
    },
    async generateRecommendedDrills(date, preset: TimePreset) {
      const definitions = generateTimePreset(skillProfile.current_level, preset);
      const weak = findWeakCricketTarget(
        drillResults
          .filter((result) => result.weakest_target)
          .map((result) => ({
            targetNumber: Number(result.weakest_target) || 'BULL',
            averageMarks: result.round_average,
            samples: 2,
          })),
      );
      definitions.forEach((definition, index) => {
        recommendedDrills.unshift({
          id: id('recdrill'),
          drill_definition_id: definition.id,
          practice_date: date,
          source_reason: `${skillProfile.current_level}レベルと${preset}分プリセットに基づく候補です。ユーザー確認まで予定には追加しません。`,
          priority: index + 1,
          status: 'candidate',
          time_preset: preset,
          name: definition.name,
        });
      });
      recommendedDrills.unshift({
        id: id('recdrill'),
        drill_definition_id: 'weak_cricket_number',
        practice_date: date,
        source_reason: weak.reason,
        priority: definitions.length + 1,
        status: 'candidate',
        time_preset: preset,
        name: '苦手ナンバー集中',
      });
    },
    async listRecommendedDrills(date) {
      return recommendedDrills.filter((recommendation) => recommendation.practice_date === date);
    },
    async applyRecommendedDrill(recommendationId, date) {
      const recommendation = recommendedDrills.find(
        (candidate) => candidate.id === recommendationId,
      );
      if (!recommendation) {
        return;
      }
      await repo.addPracticeMenu(
        {
          title: recommendation.name ?? 'おすすめドリル',
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
          drillType:
            drillDefinitions.find(
              (definition) => definition.id === recommendation.drill_definition_id,
            )?.drill_type ?? null,
          inputMode: 'round_three_throw',
          targetType: 'number',
          targetNumbers:
            drillDefinitions.find(
              (definition) => definition.id === recommendation.drill_definition_id,
            )?.target_numbers ?? null,
          totalThrows:
            drillDefinitions.find(
              (definition) => definition.id === recommendation.drill_definition_id,
            )?.total_throws ?? null,
          targetSuccessCount:
            drillDefinitions.find(
              (definition) => definition.id === recommendation.drill_definition_id,
            )?.target_success_count ?? null,
          scoringMode:
            drillDefinitions.find(
              (definition) => definition.id === recommendation.drill_definition_id,
            )?.scoring_mode ?? null,
          markMode:
            drillDefinitions.find(
              (definition) => definition.id === recommendation.drill_definition_id,
            )?.mark_mode ?? null,
          sourceType: 'recommended_drill',
          sourceId: recommendation.id,
        },
        false,
      );
      recommendation.status = 'added';
    },
    async createCustomDrill(input: CreateCustomDrillInput) {
      const customId = id('customdrill');
      drillDefinitions.push({
        id: customId,
        drill_type: 'custom',
        category: input.category,
        name: input.name,
        purpose: input.purpose,
        target_numbers: input.targetNumbers ?? null,
        rounds: input.rounds ?? null,
        throws_per_round: input.throwsPerRound ?? null,
        total_throws: input.totalThrows ?? 0,
        success_rule: input.successRule ?? null,
        scoring_mode: input.scoringMode ?? 'hit',
        estimated_minutes: input.estimatedMinutes ?? 10,
        target_level_min: input.targetLevelMin ?? 'C',
        target_level_max: input.targetLevelMax ?? 'SA',
        is_daily_minimum: input.isDailyMinimum ? 1 : 0,
        is_builtin: 0,
        can_use_photo: input.canUsePhoto ? 1 : 0,
        can_use_video: input.canUseVideo ? 1 : 0,
        difficulty: 5,
        sort_order: 999,
        is_favorite: input.isFavorite ? 1 : 0,
        short_description: input.purpose,
        preparation_json: JSON.stringify(['狙う場所と入力方法を確認する']),
        instructions_json: JSON.stringify(
          (input.instructions ?? input.successRule ?? input.purpose)
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
        ),
        success_condition: input.successRule ?? 'ユーザーが設定した条件を満たす',
        finish_condition: input.totalThrows ? `${input.totalThrows}投で終了` : 'ユーザー判断で終了',
        input_guide: input.inputGuide ?? '3投まとめて入力し、必要に応じて結果を補正します。',
        recorded_metrics_json: JSON.stringify(['総投矢数', '命中数', 'メモ']),
        common_mistakes_json: JSON.stringify(['目的を確認しないまま始める']),
        cautions_json: JSON.stringify(['痛みや強い疲労がある場合は中断する']),
        beginner_tips_json: JSON.stringify(['最初は少ない投数で試す']),
        input_mode: 'round_three_throw',
        mark_mode: 'none',
        target_success_count: null,
        completion_rule: 'manual',
      });
      return customId;
    },
    async updateDrillFavorite(drillDefinitionId, favorite) {
      const definition = drillDefinitions.find((candidate) => candidate.id === drillDefinitionId);
      if (definition) {
        definition.is_favorite = favorite ? 1 : 0;
      }
    },
    async hideDrillDefinition(drillDefinitionId) {
      const definition = drillDefinitions.find((candidate) => candidate.id === drillDefinitionId);
      if (definition?.is_builtin) {
        throw new Error('ビルトイン練習は削除できません。');
      }
      const index = drillDefinitions.findIndex((candidate) => candidate.id === drillDefinitionId);
      if (index >= 0) {
        drillDefinitions.splice(index, 1);
      }
    },
    async exportBackup() {
      const exportedAt = nowIso();
      const payload = {
        accounts: [{ id: accountId }],
        players: [{ id: playerId, account_id: accountId }],
        daily_practice_items: items,
        form_videos: videos,
        ai_form_assessments: assessments,
        improvement_issues: issues,
        practice_recommendations: recommendations,
        next_focus_items: focusItems,
        player_skill_profiles: [skillProfile],
        player_level_history: levelHistory,
        training_game_sessions: trainingGames,
        training_throws: trainingThrows,
        throw_photo_sessions: photoSessions,
        training_drill_definitions: drillDefinitions,
        daily_minimum_plans: dailyMinimumPlans.map((bundle) => bundle.plan),
        daily_minimum_items: dailyMinimumPlans.flatMap((bundle) => bundle.items),
        drill_sessions: drillSessions,
        drill_throw_results: drillThrowResults,
        drill_results: drillResults,
        recommended_drills: recommendedDrills,
      };
      return JSON.stringify(
        {
          ...payload,
          ...createBackupEnvelope({
            payload,
            currentSchemaVersion: CURRENT_SCHEMA_VERSION,
            exportedAt,
            deviceType: 'unknown',
          }),
        },
        null,
        2,
      );
    },
    async importBackup(jsonText) {
      const payload = parseBackupJson(jsonText);
      validateBackupPayload(payload, CURRENT_SCHEMA_VERSION);
      return {
        importedRows: 0,
        skippedTables: [],
        addedRows: 0,
        updatedRows: 0,
        skippedRows: BACKUP_CONTRACT_VERSION === 2 ? 0 : 0,
        errorRows: 0,
      };
    },
  };

  return repo;
}
