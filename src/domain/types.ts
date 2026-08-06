export type ID = string;

export type RepeatType = 'once' | 'daily' | 'weekly';
export type PracticeItemStatus =
  'planned' | 'in_progress' | 'paused' | 'completed' | 'skipped' | 'aborted';
export type AchievementLevel = 'not_achieved' | 'partial' | 'achieved' | 'exceeded';
export type VideoDirection = 'front' | 'side' | 'back' | 'slow' | 'other';
export type ImprovementIssueStatus =
  'NEW' | 'CONTINUING' | 'IMPROVING' | 'RESOLVED' | 'RECURRED' | 'UNKNOWN';
export type NextFocusStatus = 'active' | 'completed' | 'deferred' | 'rejected';
export type RecommendationStatus = 'candidate' | 'added' | 'saved_template' | 'rejected';

export type PracticeMenuInput = {
  title: string;
  purpose?: string;
  targetArea?: string;
  rounds?: string | number;
  throwsPerRound?: string | number;
  sets?: string | number;
  targetValue?: string;
  plannedMinutes?: string | number;
  restSeconds?: string | number;
  focusNote?: string;
  memo?: string;
  sortOrder?: string | number;
  isFavorite?: boolean;
  plannedDate: string;
  repeatType: RepeatType;
  repeatWeekdays?: string;
  isAiSuggested?: boolean;
  sourceAssessmentId?: string | null;
};

export type PracticeMenu = {
  title: string;
  purpose: string | null;
  targetArea: string | null;
  rounds: number | null;
  throwsPerRound: number | null;
  sets: number | null;
  targetValue: string | null;
  plannedMinutes: number | null;
  restSeconds: number | null;
  focusNote: string | null;
  memo: string | null;
  sortOrder: number;
  isFavorite: boolean;
  plannedDate: string;
  repeatType: RepeatType;
  repeatWeekdays: string | null;
  isAiSuggested: boolean;
  sourceAssessmentId: string | null;
};

export type PracticeProgress = {
  currentSet: number;
  currentRound: number;
  currentThrow: number;
  elapsedSeconds: number;
  status: PracticeItemStatus;
  undoSnapshot?: PracticeProgress | null;
};

export type AssessmentSections = {
  overall: string;
  goodPoints: string;
  improvementPoints: string;
  stance: string;
  setup: string;
  takeback: string;
  release: string;
  followThrough: string;
  headShoulderElbow: string;
  threeThrowReproducibility: string;
  improvedSincePrevious: string;
  notImprovedYet: string;
  nextPriority: string;
  recommendedPractice: string;
  confidence: string;
};

export type AssessmentParseResult = {
  sections: AssessmentSections;
  recognizedCount: number;
  missingHeadings: (keyof AssessmentSections)[];
  hasRecognizedHeading: boolean;
};

export type PracticeContextForPrompt = {
  handedness?: string | null;
  dartWeight?: string | null;
  direction?: string | null;
  throwCount?: number | null;
  practicePurpose?: string | null;
  userConcern?: string | null;
  previousIssues?: string[];
};
