import { getRows, type BackupPayload } from './backup';

export type AnalysisRange = 'today' | '7d' | '30d' | '3m' | '6m' | '1y' | 'all';
export type AnalysisCategory =
  'all' | 'bull' | 'cricket' | 'single' | 'double' | 'triple' | 'form' | 'level' | 'daily_minimum';

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
  promotionReady: boolean;
  history: ChartPoint[];
  levelCheckScores: ChartPoint[];
};

export type FormAnalysis = {
  assessments: number;
  issuesByStatus: Record<string, number>;
  nextFocusItems: number;
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
  markCount: number;
  achieved: boolean;
  inputMethod: string;
};

export type ChartPoint = {
  label: string;
  value: number;
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
  const history = buildHistory(drillResults, drillDefinitions);
  const bull = buildBullAnalysis(drillResults, drillDefinitions, drillThrows);
  const cricket = buildCricketAnalysis(drillThrows, drillRounds);
  const catches = buildCatchAnalysis(drillThrows);
  const strengths = buildStrengthWeakness(drillThrows);

  return {
    currentLevel: stringValue(profile?.current_level, 'C'),
    totalPracticeDays: new Set(history.map((row) => row.date.slice(0, 10))).size,
    totalPracticeSeconds: sumNumbers(drillResults, 'duration_seconds'),
    totalThrows: sumNumbers(drillResults, 'total_throws'),
    weeklyThrows: sumNumbers(filterRowsByRange(drillResults, 'created_at', '7d'), 'total_throws'),
    dailyMinimumRate: averageNumbers(dailyCompletion, 'completion_rate'),
    practiceStreakDays: calculateStreak(history.map((row) => row.date.slice(0, 10))),
    recentBullRate: bull.recentBullRate,
    recentAverageMarks: cricket.averageMarksPerThrow,
    lastPracticeDate: history[0]?.date ?? null,
    bull,
    cricket,
    catches,
    strengths,
    level: {
      currentLevel: stringValue(profile?.current_level, 'C'),
      levelStartedAt: stringOrNull(profile?.level_started_at),
      promotionReady: numberValue(profile?.promotion_ready) === 1,
      history: levelHistory.map((row) => ({
        label: stringValue(row.created_at, ''),
        value: levelValue(stringValue(row.next_level, 'C')),
      })),
      levelCheckScores: levelChecks.map((row) => ({
        label: stringValue(row.started_at, ''),
        value: numberValue(row.overall_score),
      })),
    },
    form: {
      assessments: formAssessments.length,
      issuesByStatus: countBy(issues, 'status'),
      nextFocusItems: focusItems.filter((row) => row.status === 'active').length,
    },
    history,
  };
}

export function buildCsv(name: string, payload: BackupPayload) {
  const rows =
    name === 'throw_results'
      ? getRows(payload.drill_throw_results)
      : name === 'round_results'
        ? getRows(payload.drill_rounds)
        : name === 'level_history'
          ? getRows(payload.player_level_history)
          : name === 'bull_analysis' || name === 'cricket_analysis'
            ? getRows(payload.drill_results)
            : buildHistory(
                getRows(payload.drill_results),
                getRows(payload.training_drill_definitions),
              );
  const normalizedRows = rows.map((row) => row as Record<string, unknown>);
  const columns = [...new Set(normalizedRows.flatMap((row) => Object.keys(row)))];
  return `\uFEFF${[
    columns.join(','),
    ...normalizedRows.map((row) =>
      columns.map((column) => `"${String(row[column] ?? '').replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n')}`;
}

function buildHistory(
  drillResults: Record<string, unknown>[],
  drillDefinitions: Record<string, unknown>[],
): PracticeHistoryRow[] {
  return drillResults
    .map((row) => {
      const definition = drillDefinitions.find(
        (candidate) => candidate.id === row.drill_definition_id,
      );
      const summary = parseSummary(row.summary_json);
      return {
        id: stringValue(row.id, ''),
        date: stringValue(row.created_at, ''),
        drillName: stringValue(definition?.name, stringValue(row.drill_definition_id, '未指定')),
        level: stringValue(definition?.target_level_min, '-'),
        target: stringValue(definition?.target_numbers, ''),
        totalThrows: numberValue(row.total_throws),
        rounds: Math.ceil(numberValue(row.total_throws) / 3),
        bullCount: numberValue(row.inner_bull) + numberValue(row.outer_bull),
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
  const bullResults = drillResults.filter((row) =>
    bullDefinitions.has(String(row.drill_definition_id)),
  );
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
    recentBullRate: averageNumbers(bullResults.slice(0, 5), 'bull_rate'),
    targetThrowAverage: target.length ? averageNumbers(target, 'total_throws') : null,
    bestTargetThrows: target.length
      ? Math.min(...target.map((row) => numberValue(row.total_throws)))
      : null,
    innerBull: sumNumbers(bullResults, 'inner_bull'),
    outerBull: sumNumbers(bullResults, 'outer_bull'),
    chart: bullResults.map((row) => ({
      label: stringValue(row.created_at, '').slice(0, 10),
      value: numberValue(row.bull_rate) * 100,
    })),
  };
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
