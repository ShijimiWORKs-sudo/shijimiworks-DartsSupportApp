import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  Field,
  Loading,
  Page,
  Segmented,
  useTheme,
} from '../../components/ui';
import type {
  DailyMinimumBundle,
  DailyMinimumItemRow,
  DrillDefinitionRow,
  DrillResultRow,
  DrillSessionRow,
  LevelHistoryRow,
  SkillProfileRow,
  TrainingGameSessionRow,
  TrainingThrowRow,
  RecommendedDrillRow,
} from '../../src/db/repository';
import {
  clampBullRound,
  createBullRoundThrows,
  createCricketRoundThrows,
  formatTargets,
  summarizeDrillThrows,
  type TimePreset,
} from '../../src/domain/drills';
import {
  TRAINING_GAMES,
  calculateCricketMark,
  createPhotoCandidates,
  normalizeFromCalibration,
  scoreNormalizedPoint,
  type BullMode,
  type FinishOutMode,
  type ThrowPosition,
  type TrainingGameType,
  type TrainingThrowInput,
} from '../../src/domain/training';
import { useSupportRepository } from '../../src/features/support/SupportDatabaseProvider';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TrainingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ drillSessionId?: string }>();
  const { repository, unavailableView } = useSupportRepository();
  const [profile, setProfile] = useState<SkillProfileRow | null>(null);
  const [history, setHistory] = useState<LevelHistoryRow[]>([]);
  const [games, setGames] = useState<TrainingGameSessionRow[]>([]);
  const [throwsByGame, setThrowsByGame] = useState<Record<string, TrainingThrowRow[]>>({});
  const [dailyMinimum, setDailyMinimum] = useState<DailyMinimumBundle | null>(null);
  const [drillSessions, setDrillSessions] = useState<DrillSessionRow[]>([]);
  const [drillDefinitions, setDrillDefinitions] = useState<DrillDefinitionRow[]>([]);
  const [drillResults, setDrillResults] = useState<DrillResultRow[]>([]);
  const [recommendedDrills, setRecommendedDrills] = useState<RecommendedDrillRow[]>([]);
  const [timePreset, setTimePreset] = useState<TimePreset>('15');
  const [recommendations, setRecommendations] = useState<
    Awaited<ReturnType<NonNullable<typeof repository>['listLevelRecommendations']>>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bullMode, setBullMode] = useState<BullMode>('fat_bull');
  const [outMode, setOutMode] = useState<FinishOutMode>('single');
  const [activeGame, setActiveGame] = useState<TrainingGameSessionRow | null>(null);
  const [throwForm, setThrowForm] = useState({ score: '', segment: '', multiplier: '1' });
  const [levelCheckOpen, setLevelCheckOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [instructionDrill, setInstructionDrill] = useState<DrillDefinitionRow | null>(null);
  const [activeDrillInput, setActiveDrillInput] = useState<{
    session: DrillSessionRow;
    definition: DrillDefinitionRow;
  } | null>(null);
  const [roundInputMode, setRoundInputMode] = useState<'summary' | 'detail'>('summary');
  const [bullRound, setBullRound] = useState({ inner: 0, outer: 0 });
  const [cricketRound, setCricketRound] = useState({
    single: 0,
    double: 0,
    triple: 0,
    catchNumber: '18',
    catchMultiplier: '3',
    catchCount: 0,
  });
  const [lastRoundMessage, setLastRoundMessage] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [photoStep, setPhotoStep] = useState<'center' | 'twenty' | 'outer' | 'throws'>('center');
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [twentyPoint, setTwentyPoint] = useState<{ x: number; y: number } | null>(null);
  const [outerPoints, setOuterPoints] = useState<{ x: number; y: number }[]>([]);
  const [throwPoints, setThrowPoints] = useState<{ x: number; y: number }[]>([]);
  const [autoCandidates, setAutoCandidates] = useState<ThrowPosition[]>([]);
  const [levelCheck, setLevelCheck] = useState({
    countUp: '',
    bull: '',
    twenty: '',
    cricket: '',
    finish: '',
    stability: '',
  });
  const [customDrill, setCustomDrill] = useState({
    name: '',
    purpose: '',
    category: 'custom' as DrillDefinitionRow['category'],
    targetNumbers: '',
    rounds: '',
    throwsPerRound: '',
    totalThrows: '',
    successRule: '',
    scoringMode: 'hit',
    estimatedMinutes: '',
    targetLevelMin: 'C',
    targetLevelMax: 'SA',
    isDailyMinimum: false,
    isFavorite: false,
    canUsePhoto: false,
    canUseVideo: false,
    instructions: '',
    inputGuide: '',
  });
  const [drillResultForm, setDrillResultForm] = useState({
    sessionId: '',
    itemId: '',
    drillDefinitionId: '',
    totalThrows: '',
    hitCount: '',
    markCount: '',
    durationMinutes: '',
    feelingLabel: '',
    tensionLabel: '',
    fatigueLabel: '',
    note: '',
  });

  const reload = useCallback(async () => {
    if (!repository) {
      return;
    }
    setIsLoading(true);
    try {
      const [
        nextProfile,
        nextHistory,
        nextGames,
        nextRecommendations,
        nextDailyMinimum,
        nextDrillSessions,
        nextDrillDefinitions,
        nextDrillResults,
        nextRecommendedDrills,
      ] = await Promise.all([
        repository.getSkillProfile(),
        repository.listLevelHistory(),
        repository.listTrainingGames(),
        repository.listLevelRecommendations(todayIso()),
        repository.getOrCreateDailyMinimumPlan(todayIso()),
        repository.listDrillSessions(),
        repository.listDrillDefinitions(),
        repository.listDrillResults(),
        repository.listRecommendedDrills(todayIso()),
      ]);
      const throwEntries = await Promise.all(
        nextGames.map(
          async (game) => [game.id, await repository.listTrainingThrows(game.id)] as const,
        ),
      );
      setProfile(nextProfile);
      setHistory(nextHistory);
      setGames(nextGames);
      setThrowsByGame(Object.fromEntries(throwEntries));
      setRecommendations(nextRecommendations);
      setDailyMinimum(nextDailyMinimum);
      setDrillSessions(nextDrillSessions);
      setDrillDefinitions(nextDrillDefinitions);
      setDrillResults(nextDrillResults);
      setRecommendedDrills(nextRecommendedDrills);
      setActiveGame(
        (current) => nextGames.find((game) => game.id === current?.id) ?? nextGames[0] ?? null,
      );
    } catch (error) {
      Alert.alert(
        '読み込みに失敗しました',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(() => {
    const sessionId = Array.isArray(params.drillSessionId)
      ? params.drillSessionId[0]
      : params.drillSessionId;
    if (!sessionId || drillSessions.length === 0 || drillDefinitions.length === 0) {
      return;
    }
    const session = drillSessions.find((candidate) => candidate.id === sessionId);
    const definition = drillDefinitions.find(
      (candidate) => candidate.id === session?.drill_definition_id,
    );
    if (session && definition && session.status !== 'completed') {
      openDrillRoundInput(session, definition);
    }
  }, [params.drillSessionId, drillSessions, drillDefinitions]);

  const activeThrows = useMemo(
    () => (activeGame ? (throwsByGame[activeGame.id] ?? []) : []),
    [activeGame, throwsByGame],
  );
  const analysis = useMemo(() => analyzeThrows(Object.values(throwsByGame).flat()), [throwsByGame]);
  const drillAnalysis = useMemo(() => analyzeDrillResults(drillResults), [drillResults]);

  if (!repository) {
    return unavailableView;
  }
  const repo = repository;

  function openDrillRoundInput(session: DrillSessionRow, definition: DrillDefinitionRow) {
    setActiveDrillInput({ session, definition });
    setRoundInputMode('summary');
    setBullRound({ inner: 0, outer: 0 });
    setCricketRound({
      single: 0,
      double: 0,
      triple: 0,
      catchNumber: firstCricketCatchTarget(definition),
      catchMultiplier: '3',
      catchCount: 0,
    });
    setLastRoundMessage('');
  }

  async function openDrillSession(sessionId: string) {
    const [sessions, definitions] = await Promise.all([
      repo.listDrillSessions(),
      repo.listDrillDefinitions(),
    ]);
    const session = sessions.find((candidate) => candidate.id === sessionId);
    const definition = definitions.find(
      (candidate) => candidate.id === session?.drill_definition_id,
    );
    if (session && definition) {
      openDrillRoundInput(session, definition);
    }
  }

  async function startGame(gameType: TrainingGameType) {
    try {
      const id = await repo.startTrainingGame({
        gameType,
        bullMode,
        outMode,
        targetJson: JSON.stringify(defaultTargets(gameType)),
      });
      await reload();
      const created = (await repo.listTrainingGames()).find((game) => game.id === id);
      setActiveGame(created ?? null);
    } catch (error) {
      Alert.alert(
        '開始できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function saveManualThrow() {
    if (!activeGame) {
      Alert.alert('ゲームを選択してください', '先に練習ゲームを開始してください。');
      return;
    }
    const score = Number.parseInt(throwForm.score, 10);
    if (!Number.isFinite(score) || score < 0) {
      Alert.alert('スコアを確認してください', '0以上の整数で入力してください。');
      return;
    }
    const multiplier = Math.min(3, Math.max(0, Number.parseInt(throwForm.multiplier, 10) || 0)) as
      0 | 1 | 2 | 3;
    const segment = parseSegment(throwForm.segment, score, multiplier);
    const nextThrowNumber = (activeThrows.length % 3) + 1;
    const roundNumber = Math.floor(activeThrows.length / 3) + 1;
    const input: TrainingThrowInput = {
      roundNumber,
      throwNumber: nextThrowNumber,
      segment,
      multiplier,
      score,
      inputMethod: 'manual_score',
      isManualOverride: false,
    };
    try {
      await repo.saveTrainingThrows(activeGame.id, [input]);
      setThrowForm({ score: '', segment: '', multiplier: '1' });
      await reload();
    } catch (error) {
      Alert.alert(
        '保存できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function completeGame() {
    if (!activeGame) {
      return;
    }
    await repo.completeTrainingGame(activeGame.id);
    await reload();
  }

  async function startDailyMinimumItem(item: DailyMinimumItemRow) {
    try {
      const sessionId = await repo.startDrillSession(item.drill_definition_id, item.id);
      setDrillResultForm({
        ...drillResultForm,
        sessionId,
        itemId: item.id,
        drillDefinitionId: item.drill_definition_id,
        totalThrows: String(item.target_throws || ''),
        durationMinutes: String(item.estimated_minutes || ''),
      });
      await reload();
      await openDrillSession(sessionId);
    } catch (error) {
      Alert.alert(
        '開始できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function toggleDrillPause(session: DrillSessionRow) {
    const nextStatus = session.status === 'paused' ? 'in_progress' : 'paused';
    await repo.updateDrillSessionProgress(
      session.id,
      nextStatus,
      session.current_round,
      session.current_throw,
      session.elapsed_seconds,
    );
    await reload();
  }

  async function saveDailyMinimumResult() {
    if (!drillResultForm.sessionId || !drillResultForm.drillDefinitionId) {
      Alert.alert('ドリルを開始してください', '先にデイリーミニマムの項目を開始してください。');
      return;
    }
    const totalThrows = Number.parseInt(drillResultForm.totalThrows, 10) || 0;
    const hitCount = Number.parseInt(drillResultForm.hitCount, 10) || 0;
    const markCount = Number.parseInt(drillResultForm.markCount, 10) || 0;
    const durationMinutes = Number.parseInt(drillResultForm.durationMinutes, 10) || 0;
    try {
      await repo.saveDrillResult(drillResultForm.sessionId, {
        drillDefinitionId: drillResultForm.drillDefinitionId,
        drillType: 'custom',
        totalThrows,
        hitCount,
        markCount,
        durationSeconds: durationMinutes * 60,
        feelingLabel: drillResultForm.feelingLabel,
        tensionLabel: drillResultForm.tensionLabel,
        fatigueLabel: drillResultForm.fatigueLabel,
        note: drillResultForm.note,
      });
      setDrillResultForm({
        sessionId: '',
        itemId: '',
        drillDefinitionId: '',
        totalThrows: '',
        hitCount: '',
        markCount: '',
        durationMinutes: '',
        feelingLabel: '',
        tensionLabel: '',
        fatigueLabel: '',
        note: '',
      });
      await reload();
      Alert.alert(
        '保存しました',
        'デイリーミニマムの実施結果を保存しました。未完了項目があっても記録は残ります。',
      );
    } catch (error) {
      Alert.alert(
        '保存できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function saveRoundInput() {
    if (!activeDrillInput) {
      return;
    }
    const { session, definition } = activeDrillInput;
    const existingThrows = await repo.listDrillThrowResults(session.id);
    const nextOverall = existingThrows.length;
    const roundNumber = Math.floor(nextOverall / 3) + 1;
    const throws =
      definition.category === 'bull'
        ? createBullRoundThrows({
            roundNumber,
            overallThrowStart: nextOverall,
            innerBull: bullRound.inner,
            outerBull: bullRound.outer,
          })
        : createCricketRoundThrows({
            roundNumber,
            overallThrowStart: nextOverall,
            intendedTarget: currentIntendedTarget(definition, existingThrows),
            targetHits: {
              single: cricketRound.single,
              double: cricketRound.double,
              triple: cricketRound.triple,
            },
            catches:
              cricketRound.catchCount > 0
                ? [
                    {
                      actualNumber: parseCricketTarget(cricketRound.catchNumber),
                      multiplier: Number.parseInt(cricketRound.catchMultiplier, 10) || 1,
                      count: cricketRound.catchCount,
                    },
                  ]
                : [],
            validTargets: parseDrillTargets(definition),
          });
    try {
      await repo.recordDrillRound(session.id, throws);
      const summary = summarizeDrillThrows(throws);
      setLastRoundMessage(
        definition.category === 'bull'
          ? `このラウンド: BULL ${summary.bullCount}本を記録しました`
          : `このラウンド: ${summary.markCount}マークを記録しました`,
      );
      setBullRound({ inner: 0, outer: 0 });
      setCricketRound({
        single: 0,
        double: 0,
        triple: 0,
        catchNumber: firstCricketCatchTarget(definition),
        catchMultiplier: '3',
        catchCount: 0,
      });
      await reload();
      await openDrillSession(session.id);
    } catch (error) {
      Alert.alert(
        '保存できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function undoDrillRound() {
    if (!activeDrillInput) {
      return;
    }
    await repo.undoLastDrillRound(activeDrillInput.session.id);
    await reload();
    await openDrillSession(activeDrillInput.session.id);
    setLastRoundMessage('直前ラウンドを戻しました');
  }

  async function startStandaloneDrill(drill: DrillDefinitionRow) {
    try {
      const sessionId = await repo.startDrillSession(drill.id, null);
      setDrillResultForm({
        sessionId,
        itemId: '',
        drillDefinitionId: drill.id,
        totalThrows: String(drill.total_throws || ''),
        hitCount: '',
        markCount: '',
        durationMinutes: String(drill.estimated_minutes || ''),
        feelingLabel: '',
        tensionLabel: '',
        fatigueLabel: '',
        note: '',
      });
      await reload();
    } catch (error) {
      Alert.alert(
        '開始できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function addDrillToToday(drill: DrillDefinitionRow) {
    await repo.addPracticeMenu(
      {
        title: drill.name,
        purpose: drill.purpose,
        targetArea: drill.target_numbers,
        rounds: drill.rounds,
        throwsPerRound: drill.throws_per_round,
        sets: 1,
        targetValue: drill.success_rule,
        plannedMinutes: drill.estimated_minutes,
        restSeconds: null,
        focusNote: 'ドリルライブラリからユーザー確認後に追加',
        memo: `カテゴリ: ${drill.category}`,
        sortOrder: 900 + drill.sort_order,
        isFavorite: Boolean(drill.is_favorite),
        plannedDate: todayIso(),
        repeatType: 'once',
        repeatWeekdays: null,
        isAiSuggested: false,
        sourceAssessmentId: null,
        drillDefinitionId: drill.id,
        drillType: drill.drill_type,
        inputMode: drill.input_mode ?? 'round_three_throw',
        targetType: 'number',
        targetNumbers: drill.target_numbers,
        totalThrows: drill.total_throws,
        targetSuccessCount: drill.target_success_count ?? null,
        scoringMode: drill.scoring_mode,
        markMode: drill.mark_mode ?? null,
        sourceType: 'drill_library',
        sourceId: drill.id,
      },
      false,
    );
    Alert.alert('今日へ追加しました', drill.name);
    router.push('/today');
  }

  async function toggleDrillFavorite(drill: DrillDefinitionRow) {
    await repo.updateDrillFavorite(drill.id, !drill.is_favorite);
    await reload();
  }

  async function generateDrillRecommendations() {
    await repo.generateRecommendedDrills(todayIso(), timePreset);
    await reload();
    Alert.alert(
      '候補を作成しました',
      'おすすめは候補表示のみです。今日へ追加するには各カードのボタンを押してください。',
    );
  }

  async function applyDrillRecommendation(recommendation: RecommendedDrillRow) {
    await repo.applyRecommendedDrill(recommendation.id, todayIso());
    await reload();
    Alert.alert('今日へ追加しました', recommendation.name ?? 'おすすめドリル');
  }

  async function saveCustomDrill() {
    if (!customDrill.name.trim() || !customDrill.purpose.trim()) {
      Alert.alert('入力を確認してください', '名前と目的は必須です。');
      return;
    }
    await repo.createCustomDrill({
      name: customDrill.name,
      purpose: customDrill.purpose,
      category: customDrill.category,
      targetNumbers: customDrill.targetNumbers,
      rounds: Number.parseInt(customDrill.rounds, 10) || null,
      throwsPerRound: Number.parseInt(customDrill.throwsPerRound, 10) || null,
      totalThrows: Number.parseInt(customDrill.totalThrows, 10) || null,
      successRule: customDrill.successRule,
      scoringMode: customDrill.scoringMode,
      estimatedMinutes: Number.parseInt(customDrill.estimatedMinutes, 10) || null,
      targetLevelMin: customDrill.targetLevelMin as SkillProfileRow['current_level'],
      targetLevelMax: customDrill.targetLevelMax as SkillProfileRow['current_level'],
      isDailyMinimum: customDrill.isDailyMinimum,
      isFavorite: customDrill.isFavorite,
      canUsePhoto: customDrill.canUsePhoto,
      canUseVideo: customDrill.canUseVideo,
      instructions: customDrill.instructions,
      inputGuide: customDrill.inputGuide,
    });
    setCustomOpen(false);
    setCustomDrill({
      name: '',
      purpose: '',
      category: 'custom',
      targetNumbers: '',
      rounds: '',
      throwsPerRound: '',
      totalThrows: '',
      successRule: '',
      scoringMode: 'hit',
      estimatedMinutes: '',
      targetLevelMin: 'C',
      targetLevelMax: 'SA',
      isDailyMinimum: false,
      isFavorite: false,
      canUsePhoto: false,
      canUseVideo: false,
      instructions: '',
      inputGuide: '',
    });
    await reload();
    Alert.alert('保存しました', 'カスタム練習を作成しました。');
  }

  async function pickPhoto(source: 'camera' | 'library') {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          '権限がありません',
          '権限を拒否してもアプリは継続できます。手入力で記録してください。',
        );
        return;
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }
      setPhotoUri(result.assets[0].uri);
      setCenter(null);
      setTwentyPoint(null);
      setOuterPoints([]);
      setThrowPoints([]);
      setAutoCandidates([]);
      setPhotoStep('center');
      setPhotoOpen(true);
    } catch (error) {
      Alert.alert(
        '写真を開けませんでした',
        error instanceof Error ? error.message : '手入力で継続できます。',
      );
    }
  }

  function handleBoardTap(x: number, y: number) {
    if (photoStep === 'center') {
      setCenter({ x, y });
      setPhotoStep('twenty');
      return;
    }
    if (photoStep === 'twenty') {
      setTwentyPoint({ x, y });
      setPhotoStep('outer');
      return;
    }
    if (photoStep === 'outer') {
      const next = [...outerPoints, { x, y }];
      setOuterPoints(next);
      if (next.length >= 4) {
        setPhotoStep('throws');
      }
      return;
    }
    if (throwPoints.length < 3) {
      setThrowPoints([...throwPoints, { x, y }]);
    }
  }

  function buildCalibration() {
    if (!center || !twentyPoint || outerPoints.length < 4) {
      return null;
    }
    const outerRadius =
      outerPoints.reduce(
        (sum, point) => sum + Math.hypot(point.x - center.x, point.y - center.y),
        0,
      ) / outerPoints.length;
    const rotationDegrees =
      (Math.atan2(twentyPoint.x - center.x, -(twentyPoint.y - center.y)) * 180) / Math.PI;
    return {
      centerX: center.x,
      centerY: center.y,
      twentyX: twentyPoint.x,
      twentyY: twentyPoint.y,
      outerPoints,
      outerRadius,
      rotationDegrees,
    };
  }

  function suggestLightweightCandidates() {
    const calibration = buildCalibration();
    if (!calibration) {
      Alert.alert(
        'キャリブレーションが必要です',
        'BULL中心、20方向、外周4点以上を先に指定してください。',
      );
      return;
    }
    const normalizedCandidates = [
      { x: 0, y: -0.08 },
      { x: 0.08, y: 0.02 },
      { x: -0.08, y: 0.06 },
    ];
    const candidates = createPhotoCandidates(normalizedCandidates);
    const radians = (calibration.rotationDegrees * Math.PI) / 180;
    const points = normalizedCandidates.map((point) => ({
      x:
        calibration.centerX +
        (point.x * Math.cos(radians) - point.y * Math.sin(radians)) * calibration.outerRadius,
      y:
        calibration.centerY +
        (point.x * Math.sin(radians) + point.y * Math.cos(radians)) * calibration.outerRadius,
    }));
    setAutoCandidates(candidates);
    setThrowPoints(points);
    setPhotoStep('throws');
    Alert.alert(
      '低信頼度候補を作成しました',
      '画像特徴抽出ではなく、キャリブレーションから初期候補を置くExpo Go向けの軽量補助です。必ず位置を確認・修正してください。',
    );
  }

  async function confirmPhotoThrows() {
    if (!activeGame) {
      Alert.alert('ゲームを選択してください', '写真判定を保存する練習ゲームを選択してください。');
      return;
    }
    if (!photoUri) {
      Alert.alert('写真がありません', '撮影または写真選択を行ってください。');
      return;
    }
    const calibration = buildCalibration();
    if (!calibration || throwPoints.length !== 3) {
      Alert.alert('未完了です', 'BULL中心、20方向、外周4点以上、3投の位置を指定してください。');
      return;
    }
    const confirmed = throwPoints.map((point) => {
      const normalized = normalizeFromCalibration(point, calibration);
      return scoreNormalizedPoint(
        normalized.x,
        normalized.y,
        autoCandidates.length > 0 ? 'photo_adjusted' : 'photo_manual',
        autoCandidates.length > 0 ? 0.7 : 1,
      );
    });
    try {
      await repo.saveThrowPhotoSession({
        gameSessionId: activeGame.id,
        practiceSessionId: activeGame.practice_session_id,
        roundNumber: Math.floor(activeThrows.length / 3) + 1,
        originalPhotoUri: photoUri,
        correctedPhotoUri: null,
        calibration,
        autoCandidates,
        confirmedPositions: confirmed,
        hasManualAdjustment: true,
      });
      setPhotoOpen(false);
      await reload();
      Alert.alert(
        '3投を保存しました',
        confirmed.map((dart, index) => `${index + 1}投目: ${dart.score}点`).join('\n'),
      );
    } catch (error) {
      Alert.alert(
        '保存できませんでした',
        error instanceof Error ? error.message : '手入力で継続できます。',
      );
    }
  }

  async function addRecommendation(title: string, date: string) {
    await repo.addPracticeMenu(
      {
        title,
        purpose: `${profile?.current_level ?? 'C'}向けレベル別おすすめ`,
        targetArea: null,
        rounds: 8,
        throwsPerRound: 3,
        sets: 1,
        targetValue: null,
        plannedMinutes: 20,
        restSeconds: 60,
        focusNote: 'レベル別おすすめからユーザー確認後に追加',
        memo: '自動では追加せず、ユーザー操作で追加しました。',
        sortOrder: 800,
        isFavorite: false,
        plannedDate: date,
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
        sourceType: 'level_recommendation',
        sourceId: null,
      },
      false,
    );
    Alert.alert('追加しました', `${date} の練習へ追加しました。`);
  }

  async function saveLevelCheck() {
    const parts = Object.fromEntries(
      Object.entries(levelCheck).map(([key, value]) => [key, Number.parseFloat(value) || 0]),
    ) as Parameters<typeof repo.recordLevelCheck>[0];
    try {
      const result = await repo.recordLevelCheck(parts);
      setLevelCheckOpen(false);
      Alert.alert(
        'DartsSupportApp独自基準',
        `総合 ${result.overallScore.toFixed(1)} / 提案レベル ${result.proposedLevel}`,
      );
      await reload();
    } catch (error) {
      Alert.alert(
        '保存できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  function renderDrillCards(category: DrillDefinitionRow['category']) {
    const drills = drillDefinitions.filter((drill) => drill.category === category);
    if (drills.length === 0) {
      return <Text style={{ color: theme.muted, marginTop: 8 }}>該当ドリルはありません。</Text>;
    }
    return drills.map((drill) => (
      <DrillCard
        key={drill.id}
        drill={drill}
        onStart={() => void startStandaloneDrill(drill)}
        onAdd={() => void addDrillToToday(drill)}
        onFavorite={() => void toggleDrillFavorite(drill)}
        onInstructions={() => setInstructionDrill(drill)}
        theme={theme}
      />
    ));
  }

  return (
    <Page
      title="練習ゲーム"
      subtitle="一人用練習として6種類のゲーム、レベル確認、結果分析を記録します。"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 56 }}
        >
          {isLoading ? <Loading /> : null}

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>現在レベル</Text>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900', marginTop: 6 }}>
              {profile?.current_level ?? 'C'}
            </Text>
            <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
              昇格候補: {profile?.provisional_level ?? 'なし'} / 判定{' '}
              {profile?.promotion_test_pass_count ?? 0}/{profile?.promotion_test_count ?? 0} /
              DartsSupportApp独自基準
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <Button label="レベルチェック入力" onPress={() => setLevelCheckOpen(true)} />
              <Button
                label="昇格を確認"
                variant="secondary"
                disabled={!profile?.promotion_ready}
                onPress={() => void repo.confirmLevelPromotion().then(reload)}
              />
            </View>
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              今日のデイリーミニマム
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              毎日最低限の短時間メニューです。未完了でも練習記録は保存できます。
            </Text>
            {dailyMinimum ? (
              <>
                <Text style={{ color: theme.text, marginTop: 8, lineHeight: 20 }}>
                  完了 {dailyMinimum.summary.completedItems}/{dailyMinimum.summary.totalItems} /{' '}
                  {dailyMinimum.summary.completionRate}% / 実施投数{' '}
                  {dailyMinimum.summary.totalThrows} / 実施時間{' '}
                  {Math.round(dailyMinimum.summary.durationSeconds / 60)}分
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
                  未完了:{' '}
                  {dailyMinimum.summary.incompleteNames.length > 0
                    ? dailyMinimum.summary.incompleteNames.join(', ')
                    : 'なし'}{' '}
                  / 連続達成 {dailyMinimum.summary.streakDays}日 / 今週{' '}
                  {dailyMinimum.summary.achievedDaysThisWeek}日
                </Text>
                {dailyMinimum.items.map((item) => {
                  const session = drillSessions.find(
                    (candidate) => candidate.daily_minimum_item_id === item.id,
                  );
                  return (
                    <View
                      key={item.id}
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                        marginTop: 10,
                        paddingTop: 10,
                      }}
                    >
                      <Text style={{ color: theme.text, fontWeight: '800' }}>
                        {item.name_snapshot}
                      </Text>
                      <Text style={{ color: theme.muted, marginTop: 3, lineHeight: 20 }}>
                        {item.target_throws}投 / 目安{item.estimated_minutes}分 / 状態:{' '}
                        {item.status}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        <Button
                          label={session ? '結果入力へ' : '開始'}
                          onPress={() => void startDailyMinimumItem(item)}
                          disabled={item.status === 'completed'}
                        />
                        {session ? (
                          <Button
                            label={session.status === 'paused' ? '再開' : '一時停止'}
                            variant="secondary"
                            onPress={() => void toggleDrillPause(session)}
                            disabled={item.status === 'completed'}
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </>
            ) : null}
          </Card>

          {drillResultForm.sessionId ? (
            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                ドリル結果入力
              </Text>
              <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
                BULL本数や命中数、マーク数だけでも保存できます。
              </Text>
              <Field
                label="実施投数"
                keyboardType="number-pad"
                value={drillResultForm.totalThrows}
                onChangeText={(totalThrows) =>
                  setDrillResultForm({ ...drillResultForm, totalThrows })
                }
              />
              <Field
                label="命中数/BULL数"
                keyboardType="number-pad"
                value={drillResultForm.hitCount}
                onChangeText={(hitCount) => setDrillResultForm({ ...drillResultForm, hitCount })}
              />
              <Field
                label="マーク数"
                keyboardType="number-pad"
                value={drillResultForm.markCount}
                onChangeText={(markCount) => setDrillResultForm({ ...drillResultForm, markCount })}
              />
              <Field
                label="実施時間 分"
                keyboardType="number-pad"
                value={drillResultForm.durationMinutes}
                onChangeText={(durationMinutes) =>
                  setDrillResultForm({ ...drillResultForm, durationMinutes })
                }
              />
              <Field
                label="本人の感覚"
                value={drillResultForm.feelingLabel}
                onChangeText={(feelingLabel) =>
                  setDrillResultForm({ ...drillResultForm, feelingLabel })
                }
              />
              <Field
                label="力みの有無"
                value={drillResultForm.tensionLabel}
                onChangeText={(tensionLabel) =>
                  setDrillResultForm({ ...drillResultForm, tensionLabel })
                }
              />
              <Field
                label="疲労度"
                value={drillResultForm.fatigueLabel}
                onChangeText={(fatigueLabel) =>
                  setDrillResultForm({ ...drillResultForm, fatigueLabel })
                }
              />
              <Field
                label="メモ"
                multiline
                value={drillResultForm.note}
                onChangeText={(note) => setDrillResultForm({ ...drillResultForm, note })}
              />
              <Button label="結果を保存" onPress={() => void saveDailyMinimumResult()} />
            </Card>
          ) : null}

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>ドリル: BULL</Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              BULL 30、BULL 50、BULL 100、3本グルーピング、1本目BULLを反復練習として記録します。
            </Text>
            {drillDefinitions
              .filter((drill) => drill.category === 'bull')
              .map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  onStart={() => void startStandaloneDrill(drill)}
                  onAdd={() => void addDrillToToday(drill)}
                  onFavorite={() => void toggleDrillFavorite(drill)}
                  onInstructions={() => setInstructionDrill(drill)}
                  theme={theme}
                />
              ))}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              ドリル: クリケット
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              20〜15とBULLを、15投、一周、クローズ、苦手番号、ランダム切替で鍛えます。
            </Text>
            {drillDefinitions
              .filter((drill) => drill.category === 'cricket')
              .map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  onStart={() => void startStandaloneDrill(drill)}
                  onAdd={() => void addDrillToToday(drill)}
                  onFavorite={() => void toggleDrillFavorite(drill)}
                  onInstructions={() => setInstructionDrill(drill)}
                  theme={theme}
                />
              ))}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              ドリル: シングル
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              大きいシングル一周、3投チャレンジ、奇数・偶数で盤面を広く使う精度を鍛えます。
            </Text>
            {renderDrillCards('single')}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              ドリル: ダブル
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              ダブル一周、よく使うダブル、ダブルクローズを一人用反復として記録します。
            </Text>
            {renderDrillCards('double')}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              ドリル: トリプル
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              T20・T19集中、トリプル一周、大きいシングル優先モードを選べます。
            </Text>
            {renderDrillCards('triple')}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              ドリル: フォーム
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              ノースコアフォーム、70％スロー、フォロースルー静止。動画やChatGPT評価との関連付け前提の記録です。
            </Text>
            {renderDrillCards('form')}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              ドリル: プレッシャー
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              最後の1本、連続成功、ミスでリセット。初心者には強制せずB以上の候補として扱います。
            </Text>
            {renderDrillCards('pressure')}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              お気に入り / カスタム
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              よく使う練習をお気に入り化し、独自ドリルを作成できます。ビルトインは削除不可です。
            </Text>
            <Button label="カスタム練習を作成" onPress={() => setCustomOpen(true)} />
            {drillDefinitions
              .filter((drill) => drill.is_favorite || drill.category === 'custom')
              .map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  onStart={() => void startStandaloneDrill(drill)}
                  onAdd={() => void addDrillToToday(drill)}
                  onFavorite={() => void toggleDrillFavorite(drill)}
                  onInstructions={() => setInstructionDrill(drill)}
                  theme={theme}
                />
              ))}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              時間別おすすめ
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              5〜60分から選び、現在レベルと弱点候補に応じたドリル候補を作成します。自動では予定に追加しません。
            </Text>
            <Segmented<TimePreset>
              value={timePreset}
              onChange={setTimePreset}
              options={[
                { label: '5分', value: '5' },
                { label: '10分', value: '10' },
                { label: '15分', value: '15' },
                { label: '30分', value: '30' },
                { label: '45分', value: '45' },
                { label: '60分', value: '60' },
                { label: 'カスタム', value: 'custom' },
              ]}
            />
            <Button
              label="おすすめ候補を生成"
              onPress={() => void generateDrillRecommendations()}
            />
            {recommendedDrills.map((recommendation) => (
              <View
                key={recommendation.id}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  marginTop: 10,
                  paddingTop: 10,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  {recommendation.name ?? recommendation.drill_definition_id ?? 'おすすめドリル'}
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
                  理由: {recommendation.source_reason}
                </Text>
                <Text style={{ color: theme.muted, marginTop: 3 }}>
                  状態: {recommendation.status}
                </Text>
                <Button
                  label="今日へ追加"
                  variant="secondary"
                  disabled={recommendation.status === 'added'}
                  onPress={() => void applyDrillRecommendation(recommendation)}
                />
              </View>
            ))}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              得意・苦手分析
            </Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              記録投数 {analysis.totalThrows} / 写真判定 {analysis.photoThrows} / 手入力{' '}
              {analysis.manualThrows}
            </Text>
            <Text style={{ color: theme.text, marginTop: 6, lineHeight: 20 }}>
              得意: {analysis.strongNumbers || '未判定'} / 苦手: {analysis.weakNumbers || '未判定'}
            </Text>
            <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
              初期版は保存済み投擲の命中率と入力方法から集計します。公式レーティングではありません。
            </Text>
            <Text style={{ color: theme.text, marginTop: 8, lineHeight: 20 }}>
              ドリル実施 {drillAnalysis.resultCount}回 / 総投数 {drillAnalysis.totalThrows} /
              週間投数 {drillAnalysis.weeklyThrows} / 月間投数 {drillAnalysis.monthlyThrows}
            </Text>
            <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
              平均成功率 {Math.round(drillAnalysis.averageSuccessRate * 100)}% / 平均BULL率{' '}
              {Math.round(drillAnalysis.averageBullRate * 100)}% / 苦手候補{' '}
              {drillAnalysis.weakTargets || '未判定'}
            </Text>
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              レベル別おすすめ
            </Text>
            {recommendations.map((menu) => (
              <View
                key={menu.title}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  marginTop: 10,
                  paddingTop: 10,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>{menu.title}</Text>
                <Text style={{ color: theme.muted, marginTop: 3 }}>{menu.purpose}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                  <Button
                    label="今日へ追加"
                    onPress={() => void addRecommendation(menu.title, todayIso())}
                  />
                  <Button
                    label="明日へ追加"
                    variant="secondary"
                    onPress={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      void addRecommendation(menu.title, tomorrow.toISOString().slice(0, 10));
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>ゲーム開始</Text>
            <Segmented<BullMode>
              value={bullMode}
              onChange={setBullMode}
              options={[
                { label: 'ファットブル', value: 'fat_bull' },
                { label: 'セパレート', value: 'separate_bull' },
              ]}
            />
            <Segmented<FinishOutMode>
              value={outMode}
              onChange={setOutMode}
              options={[
                { label: 'シングル', value: 'single' },
                { label: 'マスター', value: 'master' },
                { label: 'ダブル将来', value: 'double' },
              ]}
            />
            {TRAINING_GAMES.map((game) => (
              <View
                key={game.type}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  marginTop: 10,
                  paddingTop: 10,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>{game.title}</Text>
                <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
                  {game.description}
                </Text>
                <Button label="開始" onPress={() => void startGame(game.type)} />
              </View>
            ))}
          </Card>

          {activeGame ? (
            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                ゲーム結果入力
              </Text>
              <Text style={{ color: theme.muted, marginTop: 4 }}>
                {activeGame.title} / 状態: {activeGame.status} / 記録 {activeThrows.length} 投
              </Text>
              <Field
                label="スコア"
                keyboardType="number-pad"
                value={throwForm.score}
                onChangeText={(score) => setThrowForm({ ...throwForm, score })}
              />
              <Field
                label="セグメント"
                placeholder="20 / BULL / OUT"
                value={throwForm.segment}
                onChangeText={(segment) => setThrowForm({ ...throwForm, segment })}
              />
              <Field
                label="倍率"
                keyboardType="number-pad"
                value={throwForm.multiplier}
                onChangeText={(multiplier) => setThrowForm({ ...throwForm, multiplier })}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button label="1投保存" onPress={() => void saveManualThrow()} />
                <Button
                  label="ゲーム完了"
                  variant="secondary"
                  onPress={() => void completeGame()}
                />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button label="3投を撮影" onPress={() => void pickPhoto('camera')} />
                <Button
                  label="写真から判定"
                  variant="secondary"
                  onPress={() => void pickPhoto('library')}
                />
              </View>
              <Text style={{ color: theme.muted, marginTop: 8, lineHeight: 20 }}>
                写真判定は完全自動確定せず、候補または手動タップ後にユーザー確認して保存します。
              </Text>
            </Card>
          ) : null}

          {games.length === 0 ? (
            <EmptyState
              title="ゲーム記録はまだありません"
              body="COUNT-UPなどを開始して、手入力または写真判定で記録してください。"
            />
          ) : null}

          {games.map((game) => {
            const summary = game.summary_json ? JSON.parse(game.summary_json) : null;
            return (
              <Card key={game.id}>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>
                  {game.title}
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4 }}>
                  {game.status} / {new Date(game.created_at).toLocaleString()}
                </Text>
                {summary ? (
                  <Text style={{ color: theme.text, marginTop: 6, lineHeight: 20 }}>
                    合計 {summary.totalScore} / 平均 {summary.throwAverage.toFixed(1)} / BULL{' '}
                    {summary.bullCount} / MARK {summary.totalMarks}
                  </Text>
                ) : null}
                <Button
                  label="このゲームへ入力"
                  variant="secondary"
                  onPress={() => setActiveGame(game)}
                />
              </Card>
            );
          })}

          {history.length > 0 ? (
            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>レベル履歴</Text>
              {history.map((entry) => (
                <Text key={entry.id} style={{ color: theme.muted, marginTop: 6 }}>
                  {entry.previous_level} → {entry.next_level} / {entry.reason}
                </Text>
              ))}
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={levelCheckOpen}
        animationType="slide"
        onRequestClose={() => setLevelCheckOpen(false)}
      >
        <Page
          title="レベルチェック"
          subtitle="DartsSupportApp独自基準。公式レーティングではありません。"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
            >
              <Field
                label="COUNT-UP 25%"
                keyboardType="decimal-pad"
                value={levelCheck.countUp}
                onChangeText={(countUp) => setLevelCheck({ ...levelCheck, countUp })}
              />
              <Field
                label="BULL 30投 20%"
                keyboardType="decimal-pad"
                value={levelCheck.bull}
                onChangeText={(bull) => setLevelCheck({ ...levelCheck, bull })}
              />
              <Field
                label="20ナンバー15投 15%"
                keyboardType="decimal-pad"
                value={levelCheck.twenty}
                onChangeText={(twenty) => setLevelCheck({ ...levelCheck, twenty })}
              />
              <Field
                label="CRICKET 20%"
                keyboardType="decimal-pad"
                value={levelCheck.cricket}
                onChangeText={(cricket) => setLevelCheck({ ...levelCheck, cricket })}
              />
              <Field
                label="FINISH 5問 10%"
                keyboardType="decimal-pad"
                value={levelCheck.finish}
                onChangeText={(finish) => setLevelCheck({ ...levelCheck, finish })}
              />
              <Field
                label="安定性 10%"
                keyboardType="decimal-pad"
                value={levelCheck.stability}
                onChangeText={(stability) => setLevelCheck({ ...levelCheck, stability })}
              />
              <Button label="保存" onPress={() => void saveLevelCheck()} />
              <Button label="閉じる" variant="ghost" onPress={() => setLevelCheckOpen(false)} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Page>
      </Modal>

      <InstructionModal
        drill={instructionDrill}
        theme={theme}
        onClose={() => setInstructionDrill(null)}
        onStart={(drill) => {
          setInstructionDrill(null);
          void startStandaloneDrill(drill);
        }}
      />

      <RoundDrillInputModal
        active={activeDrillInput}
        bullRound={bullRound}
        cricketRound={cricketRound}
        lastMessage={lastRoundMessage}
        mode={roundInputMode}
        theme={theme}
        onBullChange={setBullRound}
        onCricketChange={setCricketRound}
        onModeChange={setRoundInputMode}
        onSave={() => void saveRoundInput()}
        onUndo={() => void undoDrillRound()}
        onPause={() => {
          if (activeDrillInput) {
            void toggleDrillPause(activeDrillInput.session);
          }
        }}
        onClose={() => setActiveDrillInput(null)}
      />

      <Modal visible={customOpen} animationType="slide" onRequestClose={() => setCustomOpen(false)}>
        <Page
          title="カスタム練習"
          subtitle="独自ドリルを作成します。ビルトインとは別に保存されます。"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
            >
              <Field
                label="名前"
                value={customDrill.name}
                onChangeText={(name) => setCustomDrill({ ...customDrill, name })}
              />
              <Field
                label="目的"
                value={customDrill.purpose}
                onChangeText={(purpose) => setCustomDrill({ ...customDrill, purpose })}
              />
              <Segmented<DrillDefinitionRow['category']>
                value={customDrill.category}
                onChange={(category) => setCustomDrill({ ...customDrill, category })}
                options={[
                  { label: 'BULL', value: 'bull' },
                  { label: 'クリケット', value: 'cricket' },
                  { label: 'シングル', value: 'single' },
                  { label: 'フォーム', value: 'form' },
                  { label: 'カスタム', value: 'custom' },
                ]}
              />
              <Field
                label="対象ナンバー"
                value={customDrill.targetNumbers}
                onChangeText={(targetNumbers) => setCustomDrill({ ...customDrill, targetNumbers })}
              />
              <Field
                label="ラウンド数"
                keyboardType="number-pad"
                value={customDrill.rounds}
                onChangeText={(rounds) => setCustomDrill({ ...customDrill, rounds })}
              />
              <Field
                label="1ラウンド投数"
                keyboardType="number-pad"
                value={customDrill.throwsPerRound}
                onChangeText={(throwsPerRound) =>
                  setCustomDrill({ ...customDrill, throwsPerRound })
                }
              />
              <Field
                label="合計投数"
                keyboardType="number-pad"
                value={customDrill.totalThrows}
                onChangeText={(totalThrows) => setCustomDrill({ ...customDrill, totalThrows })}
              />
              <Field
                label="成功条件"
                value={customDrill.successRule}
                onChangeText={(successRule) => setCustomDrill({ ...customDrill, successRule })}
              />
              <Field
                label="やり方"
                multiline
                value={customDrill.instructions}
                onChangeText={(instructions) => setCustomDrill({ ...customDrill, instructions })}
              />
              <Field
                label="アプリへの入力方法"
                multiline
                value={customDrill.inputGuide}
                onChangeText={(inputGuide) => setCustomDrill({ ...customDrill, inputGuide })}
              />
              <Field
                label="得点/マーク方式"
                value={customDrill.scoringMode}
                onChangeText={(scoringMode) => setCustomDrill({ ...customDrill, scoringMode })}
              />
              <Field
                label="タイマー目安 分"
                keyboardType="number-pad"
                value={customDrill.estimatedMinutes}
                onChangeText={(estimatedMinutes) =>
                  setCustomDrill({ ...customDrill, estimatedMinutes })
                }
              />
              <Field
                label="対象レベル下限"
                value={customDrill.targetLevelMin}
                onChangeText={(targetLevelMin) =>
                  setCustomDrill({ ...customDrill, targetLevelMin })
                }
              />
              <Field
                label="対象レベル上限"
                value={customDrill.targetLevelMax}
                onChangeText={(targetLevelMax) =>
                  setCustomDrill({ ...customDrill, targetLevelMax })
                }
              />
              <Button
                label={
                  customDrill.isDailyMinimum ? 'デイリーミニマム対象' : 'デイリーミニマム対象外'
                }
                variant="secondary"
                onPress={() =>
                  setCustomDrill({
                    ...customDrill,
                    isDailyMinimum: !customDrill.isDailyMinimum,
                  })
                }
              />
              <Button
                label={customDrill.isFavorite ? 'お気に入り' : 'お気に入りにする'}
                variant="secondary"
                onPress={() =>
                  setCustomDrill({ ...customDrill, isFavorite: !customDrill.isFavorite })
                }
              />
              <Button
                label={customDrill.canUsePhoto ? '写真判定を使う' : '写真判定を使わない'}
                variant="ghost"
                onPress={() =>
                  setCustomDrill({ ...customDrill, canUsePhoto: !customDrill.canUsePhoto })
                }
              />
              <Button
                label={customDrill.canUseVideo ? '動画を記録する' : '動画を記録しない'}
                variant="ghost"
                onPress={() =>
                  setCustomDrill({ ...customDrill, canUseVideo: !customDrill.canUseVideo })
                }
              />
              <Button label="保存" onPress={() => void saveCustomDrill()} />
              <Button label="閉じる" variant="ghost" onPress={() => setCustomOpen(false)} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Page>
      </Modal>

      <Modal visible={photoOpen} animationType="slide" onRequestClose={() => setPhotoOpen(false)}>
        <Page
          title="写真判定"
          subtitle="完全自動ではありません。タップ位置を確認・修正して3投を確定します。"
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 56 }}>
            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                {photoStepLabel(photoStep)}
              </Text>
              <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
                B方式の手動キャリブレーションです。検出できない写真でも、盤面上をタップして手動確定できます。
              </Text>
              {photoUri ? (
                <Pressable
                  onPress={(event) => {
                    const { locationX, locationY } = event.nativeEvent;
                    handleBoardTap(locationX, locationY);
                  }}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    aspectRatio: 1,
                    borderWidth: 1,
                    borderColor: theme.border,
                    overflow: 'hidden',
                    borderRadius: 8,
                    backgroundColor: '#111827',
                  }}
                >
                  <Image
                    source={{ uri: photoUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="contain"
                  />
                  {[center, twentyPoint, ...outerPoints, ...throwPoints]
                    .filter(Boolean)
                    .map((point, index) => (
                      <View
                        key={index}
                        style={{
                          position: 'absolute',
                          left: (point as { x: number; y: number }).x - 7,
                          top: (point as { x: number; y: number }).y - 7,
                          width: 14,
                          height: 14,
                          borderRadius: 7,
                          backgroundColor:
                            index < 2
                              ? '#0f766e'
                              : index < 2 + outerPoints.length
                                ? '#f59e0b'
                                : '#dc2626',
                          borderWidth: 2,
                          borderColor: '#ffffff',
                        }}
                      />
                    ))}
                </Pressable>
              ) : null}
              <Text style={{ color: theme.muted, marginTop: 8, lineHeight: 20 }}>
                外周点 {outerPoints.length}/4以上 / 投擲点 {throwPoints.length}/3 / 自動候補{' '}
                {autoCandidates.length}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <Button
                  label="軽量候補を作る"
                  variant="secondary"
                  onPress={suggestLightweightCandidates}
                  disabled={outerPoints.length < 4}
                />
                <Button
                  label="外周を続ける"
                  variant="ghost"
                  onPress={() => setPhotoStep('outer')}
                  disabled={!center || !twentyPoint}
                />
                <Button
                  label="3投指定へ"
                  variant="secondary"
                  onPress={() => setPhotoStep('throws')}
                  disabled={outerPoints.length < 4}
                />
                <Button
                  label="最後を削除"
                  variant="ghost"
                  onPress={() => {
                    if (photoStep === 'throws' && throwPoints.length > 0) {
                      setThrowPoints(throwPoints.slice(0, -1));
                    } else if (outerPoints.length > 0) {
                      setOuterPoints(outerPoints.slice(0, -1));
                    }
                  }}
                />
              </View>
              {autoCandidates.length > 0 ? (
                <Text style={{ color: theme.warning, marginTop: 8, lineHeight: 20 }}>
                  候補は低信頼度です。重なり、黒い盤面、斜め撮影、影では外れる前提で、必ずタップ位置を修正してから確定してください。
                </Text>
              ) : null}
            </Card>

            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>確認</Text>
              {buildCalibration() && throwPoints.length > 0
                ? throwPoints.map((point, index) => {
                    const calibration = buildCalibration();
                    const normalized = calibration
                      ? normalizeFromCalibration(point, calibration)
                      : { x: 0, y: 0 };
                    const dart = scoreNormalizedPoint(
                      normalized.x,
                      normalized.y,
                      'photo_manual',
                      1,
                    );
                    return (
                      <Text key={index} style={{ color: theme.text, marginTop: 4 }}>
                        {index + 1}投目: {dart.score}点 / {String(dart.segment)} / x{' '}
                        {dart.x.toFixed(2)} y {dart.y.toFixed(2)}
                      </Text>
                    );
                  })
                : null}
              <Button label="3本を確定" onPress={() => void confirmPhotoThrows()} />
              <Button label="閉じる" variant="ghost" onPress={() => setPhotoOpen(false)} />
            </Card>
          </ScrollView>
        </Page>
      </Modal>
    </Page>
  );
}

function defaultTargets(gameType: TrainingGameType) {
  if (gameType === 'CRICKET_COUNT_UP') {
    return [20, 19, 18, 17, 16, 15, 'BULL'];
  }
  if (gameType === 'SHOOT_OUT') {
    return [...Array.from({ length: 20 }, (_, index) => index + 1), 'BULL'];
  }
  if (gameType === 'FINISH_TRAINER') {
    return [20, 32, 40, 50, 60];
  }
  return [];
}

function parseSegment(value: string, score: number, multiplier: number) {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'BULL') {
    return 'BULL';
  }
  if (normalized === 'OUT' || score === 0) {
    return 'OUT';
  }
  const number = Number.parseInt(normalized, 10);
  if (Number.isFinite(number)) {
    return number;
  }
  const scored = scoreNormalizedPoint(0, -0.4, 'manual_score');
  return score > 0 && multiplier > 0 ? Math.max(1, Math.round(score / multiplier)) : scored.segment;
}

export function cricketMarksForThrow(segment: number | 'BULL' | 'OUT', multiplier: number) {
  return calculateCricketMark(multiplier, segment);
}

function InstructionModal({
  drill,
  theme,
  onClose,
  onStart,
}: {
  drill: DrillDefinitionRow | null;
  theme: ReturnType<typeof useTheme>;
  onClose: () => void;
  onStart: (drill: DrillDefinitionRow) => void;
}) {
  const detail = drill ? drillInstructionDetail(drill) : null;
  return (
    <Modal visible={Boolean(drill)} animationType="slide" onRequestClose={onClose}>
      <Page title={drill?.name ?? 'やり方'} subtitle="練習の目的、狙い、入力方法を確認します。">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
          {drill && detail ? (
            <>
              <Card style={{ marginHorizontal: 0 }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                  {drill.name}
                </Text>
                <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
                  目的: {detail.shortDescription || drill.purpose}
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
                  対象レベル: {drill.target_level_min}-{drill.target_level_max} / 目安:{' '}
                  {drill.estimated_minutes}分 / 合計投数:{' '}
                  {drill.total_throws > 0 ? `${drill.total_throws}投` : '目標達成まで'}
                </Text>
                <Text style={{ color: theme.text, marginTop: 6, lineHeight: 20 }}>
                  狙う場所: {formatTargets(parseDrillTargets(drill))}
                </Text>
              </Card>
              <InstructionSection title="準備" items={detail.preparation} theme={theme} />
              <InstructionSection title="実施手順" items={detail.instructions} theme={theme} />
              <InstructionSection
                title="成功条件"
                items={[detail.successCondition || drill.success_rule || 'ユーザー設定に従う']}
                theme={theme}
              />
              <InstructionSection title="終了条件" items={[detail.finishCondition]} theme={theme} />
              <InstructionSection
                title="アプリへの入力方法"
                items={[detail.inputGuide]}
                theme={theme}
              />
              <InstructionSection
                title="保存される成績"
                items={detail.recordedMetrics}
                theme={theme}
              />
              <InstructionSection
                title="よくある間違い"
                items={detail.commonMistakes}
                theme={theme}
              />
              <InstructionSection title="練習時の注意点" items={detail.cautions} theme={theme} />
              <InstructionSection
                title="初心者向けのコツ"
                items={detail.beginnerTips}
                theme={theme}
              />
              <Card style={{ marginHorizontal: 0 }}>
                <Text style={{ color: theme.text, lineHeight: 20 }}>
                  写真判定: {detail.photoScoringSupported ? '利用できます' : '対象外です'} /
                  動画記録: {detail.videoRecommended ? '推奨します' : '任意です'}
                </Text>
                <Button label="開始" onPress={() => onStart(drill)} />
                <Button label="閉じる" variant="ghost" onPress={onClose} />
              </Card>
            </>
          ) : null}
        </ScrollView>
      </Page>
    </Modal>
  );
}

function InstructionSection({
  title,
  items,
  theme,
}: {
  title: string;
  items: string[];
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Card style={{ marginHorizontal: 0 }}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{title}</Text>
      {items.filter(Boolean).map((item, index) => (
        <Text
          key={`${title}-${index}`}
          style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}
        >
          {items.length > 1 ? `${index + 1}. ` : ''}
          {item}
        </Text>
      ))}
    </Card>
  );
}

function RoundDrillInputModal({
  active,
  bullRound,
  cricketRound,
  lastMessage,
  mode,
  theme,
  onBullChange,
  onCricketChange,
  onModeChange,
  onSave,
  onUndo,
  onPause,
  onClose,
}: {
  active: { session: DrillSessionRow; definition: DrillDefinitionRow } | null;
  bullRound: { inner: number; outer: number };
  cricketRound: {
    single: number;
    double: number;
    triple: number;
    catchNumber: string;
    catchMultiplier: string;
    catchCount: number;
  };
  lastMessage: string;
  mode: 'summary' | 'detail';
  theme: ReturnType<typeof useTheme>;
  onBullChange: (value: { inner: number; outer: number }) => void;
  onCricketChange: (value: typeof cricketRound) => void;
  onModeChange: (value: 'summary' | 'detail') => void;
  onSave: () => void;
  onUndo: () => void;
  onPause: () => void;
  onClose: () => void;
}) {
  const definition = active?.definition;
  const session = active?.session;
  const targets = definition ? parseDrillTargets(definition) : [];
  const bull = clampBullRound(bullRound.inner, bullRound.outer);
  const cricketUsed =
    cricketRound.single + cricketRound.double + cricketRound.triple + cricketRound.catchCount;
  const cricketMiss = Math.max(0, 3 - cricketUsed);
  const intendedTarget = definition && session ? currentIntendedTarget(definition, []) : 'BULL';

  return (
    <Modal visible={Boolean(active)} animationType="slide" onRequestClose={onClose}>
      <Page title={definition?.name ?? 'ラウンド入力'} subtitle="3投後にまとめて入力します。">
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
          {definition && session ? (
            <>
              <Card style={{ marginHorizontal: 0 }}>
                <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>
                  {definition.name}
                </Text>
                <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
                  現在の狙い: {String(intendedTarget)} / 次の狙い:{' '}
                  {String(nextDrillTarget(definition, intendedTarget))}
                </Text>
                <Text style={{ color: theme.text, marginTop: 6, fontSize: 17, fontWeight: '800' }}>
                  ラウンド {session.current_round} / 現在まで{' '}
                  {Math.max(0, session.current_round - 1) * 3 + session.current_throw}投
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
                  成功条件: {definition.success_rule ?? 'ユーザー設定に従う'}
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
                  入力方法: 3投を投げ終えてから、このラウンドの結果をまとめて確定します。
                </Text>
              </Card>

              <Segmented<'summary' | 'detail'>
                value={mode}
                onChange={onModeChange}
                options={[
                  { label: '本数だけ入力', value: 'summary' },
                  { label: '3投個別入力', value: 'detail' },
                ]}
              />

              {definition.category === 'bull' ? (
                <Card style={{ marginHorizontal: 0 }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                    今回の3投
                  </Text>
                  <CounterRow
                    label="INNER BULL"
                    value={bull.innerBull}
                    theme={theme}
                    onChange={(next) =>
                      onBullChange({
                        inner: clampBullRound(next, bull.outerBull).innerBull,
                        outer: clampBullRound(next, bull.outerBull).outerBull,
                      })
                    }
                  />
                  <CounterRow
                    label="OUTER BULL"
                    value={bull.outerBull}
                    theme={theme}
                    onChange={(next) =>
                      onBullChange({
                        inner: clampBullRound(bull.innerBull, next).innerBull,
                        outer: clampBullRound(bull.innerBull, next).outerBull,
                      })
                    }
                  />
                  <Text style={{ color: theme.text, marginTop: 8, lineHeight: 22 }}>
                    MISS {bull.miss} / ラウンドBULL {bull.bullCount}
                  </Text>
                  {mode === 'detail' ? (
                    <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
                      3投個別入力でも、確定時はINNER/OUTER/MISSの3本分として保存します。
                    </Text>
                  ) : null}
                </Card>
              ) : (
                <Card style={{ marginHorizontal: 0 }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                    対象ナンバーへの結果
                  </Text>
                  <Text style={{ color: theme.muted, marginTop: 4 }}>
                    有効対象: {formatTargets(targets)}
                  </Text>
                  <CounterRow
                    label="SINGLE"
                    value={cricketRound.single}
                    theme={theme}
                    onChange={(single) =>
                      onCricketChange(limitCricketRound({ ...cricketRound, single }))
                    }
                  />
                  <CounterRow
                    label="DOUBLE"
                    value={cricketRound.double}
                    theme={theme}
                    onChange={(double) =>
                      onCricketChange(limitCricketRound({ ...cricketRound, double }))
                    }
                  />
                  <CounterRow
                    label="TRIPLE"
                    value={cricketRound.triple}
                    theme={theme}
                    onChange={(triple) =>
                      onCricketChange(limitCricketRound({ ...cricketRound, triple }))
                    }
                  />
                  <Field
                    label="キャッチ着弾ナンバー"
                    value={cricketRound.catchNumber}
                    onChangeText={(catchNumber) =>
                      onCricketChange({ ...cricketRound, catchNumber })
                    }
                  />
                  <Field
                    label="キャッチ倍率 1/2/3"
                    keyboardType="number-pad"
                    value={cricketRound.catchMultiplier}
                    onChangeText={(catchMultiplier) =>
                      onCricketChange({ ...cricketRound, catchMultiplier })
                    }
                  />
                  <CounterRow
                    label="キャッチ本数"
                    value={cricketRound.catchCount}
                    theme={theme}
                    onChange={(catchCount) =>
                      onCricketChange(limitCricketRound({ ...cricketRound, catchCount }))
                    }
                  />
                  <Text style={{ color: theme.text, marginTop: 8, lineHeight: 22 }}>
                    その他 {cricketMiss}投 / 今回の対象マーク{' '}
                    {cricketRound.single + cricketRound.double * 2 + cricketRound.triple * 3}
                  </Text>
                </Card>
              )}

              {lastMessage ? (
                <Text style={{ color: theme.accent, fontWeight: '800', marginBottom: 8 }}>
                  {lastMessage}
                </Text>
              ) : null}
              <Button label="このラウンドを確定" onPress={onSave} />
              <Button label="直前ラウンドを戻す" variant="secondary" onPress={onUndo} />
              <Button
                label={session.status === 'paused' ? '再開' : '一時停止'}
                variant="ghost"
                onPress={onPause}
              />
              <Button label="閉じる" variant="ghost" onPress={onClose} />
            </>
          ) : null}
        </ScrollView>
      </Page>
    </Modal>
  );
}

function CounterRow({
  label,
  value,
  theme,
  onChange,
}: {
  label: string;
  value: number;
  theme: ReturnType<typeof useTheme>;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: theme.text, fontWeight: '800' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <Button label="-" variant="secondary" onPress={() => onChange(Math.max(0, value - 1))} />
        <Text
          style={{
            color: theme.text,
            fontSize: 22,
            fontWeight: '900',
            minWidth: 28,
            textAlign: 'center',
          }}
        >
          {value}
        </Text>
        <Button label="+" variant="secondary" onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

function drillInstructionDetail(drill: DrillDefinitionRow) {
  return {
    shortDescription: drill.short_description ?? drill.purpose,
    preparation: parseStringArray(drill.preparation_json, ['狙う場所と入力方法を確認する']),
    instructions: parseStringArray(drill.instructions_json, [
      '3投を1ラウンドとして投げる',
      'ラウンド終了後に結果をまとめて入力する',
    ]),
    successCondition: drill.success_condition ?? drill.success_rule ?? 'ユーザー設定に従う',
    finishCondition:
      drill.finish_condition ??
      (drill.total_throws > 0 ? `${drill.total_throws}投で終了` : '目標達成ラウンドで終了'),
    inputGuide: drill.input_guide ?? '3投まとめて入力します。',
    recordedMetrics: parseStringArray(drill.recorded_metrics_json, ['総投矢数', 'ラウンド別結果']),
    commonMistakes: parseStringArray(drill.common_mistakes_json, ['後でまとめて思い出そうとする']),
    cautions: parseStringArray(drill.cautions_json, ['痛みや強い疲労がある場合は中断する']),
    beginnerTips: parseStringArray(drill.beginner_tips_json, ['まず対象へ大きく集める']),
    photoScoringSupported: Boolean(drill.can_use_photo),
    videoRecommended: Boolean(drill.can_use_video),
  };
}

function parseStringArray(value: string | null | undefined, fallback: string[]) {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed.length > 0 ? parsed : fallback;
    }
  } catch {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return fallback;
}

function parseDrillTargets(drill: DrillDefinitionRow): (number | 'BULL' | string)[] {
  if (!drill.target_numbers) {
    return [];
  }
  try {
    const parsed = JSON.parse(drill.target_numbers);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return drill.target_numbers
      .split(',')
      .map((target) => target.trim())
      .filter(Boolean);
  }
}

function currentIntendedTarget(
  drill: DrillDefinitionRow,
  throws: { actual_number?: string | null; mark_count?: number }[],
): number | 'BULL' {
  const targets = parseDrillTargets(drill).filter(
    (target): target is number | 'BULL' => target === 'BULL' || Number.isFinite(Number(target)),
  );
  if (targets.length === 0) {
    return 'BULL';
  }
  const progress = new Map<string, number>();
  throws.forEach((throwResult) => {
    if (throwResult.actual_number && throwResult.mark_count) {
      progress.set(
        throwResult.actual_number,
        (progress.get(throwResult.actual_number) ?? 0) + throwResult.mark_count,
      );
    }
  });
  const target = [...targets].sort(
    (a, b) => (progress.get(String(a)) ?? 0) - (progress.get(String(b)) ?? 0),
  )[0];
  return target ?? 'BULL';
}

function nextDrillTarget(drill: DrillDefinitionRow, current: number | 'BULL') {
  const targets = parseDrillTargets(drill);
  const index = targets.findIndex((target) => String(target) === String(current));
  return targets[index + 1] ?? targets[0] ?? current;
}

function firstCricketCatchTarget(drill: DrillDefinitionRow) {
  const targets = parseDrillTargets(drill).map(String);
  return targets.find((target) => target !== '20') ?? targets[0] ?? '18';
}

function parseCricketTarget(value: string): number | 'BULL' | string {
  const trimmed = value.trim().toUpperCase();
  if (trimmed === 'BULL') {
    return 'BULL';
  }
  const number = Number.parseInt(trimmed, 10);
  return Number.isFinite(number) ? number : trimmed || 'その他';
}

function limitCricketRound(round: {
  single: number;
  double: number;
  triple: number;
  catchNumber: string;
  catchMultiplier: string;
  catchCount: number;
}) {
  const single = Math.max(0, Math.min(3, Math.trunc(round.single) || 0));
  const double = Math.max(0, Math.min(3 - single, Math.trunc(round.double) || 0));
  const triple = Math.max(0, Math.min(3 - single - double, Math.trunc(round.triple) || 0));
  const catchCount = Math.max(
    0,
    Math.min(3 - single - double - triple, Math.trunc(round.catchCount) || 0),
  );
  return { ...round, single, double, triple, catchCount };
}

function DrillCard({
  drill,
  onStart,
  onAdd,
  onFavorite,
  onInstructions,
  theme,
}: {
  drill: DrillDefinitionRow;
  onStart: () => void;
  onAdd: () => void;
  onFavorite: () => void;
  onInstructions: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: theme.border,
        marginTop: 10,
        paddingTop: 10,
      }}
    >
      <Text style={{ color: theme.text, fontWeight: '800' }}>{drill.name}</Text>
      <Text style={{ color: theme.muted, marginTop: 3, lineHeight: 20 }}>{drill.purpose}</Text>
      <Text style={{ color: theme.text, marginTop: 4, lineHeight: 20 }}>
        目安{drill.estimated_minutes}分 / {drill.total_throws}投 / 対象 {drill.target_level_min}-
        {drill.target_level_max}
      </Text>
      <Text style={{ color: theme.muted, marginTop: 3, lineHeight: 20 }}>
        前回結果: 未集計 / ベスト: 未集計
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        <Button label="やり方を見る" variant="secondary" onPress={onInstructions} />
        <Button label="開始" onPress={onStart} />
        <Button label="今日へ追加" variant="secondary" onPress={onAdd} />
        <Button
          label={drill.is_favorite ? 'お気に入り済' : 'お気に入り'}
          variant="ghost"
          onPress={onFavorite}
        />
      </View>
    </View>
  );
}

function photoStepLabel(step: 'center' | 'twenty' | 'outer' | 'throws') {
  return {
    center: 'BULL中心をタップ',
    twenty: '20方向の外周をタップ',
    outer: 'ダブル外周を4点以上タップ',
    throws: 'ダーツ先端を3本タップ',
  }[step];
}

function analyzeThrows(throws: TrainingThrowRow[]) {
  const bySegment = new Map<string, { hit: number; total: number }>();
  for (const dart of throws) {
    const key = dart.target_number ?? dart.segment ?? '未指定';
    const current = bySegment.get(key) ?? { hit: 0, total: 0 };
    current.total += 1;
    if (dart.score > 0) {
      current.hit += 1;
    }
    bySegment.set(key, current);
  }
  const ranked = [...bySegment.entries()].sort(
    (a, b) => b[1].hit / b[1].total - a[1].hit / a[1].total,
  );
  const photoThrows = throws.filter((dart) => dart.input_method.startsWith('photo')).length;
  return {
    totalThrows: throws.length,
    photoThrows,
    manualThrows: throws.length - photoThrows,
    strongNumbers: ranked
      .slice(0, 3)
      .map(([segment]) => segment)
      .join(', '),
    weakNumbers: ranked
      .slice(-3)
      .map(([segment]) => segment)
      .join(', '),
  };
}

function analyzeDrillResults(results: DrillResultRow[]) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(now.getDate() - 30);
  const recentWeakTargets = results
    .map((result) => result.weakest_target)
    .filter((target): target is string => Boolean(target))
    .slice(0, 5);
  return {
    resultCount: results.length,
    totalThrows: results.reduce((sum, result) => sum + result.total_throws, 0),
    weeklyThrows: results
      .filter((result) => new Date(result.created_at) >= weekAgo)
      .reduce((sum, result) => sum + result.total_throws, 0),
    monthlyThrows: results
      .filter((result) => new Date(result.created_at) >= monthAgo)
      .reduce((sum, result) => sum + result.total_throws, 0),
    averageSuccessRate: results.length
      ? results.reduce((sum, result) => sum + result.success_rate, 0) / results.length
      : 0,
    averageBullRate: results.length
      ? results.reduce((sum, result) => sum + result.bull_rate, 0) / results.length
      : 0,
    weakTargets: [...new Set(recentWeakTargets)].join(', '),
  };
}
