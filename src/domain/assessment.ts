import type { AssessmentParseResult, AssessmentSections, PracticeContextForPrompt } from './types';

export const assessmentHeadingMap = {
  overall: '総合評価',
  goodPoints: '良かった点',
  improvementPoints: '改善が必要な点',
  stance: 'スタンス',
  setup: '構え',
  takeback: 'テイクバック',
  release: 'リリース',
  followThrough: 'フォロースルー',
  headShoulderElbow: '頭・肩・肘の動き',
  threeThrowReproducibility: '3投の再現性',
  improvedSincePrevious: '前回評価から改善した点',
  notImprovedYet: 'まだ改善していない点',
  nextPriority: '次回、最優先で意識すること',
  recommendedPractice: 'おすすめ練習メニュー',
  confidence: '評価の確信度',
} as const satisfies Record<keyof AssessmentSections, string>;

const normalizedAliases = new Map<string, keyof AssessmentSections>(
  Object.entries(assessmentHeadingMap).flatMap(([key, label]) => {
    const sectionKey = key as keyof AssessmentSections;
    return [
      [normalizeHeading(label), sectionKey],
      [normalizeHeading(label.replace('・', '')), sectionKey],
      [normalizeHeading(label.replace('、', '')), sectionKey],
    ];
  }),
);

export function emptyAssessmentSections(): AssessmentSections {
  return {
    overall: '',
    goodPoints: '',
    improvementPoints: '',
    stance: '',
    setup: '',
    takeback: '',
    release: '',
    followThrough: '',
    headShoulderElbow: '',
    threeThrowReproducibility: '',
    improvedSincePrevious: '',
    notImprovedYet: '',
    nextPriority: '',
    recommendedPractice: '',
    confidence: '',
  };
}

function normalizeHeading(value: string): string {
  return value
    .replace(/^#+\s*/, '')
    .replace(/^[【\[]/, '')
    .replace(/[】\]]$/, '')
    .replace(/[:：]$/, '')
    .replace(/\*\*/g, '')
    .replace(/\s/g, '')
    .trim();
}

function readHeading(line: string): keyof AssessmentSections | null {
  const candidate = normalizeHeading(line);
  return normalizedAliases.get(candidate) ?? null;
}

export function parseChatGptAssessment(rawText: string): AssessmentParseResult {
  const sections = emptyAssessmentSections();
  const seen = new Set<keyof AssessmentSections>();
  let current: keyof AssessmentSections | null = null;

  for (const line of rawText.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim();
    const headingFromWholeLine = readHeading(trimmed);
    const colonMatch = trimmed.match(/^(?:#+\s*)?(?:\*\*)?(.+?)(?:\*\*)?\s*[:：]\s*(.*)$/);
    const headingFromColon = colonMatch ? readHeading(colonMatch[1] ?? '') : null;
    const heading = headingFromWholeLine ?? headingFromColon;

    if (heading) {
      current = heading;
      seen.add(heading);
      const inlineBody = colonMatch?.[2]?.trim();
      if (inlineBody) {
        sections[heading] = sections[heading] ? `${sections[heading]}\n${inlineBody}` : inlineBody;
      }
      continue;
    }

    if (current && trimmed.length > 0) {
      sections[current] = sections[current] ? `${sections[current]}\n${line}` : line;
    }
  }

  const missingHeadings = Object.keys(assessmentHeadingMap).filter(
    (key) => !seen.has(key as keyof AssessmentSections),
  ) as (keyof AssessmentSections)[];

  return {
    sections,
    recognizedCount: seen.size,
    missingHeadings,
    hasRecognizedHeading: seen.size > 0,
  };
}

function fallback(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '未登録';
  }
  return String(value);
}

export function generateChatGptPrompt(context: PracticeContextForPrompt): string {
  return [
    '添付したダーツ投擲動画を分析してください。',
    '',
    '【基本情報】',
    `・利き腕：${fallback(context.handedness)}`,
    `・使用ダーツ重量：${fallback(context.dartWeight)}`,
    `・撮影方向：${fallback(context.direction)}`,
    `・投擲数：${fallback(context.throwCount)}`,
    `・今回の練習目的：${fallback(context.practicePurpose)}`,
    `・本人が感じている問題：${fallback(context.userConcern)}`,
    `・前回指摘された改善点：${context.previousIssues?.length ? context.previousIssues.join(' / ') : '未登録'}`,
    '',
    '次の項目ごとに評価してください。',
    '',
    ...Object.values(assessmentHeadingMap).map((heading) => `【${heading}】`),
    '',
    '一度に多くの修正を求めず、次回の練習で意識する改善点は最大2点に絞ってください。',
    '映像から判断できない内容は推測せず、「映像では判断できない」と記載してください。',
    '利用可能なデータがない項目は、空欄または「未登録」としてください。',
    '存在しないデータを生成しないでください。',
  ].join('\n');
}

export function hashAssessmentRawText(rawText: string): string {
  let hash = 2166136261;
  for (let index = 0; index < rawText.length; index += 1) {
    hash ^= rawText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function splitCandidates(text: string): string[] {
  return text
    .split(/\n|。|・|-/)
    .map((item) => item.replace(/^\d+[.)．]\s*/, '').trim())
    .filter((item) => item.length > 0 && item !== '未登録');
}

export function deriveNextFocusItems(sections: AssessmentSections): string[] {
  const primary = splitCandidates(sections.nextPriority);
  const secondary = splitCandidates(sections.improvementPoints);
  const tertiary = splitCandidates(sections.notImprovedYet);
  const unique: string[] = [];

  for (const item of [...primary, ...secondary, ...tertiary]) {
    if (!unique.some((existing) => existing === item)) {
      unique.push(item);
    }
    if (unique.length === 2) {
      break;
    }
  }

  return unique;
}

export function derivePracticeRecommendations(sections: AssessmentSections): string[] {
  return splitCandidates(sections.recommendedPractice).slice(0, 5);
}
