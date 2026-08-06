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
} from '../domain/types';
import type {
  AssessmentRow,
  DailyPracticeItemRow,
  FormVideoRow,
  ImprovementIssueRow,
  LevelHistoryRow,
  NextFocusRow,
  PracticeResultInput,
  PracticeSessionRow,
  RecommendationRow,
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

const accountId = 'local-account';
const playerId = 'owner-player';

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
    async exportBackup() {
      return JSON.stringify(
        {
          app: 'DartsSupportApp',
          schemaVersion: 1,
          exportedAt: nowIso(),
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
          videoPolicy: '動画本体は含めません。',
          photoPolicy: '写真本体は含めません。',
        },
        null,
        2,
      );
    },
    async importBackup() {
      return { importedRows: 0, skippedTables: [] };
    },
  };

  return repo;
}
