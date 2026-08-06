import { getRows, type BackupPayload } from './backup';

export type AnalysisRange = 'today' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all';
export type AnalysisCategory =
  'all' | 'bull' | 'cricket' | 'single' | 'double' | 'triple' | 'form' | 'level' | 'daily_minimum';
export type AnalysisCsvName =
  | 'session_summary'
  | 'round_results'
  | 'throw_results'
  | 'bull_analysis'
  | 'cricket_analysis'
  | 'level_history';

export type PcAnalysisSummary = {
  currentLevel: string;
  totalPracticeDays: number;
  totalPracticeSeconds: number;
  totalThrows: number;
  weeklyThrows: number;
  dailyMinimumRate: number;
  practiceStreakDays: number;
  recentBullRate: number;
  recentAverageMarks: number;
  lastPracticeDate: string | null;
  lastPracticeDateDisplay: string;
  dataQualityLabels: string[];
  bull: BullAnalysis;
  cricket: CricketAnalysis;
  catches: CatchAnalysis;
  strengths: StrengthWeaknessAnalysis;
  level: LevelAnalysis;
  form: FormAnalysis;
  history: PracticeHistoryRow[];
};

export type BullAnalysis = {
  fixedThrowSessions: number;
  targetSessions: number;
  recentBullRate: number;
  targetThrowAverage: number | null;
  bestTargetThrows: number | null;
  innerBull: number;
  outerBull: number;
  legacyBullCount: number;
  legacySessions: number;
  chart: ChartPoint[];
};

export type CricketAnalysis = {
  totalMarks: number;
  averageMarksPerThrow: number;
  averageMarksPerRound: number;
  zeroMarkRoundRate: number;
  singleCount: number;
  doubleCount: number;
  tripleCount: number;
  targetAverages: ChartPoint[];
};

export type CatchAnalysis = {
  catchThrows: number;
  catchMarks: number;
  catchRate: number;
  distribution: ChartPoint[];
  outsideThrows: number;
};

export type StrengthWeaknessAnalysis = {
  strongCandidates: CandidateReason[];
  weakCandidates: CandidateReason[];
};

export type CandidateReason = {
  target: string;
  value: number;
  confidence: 'データ不足' | '参考値' | '通常';
  reason: string;
};

export type LevelAnalysis = {
  currentLevel: string;
  levelStartedAt: string | null;
  levelStartedAtDisplay: string;
  promotionReady: boolean;
  history: ChartPoint[];
  levelCheckScores: ChartPoint[];
};

export type FormAnalysis = {
  assessments: number;
  issuesByStatus: Record<string, number>;
  nextFocusItems: number;
  latestAssessmentDate: string | null;
  latestAssessmentDateDisplay: string;
};

export type PracticeHistoryRow = {
  id: string;
  date: string;
  drillName: string;
  level: string;
  target: string;
  totalThrows: number;
  rounds: number;
  bullCount: number;
  bullDisplay: string;
  bullRate: number;
  bullDataKind: BullDataKind;
  dataQualityLabels: string[];
  markCount: number;
  achieved: boolean;
  inputMethod: string;
};

export type ChartPoint = {
  label: string;
  value: number;
  kind?: 'new' | 'legacy';
  description?: string;
};

export type BullDataKind = 'new_throw' | 'new_summary' | 'legacy_summary' | 'none';

type BullStats = {
  bullCount: number;
  innerBull: number;
  outerBull: number;
  bullRate: number;
  kind: BullDataKind;
  hasThrowDetails: boolean;
  hasInnerOuterBreakdown: boolean;
};

const CSV_BOM = '\uFEFF';

const analysisCsvColumns: Record<AnalysisCsvName, string[]> = {
  session_summary: [
    'id',
    'date',
    'drillName',
    'level',
    'target',
    'totalThrows',
    'rounds',
    'bullCount',
    'bullDisplay',
    'bullRate',
    'bullDataKind',
    'markCount',
    'achieved',
    'inputMethod',
    'dataQualityLabels',
  ],
  round_results: [
    'id',
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
  throw_results: [
    'id',
    'drill_session_id',
    'round_number',
    'throw_number',
    'overall_throw_number',
    'target_number',
    'actual_number',
    'segment',
    'multiplier',
    'score',
    'mark_count',
    'is_hit',
    'is_inner_bull',
    'is_outer_bull',
    'catch_hit',
    'created_at',
  ],
  bull_analysis: [
    'id',
    'drill_session_id',
    'drill_definition_id',
    'total_throws',
    'hit_count',
    'inner_bull',
    'outer_bull',
    'bull_rate',
    'legacy_bull_count',
    'legacy_bull_rate',
    'bull_data_kind',
    'created_at',
  ],
  cricket_analysis: [
    'id',
    'drill_session_id',
    'drill_definition_id',
    'total_throws',
    'mark_count',
    'round_average',
    'single_count',
    'double_count',
    'triple_count',
    'zero_rounds',
    'three_plus_mark_rounds',
    'best_target',
    'weakest_target',
    'created_at',
  ],
  level_history: ['id', 'previous_level', 'next_level', 'reason', 'created_at'],
};

export function buildPcAnalysis(
  payload: BackupPayload,
  range: AnalysisRange = 'all',
): PcAnalysisSummary {
  const drillResults = filterRowsByRange(getRows(payload.drill_results), 'created_at', range);
  const drillDefinitions = getRows(payload.training_drill_definitions);
  const drillThrows = filterRowsByRange(getRows(payload.drill_throw_results), 'created_at', range);
  const drillRounds = getRows(payload.drill_rounds);
  const dailyCompletion = filterRowsByRange(
    getRows(payload.daily_minimum_completion),
    'practice_date',
    range,
  );
  const profile = getRows(payload.player_skill_profiles)[0];
  const levelHistory = getRows(payload.player_level_history);
  const levelChecks = getRows(payload.level_check_sessions);
  const formAssessments = filterRowsByRange(
    getRows(payload.ai_form_assessments),
    'created_at',
    range,
  );
  const issues = getRows(payload.improvement_issues);
  const focusItems = getRows(payload.next_focus_items);
  const history = buildHistory(drillResults, drillDefinitions, drillThrows, drillRounds);
  const bull = buildBullAnalysis(drillResults, drillDefinitions, drillThrows);
  const cricket = buildCricketAnalysis(drillThrows, drillRounds);
  const catches = buildCatchAnalysis(drillThrows);
  const strengths = buildStrengthWeakness(drillThrows);
  const lastPracticeDate = history[0]?.date ?? null;
  const latestAssessmentDate =
    [...formAssessments].sort((a, b) =>
      stringValue(b.created_at, '').localeCompare(stringValue(a.created_at, '')),
    )[0]?.created_at ?? null;

  return {
    currentLevel: stringValue(profile?.current_level, 'C'),
    totalPracticeDays: new Set(history.map((row) => row.date.slice(0, 10))).size,
    totalPracticeSeconds: calculatePracticeSeconds(payload, range),
    totalThrows: sumNumbers(drillResults, 'total_throws'),
    weeklyThrows: sumNumbers(filterRowsByRange(drillResults, 'created_at', '7d'), 'total_throws'),
    dailyMinimumRate: averageNumbers(dailyCompletion, 'completion_rate'),
    practiceStreakDays: calculateStreak(history.map((row) => row.date.slice(0, 10))),
    recentBullRate: bull.recentBullRate,
    recentAverageMarks: cricket.averageMarksPerThrow,
    lastPracticeDate,
    lastPracticeDateDisplay: formatJapanDateTime(lastPracticeDate),
    dataQualityLabels: buildDataQualityLabels(payload, history, drillThrows, drillRounds),
    bull,
    cricket,
    catches,
    strengths,
    level: {
      currentLevel: stringValue(profile?.current_level, 'C'),
      levelStartedAt: stringOrNull(profile?.level_started_at),
      levelStartedAtDisplay: formatJapanDateTime(profile?.level_started_at),
      promotionReady: numberValue(profile?.promotion_ready) === 1,
      history: levelHistory.map((row) => ({
        label: formatJapanDateTime(row.created_at),
        value: levelValue(stringValue(row.next_level, 'C')),
      })),
      levelCheckScores: levelChecks.map((row) => ({
        label: formatJapanDateTime(row.started_at),
        value: numberValue(row.overall_score),
      })),
    },
    form: {
      assessments: formAssessments.length,
      issuesByStatus: countBy(issues, 'status'),
      nextFocusItems: focusItems.filter((row) => row.status === 'active').length,
      latestAssessmentDate: stringOrNull(latestAssessmentDate),
      latestAssessmentDateDisplay: formatJapanDateTime(latestAssessmentDate),
    },
    history,
  };
}

export function buildCsv(name: string, payload: BackupPayload) {
  return generateAnalysisCsv(normalizeAnalysisCsvName(name), payload).text;
}

export function generateAnalysisCsv(name: AnalysisCsvName, payload: BackupPayload) {
  const rows = csvRowsFor(name, payload);
  const columns = mergeCsvColumns(analysisCsvColumns[name], rows);
  return {
    fileName: `${name}.csv`,
    rowCount: rows.length,
    text: toCsv(columns, rows),
  };
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]) {
  const lines = [
    columns.map((column) => csvCell(column)).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ];
  return `${CSV_BOM}${lines.join('\r\n')}`;
}

export function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function normalizeAnalysisCsvName(name: string): AnalysisCsvName {
  if (isAnalysisCsvName(name)) {
    return name;
  }
  return 'session_summary';
}

function isAnalysisCsvName(name: string): name is AnalysisCsvName {
  return Object.hasOwn(analysisCsvColumns, name);
}

function csvRowsFor(name: AnalysisCsvName, payload: BackupPayload): Record<string, unknown>[] {
  if (name === 'session_summary') {
    return buildHistory(
      getRows(payload.drill_results),
      getRows(payload.training_drill_definitions),
      getRows(payload.drill_throw_results),
      getRows(payload.drill_rounds),
    ).map((row) => ({
      ...row,
      dataQualityLabels: row.dataQualityLabels.join(' / '),
    }));
  }
  if (name === 'round_results') {
    return getRows(payload.drill_rounds);
  }
  if (name === 'throw_results') {
    return getRows(payload.drill_throw_results);
  }
  if (name === 'level_history') {
    return getRows(payload.player_level_history);
  }
  if (name === 'bull_analysis') {
    const definitions = getRows(payload.training_drill_definitions);
    const throwsBySession = groupRowsBy(getRows(payload.drill_throw_results), 'drill_session_id');
    return getRows(payload.drill_results).map((row) => {
      const definition = definitions.find((candidate) => candidate.id === row.drill_definition_id);
      const stats = calculateBullStats(
        row,
        definition,
        throwsBySession.get(stringValue(row.drill_session_id, '')) ?? [],
      );
      return {
        ...row,
        legacy_bull_count: stats.kind === 'legacy_summary' ? stats.bullCount : '',
        legacy_bull_rate: stats.kind === 'legacy_summary' ? stats.bullRate : '',
        bull_data_kind: stats.kind,
      };
    });
  }
  return getRows(payload.drill_results);
}

function mergeCsvColumns(defaultColumns: string[], rows: Record<string, unknown>[]) {
  const columns = new Set(defaultColumns);
  for (const row of rows) {
    for (const column of Object.keys(row)) {
      columns.add(column);
    }
  }
  return [...columns];
}

export function formatJapanDateTime(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return 'なし';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year')}年${Number(part('month'))}月${Number(part('day'))}日 ${part('hour')}:${part('minute')}`;
}

function buildHistory(
  drillResults: Record<string, unknown>[],
  drillDefinitions: Record<string, unknown>[],
  throws: Record<string, unknown>[] = [],
  rounds: Record<string, unknown>[] = [],
): PracticeHistoryRow[] {
  const throwsBySession = groupRowsBy(throws, 'drill_session_id');
  const roundsBySession = groupRowsBy(rounds, 'drill_session_id');
  return drillResults
    .map((row) => {
      const definition = drillDefinitions.find(
        (candidate) => candidate.id === row.drill_definition_id,
      );
      const summary = parseSummary(row.summary_json);
      const sessionId = stringValue(row.drill_session_id, '');
      const bullStats = calculateBullStats(row, definition, throwsBySession.get(sessionId) ?? []);
      const dataQualityLabels = buildRowDataQualityLabels(
        bullStats,
        roundsBySession.get(sessionId) ?? [],
      );
      return {
        id: stringValue(row.id, ''),
        date: stringValue(row.created_at, ''),
        drillName: stringValue(definition?.name, stringValue(row.drill_definition_id, '未指定')),
        level: stringValue(definition?.target_level_min, '-'),
        target: stringValue(definition?.target_numbers, ''),
        totalThrows: numberValue(row.total_throws),
        rounds: Math.ceil(numberValue(row.total_throws) / 3),
        bullCount: bullStats.bullCount,
        bullDisplay:
          bullStats.kind === 'legacy_summary'
            ? `${bullStats.bullCount}本（旧形式）`
            : `${bullStats.bullCount}本`,
        bullRate: bullStats.bullRate,
        bullDataKind: bullStats.kind,
        dataQualityLabels,
        markCount: numberValue(row.mark_count),
        achieved: stringValue(definition?.completion_rule, '') !== 'manual',
        inputMethod: stringValue(summary.inputMethod, 'round_three_throw'),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function buildBullAnalysis(
  drillResults: Record<string, unknown>[],
  definitions: Record<string, unknown>[],
  throws: Record<string, unknown>[],
): BullAnalysis {
  const bullDefinitions = new Set(
    definitions.filter((row) => row.category === 'bull').map((row) => String(row.id)),
  );
  const throwsBySession = groupRowsBy(throws, 'drill_session_id');
  const bullResults = drillResults.filter((row) =>
    bullDefinitions.has(String(row.drill_definition_id)),
  );
  const bullRows = bullResults.map((row) => {
    const definition = definitions.find((candidate) => candidate.id === row.drill_definition_id);
    const stats = calculateBullStats(
      row,
      definition,
      throwsBySession.get(stringValue(row.drill_session_id, '')) ?? [],
    );
    return { row, definition, stats };
  });
  const fixed = bullResults.filter((row) => {
    const definition = definitions.find((candidate) => candidate.id === row.drill_definition_id);
    return definition?.completion_rule === 'fixed_throws';
  });
  const target = bullResults.filter((row) => {
    const definition = definitions.find((candidate) => candidate.id === row.drill_definition_id);
    return definition?.completion_rule === 'bull_count';
  });
  return {
    fixedThrowSessions: fixed.length,
    targetSessions: target.length,
    recentBullRate: averagePerCount(
      bullRows.slice(0, 5).reduce((sum, item) => sum + item.stats.bullRate, 0),
      bullRows.slice(0, 5).length,
    ),
    targetThrowAverage: target.length ? averageNumbers(target, 'total_throws') : null,
    bestTargetThrows: target.length
      ? Math.min(...target.map((row) => numberValue(row.total_throws)))
      : null,
    innerBull: bullRows.reduce((sum, item) => sum + item.stats.innerBull, 0),
    outerBull: bullRows.reduce((sum, item) => sum + item.stats.outerBull, 0),
    legacyBullCount: bullRows.reduce(
      (sum, item) => sum + (item.stats.kind === 'legacy_summary' ? item.stats.bullCount : 0),
      0,
    ),
    legacySessions: bullRows.filter((item) => item.stats.kind === 'legacy_summary').length,
    chart: bullRows.map(({ row, stats }) => ({
      label: formatJapanDateTime(row.created_at),
      value: stats.bullRate * 100,
      kind: stats.kind === 'legacy_summary' ? 'legacy' : 'new',
      description:
        stats.kind === 'legacy_summary'
          ? `旧形式: ${stats.bullCount}/${numberValue(row.total_throws)}本`
          : `新形式: ${stats.innerBull + stats.outerBull}/${numberValue(row.total_throws)}本`,
    })),
  };
}

function calculateBullStats(
  row: Record<string, unknown>,
  definition: Record<string, unknown> | undefined,
  throws: Record<string, unknown>[],
): BullStats {
  const totalThrows = numberValue(row.total_throws);
  const innerBull = numberValue(row.inner_bull);
  const outerBull = numberValue(row.outer_bull);
  const summaryBullCount = innerBull + outerBull;
  const isBullDrill = definition?.category === 'bull';
  const hasThrowDetails = throws.length > 0;

  if (summaryBullCount > 0) {
    return {
      bullCount: summaryBullCount,
      innerBull,
      outerBull,
      bullRate: numberValue(row.bull_rate) || averagePerCount(summaryBullCount, totalThrows),
      kind: hasThrowDetails ? 'new_throw' : 'new_summary',
      hasThrowDetails,
      hasInnerOuterBreakdown: true,
    };
  }

  if (isBullDrill && numberValue(row.hit_count) > 0 && !hasThrowDetails) {
    const bullCount = numberValue(row.hit_count);
    return {
      bullCount,
      innerBull: 0,
      outerBull: 0,
      bullRate: averagePerCount(bullCount, totalThrows),
      kind: 'legacy_summary',
      hasThrowDetails: false,
      hasInnerOuterBreakdown: false,
    };
  }

  return {
    bullCount: summaryBullCount,
    innerBull,
    outerBull,
    bullRate: numberValue(row.bull_rate),
    kind: hasThrowDetails ? 'new_throw' : 'none',
    hasThrowDetails,
    hasInnerOuterBreakdown: summaryBullCount > 0,
  };
}

function calculatePracticeSeconds(payload: BackupPayload, range: AnalysisRange) {
  const drillSessions = filterRowsByRange(getRows(payload.drill_sessions), 'completed_at', range);
  const dailyItems = filterRowsByRange(getRows(payload.daily_minimum_items), 'completed_at', range);
  const practiceSessions = filterRowsByRange(
    getRows(payload.practice_sessions),
    'updated_at',
    range,
  );
  const plans = filterRowsByRange(getRows(payload.daily_minimum_plans), 'practice_date', range);
  const completions = filterRowsByRange(
    getRows(payload.daily_minimum_completion),
    'practice_date',
    range,
  );
  const countedDailyItemIds = new Set<string>();
  const countedPracticeSessionIds = new Set<string>();
  let total = 0;

  for (const session of drillSessions) {
    const elapsedSeconds = numberValue(session.elapsed_seconds);
    const completed = session.status === 'completed' || Boolean(session.completed_at);
    if (!completed || elapsedSeconds <= 0) {
      continue;
    }
    total += elapsedSeconds;
    const dailyItemId = stringOrNull(session.daily_minimum_item_id);
    const practiceSessionId = stringOrNull(session.practice_session_id);
    if (dailyItemId) {
      countedDailyItemIds.add(dailyItemId);
    }
    if (practiceSessionId) {
      countedPracticeSessionIds.add(practiceSessionId);
    }
  }

  for (const item of dailyItems) {
    const itemId = stringValue(item.id, '');
    const durationSeconds = numberValue(item.duration_seconds);
    if (durationSeconds <= 0 || countedDailyItemIds.has(itemId)) {
      continue;
    }
    total += durationSeconds;
  }

  for (const session of practiceSessions) {
    const sessionId = stringValue(session.id, '');
    const elapsedSeconds = numberValue(session.elapsed_seconds);
    if (elapsedSeconds <= 0 || countedPracticeSessionIds.has(sessionId)) {
      continue;
    }
    total += elapsedSeconds;
  }

  if (total > 0) {
    return total;
  }
  return Math.max(
    sumNumbers(plans, 'duration_seconds'),
    sumNumbers(completions, 'duration_seconds'),
  );
}

function buildDataQualityLabels(
  payload: BackupPayload,
  history: PracticeHistoryRow[],
  throws: Record<string, unknown>[],
  rounds: Record<string, unknown>[],
) {
  const labels = new Set<string>();
  if (throws.length > 0) {
    labels.add('新形式1投データあり');
  }
  if (history.some((row) => row.bullDataKind === 'legacy_summary')) {
    labels.add('旧形式集計データ');
    labels.add('INNER／OUTER内訳なし');
  }
  if (
    rounds.length === 0 ||
    history.some((row) => row.dataQualityLabels.includes('ラウンド詳細なし'))
  ) {
    labels.add('ラウンド詳細なし');
  }
  const mediaMetadata = payload.media_metadata;
  const hasMediaRows =
    (mediaMetadata?.photos?.length ?? 0) > 0 ||
    (mediaMetadata?.videos?.length ?? 0) > 0 ||
    getRows(payload.form_videos).length > 0 ||
    getRows(payload.throw_photo_sessions).length > 0;
  if (hasMediaRows) {
    labels.add('写真・動画本体なし');
  }
  return [...labels];
}

function buildRowDataQualityLabels(stats: BullStats, rounds: Record<string, unknown>[]) {
  const labels: string[] = [];
  if (stats.hasThrowDetails) {
    labels.push('新形式1投データあり');
  }
  if (stats.kind === 'legacy_summary') {
    labels.push('旧形式集計データ', 'INNER／OUTER内訳なし');
  }
  if (rounds.length === 0) {
    labels.push('ラウンド詳細なし');
  }
  return labels;
}

function buildCricketAnalysis(
  throws: Record<string, unknown>[],
  rounds: Record<string, unknown>[],
): CricketAnalysis {
  const cricketThrows = throws.filter(
    (row) => numberValue(row.mark_count) > 0 || row.catch_hit !== undefined,
  );
  const targetTotals = new Map<string, { marks: number; throws: number }>();
  for (const row of cricketThrows) {
    const key = stringValue(row.actual_number ?? row.target_number, 'その他');
    const current = targetTotals.get(key) ?? { marks: 0, throws: 0 };
    current.marks += numberValue(row.mark_count);
    current.throws += 1;
    targetTotals.set(key, current);
  }
  return {
    totalMarks: sumNumbers(cricketThrows, 'mark_count'),
    averageMarksPerThrow: averagePerCount(
      sumNumbers(cricketThrows, 'mark_count'),
      cricketThrows.length,
    ),
    averageMarksPerRound: averagePerCount(sumNumbers(rounds, 'mark_count'), rounds.length),
    zeroMarkRoundRate: rounds.length
      ? rounds.filter((row) => numberValue(row.mark_count) === 0).length / rounds.length
      : 0,
    singleCount: cricketThrows.filter((row) => numberValue(row.multiplier) === 1).length,
    doubleCount: cricketThrows.filter((row) => numberValue(row.multiplier) === 2).length,
    tripleCount: cricketThrows.filter((row) => numberValue(row.multiplier) === 3).length,
    targetAverages: [...targetTotals.entries()].map(([label, value]) => ({
      label,
      value: averagePerCount(value.marks, value.throws),
    })),
  };
}

function buildCatchAnalysis(throws: Record<string, unknown>[]): CatchAnalysis {
  const catchThrows = throws.filter((row) => numberValue(row.catch_hit) === 1);
  return {
    catchThrows: catchThrows.length,
    catchMarks: sumNumbers(catchThrows, 'mark_count'),
    catchRate: throws.length ? catchThrows.length / throws.length : 0,
    distribution: Object.entries(countBy(catchThrows, 'actual_number')).map(([label, value]) => ({
      label,
      value,
    })),
    outsideThrows: throws.filter(
      (row) => numberValue(row.mark_count) === 0 && numberValue(row.is_hit) === 0,
    ).length,
  };
}

function buildStrengthWeakness(throws: Record<string, unknown>[]): StrengthWeaknessAnalysis {
  const grouped = new Map<string, { marks: number; throws: number }>();
  for (const row of throws) {
    const target = stringValue(row.actual_number ?? row.target_number, 'その他');
    const current = grouped.get(target) ?? { marks: 0, throws: 0 };
    current.marks += numberValue(row.mark_count);
    current.throws += 1;
    grouped.set(target, current);
  }
  const candidates = [...grouped.entries()]
    .map(([target, value]) => {
      const average = averagePerCount(value.marks, value.throws);
      const confidence: CandidateReason['confidence'] =
        value.throws < 9 ? 'データ不足' : value.throws < 30 ? '参考値' : '通常';
      return {
        target,
        value: average,
        confidence,
        reason: `${target}は${value.throws}投の平均マークが${average.toFixed(2)}です。${confidence}として扱います。`,
      };
    })
    .filter((candidate) => candidate.target !== 'その他');
  return {
    strongCandidates: [...candidates].sort((a, b) => b.value - a.value).slice(0, 3),
    weakCandidates: [...candidates].sort((a, b) => a.value - b.value).slice(0, 3),
  };
}

function filterRowsByRange(rows: Record<string, unknown>[], dateKey: string, range: AnalysisRange) {
  if (range === 'all') {
    return rows;
  }
  const days =
    range === 'today'
      ? 1
      : range === '7d'
        ? 7
        : range === '30d'
          ? 30
          : range === '3m'
            ? 92
            : range === '6m'
              ? 183
              : 365;
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  return rows.filter((row) => {
    const value = stringValue(row[dateKey], '');
    return value ? new Date(value) >= start : true;
  });
}

function calculateStreak(dates: string[]) {
  const unique = new Set(dates.filter(Boolean));
  let streak = 0;
  const current = new Date();
  while (unique.has(current.toISOString().slice(0, 10))) {
    streak += 1;
    current.setDate(current.getDate() - 1);
  }
  return streak;
}

function countBy(rows: Record<string, unknown>[], key: string) {
  const result: Record<string, number> = {};
  rows.forEach((row) => {
    const value = stringValue(row[key], '未指定');
    result[value] = (result[value] ?? 0) + 1;
  });
  return result;
}

function groupRowsBy(rows: Record<string, unknown>[], key: string) {
  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const value = stringValue(row[key], '');
    if (!value) {
      continue;
    }
    const current = grouped.get(value) ?? [];
    current.push(row);
    grouped.set(value, current);
  }
  return grouped;
}

function parseSummary(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') {
    return {};
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sumNumbers(rows: Record<string, unknown>[], key: string) {
  return rows.reduce((sum, row) => sum + numberValue(row[key]), 0);
}

function averageNumbers(rows: Record<string, unknown>[], key: string) {
  return averagePerCount(sumNumbers(rows, key), rows.length);
}

function averagePerCount(total: number, count: number) {
  return count ? total / count : 0;
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value) || 0;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value ? value : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

function levelValue(level: string) {
  return ['C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'SA'].indexOf(level) + 1;
}
