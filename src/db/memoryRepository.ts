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
  NextFocusRow,
  PracticeResultInput,
  PracticeSessionRow,
  RecommendationRow,
  SaveVideoInput,
  SupportRepository,
} from './repository';

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
          videoPolicy: '動画本体は含めません。',
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
