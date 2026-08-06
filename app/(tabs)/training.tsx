import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';

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
  LevelHistoryRow,
  SkillProfileRow,
  TrainingGameSessionRow,
  TrainingThrowRow,
} from '../../src/db/repository';
import {
  TRAINING_GAMES,
  calculateCricketMark,
  scoreNormalizedPoint,
  type BullMode,
  type FinishOutMode,
  type TrainingGameType,
  type TrainingThrowInput,
} from '../../src/domain/training';
import { useSupportRepository } from '../../src/features/support/SupportDatabaseProvider';

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function TrainingScreen() {
  const theme = useTheme();
  const { repository, unavailableView } = useSupportRepository();
  const [profile, setProfile] = useState<SkillProfileRow | null>(null);
  const [history, setHistory] = useState<LevelHistoryRow[]>([]);
  const [games, setGames] = useState<TrainingGameSessionRow[]>([]);
  const [throwsByGame, setThrowsByGame] = useState<Record<string, TrainingThrowRow[]>>({});
  const [recommendations, setRecommendations] = useState<
    Awaited<ReturnType<NonNullable<typeof repository>['listLevelRecommendations']>>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bullMode, setBullMode] = useState<BullMode>('fat_bull');
  const [outMode, setOutMode] = useState<FinishOutMode>('single');
  const [activeGame, setActiveGame] = useState<TrainingGameSessionRow | null>(null);
  const [throwForm, setThrowForm] = useState({ score: '', segment: '', multiplier: '1' });
  const [levelCheckOpen, setLevelCheckOpen] = useState(false);
  const [levelCheck, setLevelCheck] = useState({
    countUp: '',
    bull: '',
    twenty: '',
    cricket: '',
    finish: '',
    stability: '',
  });

  const reload = useCallback(async () => {
    if (!repository) {
      return;
    }
    setIsLoading(true);
    try {
      const [nextProfile, nextHistory, nextGames, nextRecommendations] = await Promise.all([
        repository.getSkillProfile(),
        repository.listLevelHistory(),
        repository.listTrainingGames(),
        repository.listLevelRecommendations(todayIso()),
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

  const activeThrows = useMemo(
    () => (activeGame ? (throwsByGame[activeGame.id] ?? []) : []),
    [activeGame, throwsByGame],
  );

  if (!repository) {
    return unavailableView;
  }
  const repo = repository;

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
