import { useFocusEffect, useRouter } from 'expo-router';
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
import {
  advanceThrow,
  createInitialProgress,
  markRoundComplete,
  markSetComplete,
  summarizeTodayProgress,
  undoProgress,
  validatePracticeMenuInput,
} from '../../src/domain/practice';
import type { PracticeMenuInput, PracticeProgress, RepeatType } from '../../src/domain/types';
import { useSupportRepository } from '../../src/features/support/SupportDatabaseProvider';
import type { DailyPracticeItemRow, PracticeSessionRow } from '../../src/db/repository';

const todayIso = () => new Date().toISOString().slice(0, 10);

const initialForm = (): PracticeMenuInput => ({
  title: '',
  purpose: '',
  targetArea: '',
  rounds: '8',
  throwsPerRound: '3',
  sets: '1',
  targetValue: '',
  plannedMinutes: '20',
  restSeconds: '60',
  focusNote: '',
  memo: '',
  sortOrder: '0',
  isFavorite: false,
  plannedDate: todayIso(),
  repeatType: 'once',
  repeatWeekdays: '',
  isAiSuggested: false,
});

export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { repository, unavailableView } = useSupportRepository();
  const [items, setItems] = useState<DailyPracticeItemRow[]>([]);
  const [templates, setTemplates] = useState<DailyPracticeItemRow[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<PracticeMenuInput>(initialForm);
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [editingOpen, setEditingOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<DailyPracticeItemRow | null>(null);
  const [activeSession, setActiveSession] = useState<PracticeSessionRow | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState({
    actualMinutes: '',
    actualRounds: '',
    actualSets: '',
    totalThrows: '',
    bullCount: '',
    optionalScore: '',
    achievementLevel: 'partial',
    conditionLabel: '',
    bodyFeel: '',
    goodPoints: '',
    concernPoints: '',
    nextFocusNote: '',
    memo: '',
  });

  const reload = useCallback(async () => {
    if (!repository) {
      return;
    }
    setIsLoading(true);
    try {
      const [nextItems, nextTemplates, nextSessions] = await Promise.all([
        repository.listTodayItems(todayIso()),
        repository.listTemplates(),
        repository.listSessions(),
      ]);
      setItems(nextItems);
      setTemplates(nextTemplates);
      setSessions(nextSessions);
      const running = nextSessions.find((session) =>
        ['in_progress', 'paused'].includes(session.status),
      );
      setActiveSession(running ?? null);
      setActiveItem(nextItems.find((item) => item.id === running?.daily_item_id) ?? null);
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

  const summary = useMemo(() => summarizeTodayProgress(items), [items]);
  const nextItem = items.find((item) => item.status === 'planned');

  if (!repository) {
    return unavailableView;
  }
  const repo = repository;

  async function addMenu() {
    const validated = validatePracticeMenuInput({
      ...form,
      plannedDate: form.plannedDate || todayIso(),
    });
    if (!validated.ok) {
      Alert.alert('入力を確認してください', validated.errors.join('\n'));
      return;
    }
    try {
      await repo.addPracticeMenu(validated.value, saveAsTemplate);
      setForm(initialForm());
      setEditingOpen(false);
      await reload();
    } catch (error) {
      Alert.alert(
        '保存できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function start(item: DailyPracticeItemRow) {
    try {
      if (item.drillDefinitionId) {
        const drillSessionId = await repo.startDrillSession(item.drillDefinitionId, null);
        await repo.setItemStatus(item.id, 'in_progress');
        await reload();
        router.push({
          pathname: '/training',
          params: { drillSessionId },
        });
        return;
      }
      const sessionId = await repo.startSession(item);
      await reload();
      const session = (await repo.listSessions()).find((candidate) => candidate.id === sessionId);
      setActiveItem(item);
      setActiveSession(session ?? null);
    } catch (error) {
      Alert.alert(
        '開始できませんでした',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function saveProgress(progress: PracticeProgress) {
    if (!activeSession) {
      return;
    }
    await repo.updateSessionProgress(activeSession.id, progress);
    await reload();
  }

  function currentProgress(): PracticeProgress {
    if (!activeSession) {
      return createInitialProgress();
    }
    return {
      currentSet: activeSession.current_set,
      currentRound: activeSession.current_round,
      currentThrow: activeSession.current_throw,
      elapsedSeconds: activeSession.elapsed_seconds,
      status: activeSession.status,
      undoSnapshot: activeSession.undo_snapshot_json
        ? (JSON.parse(activeSession.undo_snapshot_json) as PracticeProgress)
        : null,
    };
  }

  async function completeActive() {
    if (!activeSession) {
      return;
    }
    await repo.completeSession(activeSession.id, activeItem?.id ?? null);
    setResultOpen(true);
    await reload();
  }

  async function saveResult() {
    if (!activeSession) {
      return;
    }
    const toInt = (value: string) => {
      const trimmed = value.trim();
      return trimmed ? Number.parseInt(trimmed, 10) : null;
    };
    await repo.savePracticeResult({
      practiceSessionId: activeSession.id,
      actualMinutes: toInt(result.actualMinutes),
      actualRounds: toInt(result.actualRounds),
      actualSets: toInt(result.actualSets),
      totalThrows: toInt(result.totalThrows),
      bullCount: toInt(result.bullCount),
      optionalScore: result.optionalScore,
      achievementLevel: result.achievementLevel,
      conditionLabel: result.conditionLabel,
      bodyFeel: result.bodyFeel,
      goodPoints: result.goodPoints,
      concernPoints: result.concernPoints,
      nextFocusNote: result.nextFocusNote,
      memo: result.memo,
    });
    setResultOpen(false);
    Alert.alert('保存しました', '練習結果を記録しました。');
  }

  return (
    <Page
      title="今日の練習"
      subtitle={`${todayIso()} / 完了 ${summary.completed}/${summary.total} / ${summary.completionRate}% / 次: ${nextItem?.title ?? 'なし'}`}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>進捗</Text>
            <Text style={{ color: theme.muted, marginTop: 6 }}>
              残り {summary.remaining} 件 / 実施時間 {Math.round(summary.elapsedSeconds / 60)} 分
            </Text>
            <Button label="メニューを手入力" onPress={() => setEditingOpen(true)} />
          </Card>

          {activeSession && activeItem ? (
            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>練習進行</Text>
              <Text style={{ color: theme.muted, marginTop: 4 }}>{activeItem.title}</Text>
              <Text style={{ color: theme.text, marginTop: 10, fontSize: 17, fontWeight: '700' }}>
                セット {activeSession.current_set} / ラウンド {activeSession.current_round} / 投数{' '}
                {activeSession.current_throw}
              </Text>
              <Text style={{ color: theme.muted, marginTop: 4 }}>
                目標: {activeItem.targetValue || '未登録'} / 意識:{' '}
                {activeItem.focusNote || '未登録'}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <Button
                  label="次の投数"
                  onPress={() =>
                    void saveProgress(
                      advanceThrow(
                        currentProgress(),
                        activeItem.throwsPerRound,
                        activeItem.rounds,
                        activeItem.sets,
                      ),
                    )
                  }
                />
                <Button
                  label="ラウンド完了"
                  variant="secondary"
                  onPress={() =>
                    void saveProgress(markRoundComplete(currentProgress(), activeItem.rounds))
                  }
                />
                <Button
                  label="セット完了"
                  variant="secondary"
                  onPress={() =>
                    void saveProgress(markSetComplete(currentProgress(), activeItem.sets))
                  }
                />
                <Button
                  label="Undo"
                  variant="ghost"
                  onPress={() => void saveProgress(undoProgress(currentProgress()))}
                />
                <Button
                  label={activeSession.status === 'paused' ? '再開' : '一時停止'}
                  variant="ghost"
                  onPress={() =>
                    void saveProgress({
                      ...currentProgress(),
                      status: activeSession.status === 'paused' ? 'in_progress' : 'paused',
                    })
                  }
                />
                <Button label="完了" onPress={() => void completeActive()} />
                <Button
                  label="中断"
                  variant="danger"
                  onPress={() => {
                    Alert.alert('中断しますか', '進行中セッションを中断として保存します。', [
                      { text: 'キャンセル', style: 'cancel' },
                      {
                        text: '中断',
                        style: 'destructive',
                        onPress: () => {
                          void saveProgress({ ...currentProgress(), status: 'aborted' });
                          if (activeItem) {
                            void repo.setItemStatus(activeItem.id, 'aborted').then(reload);
                          }
                        },
                      },
                    ]);
                  }}
                />
              </View>
            </Card>
          ) : null}

          {isLoading ? <Loading /> : null}
          {!isLoading && items.length === 0 ? (
            <EmptyState
              title="今日のメニューはまだありません"
              body="メニューを手入力するか、テンプレートから今日の練習へ追加してください。"
            />
          ) : null}

          {items.map((item, index) => (
            <Card key={item.id}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>
                {index + 1}. {item.title}
              </Text>
              <Text style={{ color: theme.muted, marginTop: 4 }}>
                {item.purpose || '目的未登録'} / {item.targetArea || '狙う場所未登録'}
              </Text>
              <Text style={{ color: theme.muted, marginTop: 4 }}>
                {item.sets ?? '-'}セット / {item.rounds ?? '-'}R / {item.throwsPerRound ?? '-'}投 /
                状態: {statusLabel(item.status)}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <Button
                  label="開始"
                  onPress={() => void start(item)}
                  disabled={item.status === 'completed'}
                />
                <Button
                  label="結果入力"
                  variant="secondary"
                  onPress={() => {
                    setActiveItem(item);
                    setActiveSession(
                      sessions.find((session) => session.daily_item_id === item.id) ?? null,
                    );
                    setResultOpen(true);
                  }}
                />
                <Button
                  label="上へ"
                  variant="ghost"
                  onPress={() => void repo.moveItem(item.id, -1).then(reload)}
                />
                <Button
                  label="下へ"
                  variant="ghost"
                  onPress={() => void repo.moveItem(item.id, 1).then(reload)}
                />
                <Button
                  label="スキップ"
                  variant="ghost"
                  onPress={() => void repo.setItemStatus(item.id, 'skipped').then(reload)}
                />
              </View>
            </Card>
          ))}

          {templates.length > 0 ? (
            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                テンプレート
              </Text>
              {templates.map((template) => (
                <View
                  key={template.id}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    marginTop: 10,
                    paddingTop: 10,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: '700' }}>{template.title}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    <Button
                      label="今日へ追加"
                      onPress={() =>
                        void repo.addTemplateToDate(template.id, todayIso()).then(reload)
                      }
                    />
                    <Button
                      label="明日へ追加"
                      variant="secondary"
                      onPress={() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        void repo
                          .addTemplateToDate(template.id, tomorrow.toISOString().slice(0, 10))
                          .then(reload);
                      }}
                    />
                    <Button
                      label="削除"
                      variant="danger"
                      onPress={() =>
                        Alert.alert(
                          '削除しますか',
                          '過去の練習記録はテンプレートのスナップショットで残ります。',
                          [
                            { text: 'キャンセル', style: 'cancel' },
                            {
                              text: '削除',
                              style: 'destructive',
                              onPress: () => void repo.deleteTemplate(template.id).then(reload),
                            },
                          ],
                        )
                      }
                    />
                  </View>
                </View>
              ))}
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={editingOpen}
        animationType="slide"
        onRequestClose={() => setEditingOpen(false)}
      >
        <Page
          title="メニュー手入力"
          subtitle="メニュー名以外は任意です。数値は安全な範囲で保存します。"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
            >
              <Field
                label="メニュー名"
                value={form.title}
                onChangeText={(title) => setForm({ ...form, title })}
              />
              <Field
                label="練習目的"
                value={form.purpose as string}
                onChangeText={(purpose) => setForm({ ...form, purpose })}
              />
              <Field
                label="狙う場所"
                value={form.targetArea as string}
                onChangeText={(targetArea) => setForm({ ...form, targetArea })}
              />
              <Field
                label="ラウンド数"
                keyboardType="number-pad"
                value={String(form.rounds ?? '')}
                onChangeText={(rounds) => setForm({ ...form, rounds })}
              />
              <Field
                label="1ラウンドの投数"
                keyboardType="number-pad"
                value={String(form.throwsPerRound ?? '')}
                onChangeText={(throwsPerRound) => setForm({ ...form, throwsPerRound })}
              />
              <Field
                label="セット数"
                keyboardType="number-pad"
                value={String(form.sets ?? '')}
                onChangeText={(sets) => setForm({ ...form, sets })}
              />
              <Field
                label="目標値"
                value={form.targetValue as string}
                onChangeText={(targetValue) => setForm({ ...form, targetValue })}
              />
              <Field
                label="予定時間 分"
                keyboardType="number-pad"
                value={String(form.plannedMinutes ?? '')}
                onChangeText={(plannedMinutes) => setForm({ ...form, plannedMinutes })}
              />
              <Field
                label="休憩時間 秒"
                keyboardType="number-pad"
                value={String(form.restSeconds ?? '')}
                onChangeText={(restSeconds) => setForm({ ...form, restSeconds })}
              />
              <Field
                label="意識すること"
                multiline
                value={form.focusNote as string}
                onChangeText={(focusNote) => setForm({ ...form, focusNote })}
              />
              <Field
                label="自由メモ"
                multiline
                value={form.memo as string}
                onChangeText={(memo) => setForm({ ...form, memo })}
              />
              <Field
                label="並び順"
                keyboardType="number-pad"
                value={String(form.sortOrder ?? '')}
                onChangeText={(sortOrder) => setForm({ ...form, sortOrder })}
              />
              <Field
                label="実施日"
                value={form.plannedDate}
                onChangeText={(plannedDate) => setForm({ ...form, plannedDate })}
              />
              <Segmented<RepeatType>
                value={form.repeatType}
                onChange={(repeatType) => setForm({ ...form, repeatType })}
                options={[
                  { label: '今回だけ', value: 'once' },
                  { label: '毎日', value: 'daily' },
                  { label: '曜日指定', value: 'weekly' },
                ]}
              />
              <Button
                label={form.isFavorite ? 'お気に入りを外す' : 'お気に入りにする'}
                variant="secondary"
                onPress={() => setForm({ ...form, isFavorite: !form.isFavorite })}
              />
              <Button
                label={saveAsTemplate ? 'テンプレート保存あり' : 'テンプレート保存なし'}
                variant="secondary"
                onPress={() => setSaveAsTemplate(!saveAsTemplate)}
              />
              <Button label="保存" onPress={() => void addMenu()} />
              <Button label="キャンセル" variant="ghost" onPress={() => setEditingOpen(false)} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Page>
      </Modal>

      <Modal visible={resultOpen} animationType="slide" onRequestClose={() => setResultOpen(false)}>
        <Page
          title="練習結果"
          subtitle={activeItem?.title ?? activeSession?.title_snapshot ?? '手入力'}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
            >
              <Field
                label="実施時間 分"
                keyboardType="number-pad"
                value={result.actualMinutes}
                onChangeText={(actualMinutes) => setResult({ ...result, actualMinutes })}
              />
              <Field
                label="実施ラウンド数"
                keyboardType="number-pad"
                value={result.actualRounds}
                onChangeText={(actualRounds) => setResult({ ...result, actualRounds })}
              />
              <Field
                label="実施セット数"
                keyboardType="number-pad"
                value={result.actualSets}
                onChangeText={(actualSets) => setResult({ ...result, actualSets })}
              />
              <Field
                label="総投数"
                keyboardType="number-pad"
                value={result.totalThrows}
                onChangeText={(totalThrows) => setResult({ ...result, totalThrows })}
              />
              <Field
                label="BULL本数"
                keyboardType="number-pad"
                value={result.bullCount}
                onChangeText={(bullCount) => setResult({ ...result, bullCount })}
              />
              <Field
                label="任意スコア"
                value={result.optionalScore}
                onChangeText={(optionalScore) => setResult({ ...result, optionalScore })}
              />
              <Segmented
                value={result.achievementLevel}
                onChange={(achievementLevel) => setResult({ ...result, achievementLevel })}
                options={[
                  { label: '未達成', value: 'not_achieved' },
                  { label: '一部達成', value: 'partial' },
                  { label: '達成', value: 'achieved' },
                  { label: '目標以上', value: 'exceeded' },
                ]}
              />
              <Field
                label="今日の調子"
                value={result.conditionLabel}
                onChangeText={(conditionLabel) => setResult({ ...result, conditionLabel })}
              />
              <Field
                label="本人の感覚"
                multiline
                value={result.bodyFeel}
                onChangeText={(bodyFeel) => setResult({ ...result, bodyFeel })}
              />
              <Field
                label="良かった点"
                multiline
                value={result.goodPoints}
                onChangeText={(goodPoints) => setResult({ ...result, goodPoints })}
              />
              <Field
                label="気になった点"
                multiline
                value={result.concernPoints}
                onChangeText={(concernPoints) => setResult({ ...result, concernPoints })}
              />
              <Field
                label="次回意識したいこと"
                multiline
                value={result.nextFocusNote}
                onChangeText={(nextFocusNote) => setResult({ ...result, nextFocusNote })}
              />
              <Field
                label="自由メモ"
                multiline
                value={result.memo}
                onChangeText={(memo) => setResult({ ...result, memo })}
              />
              <Button label="保存" onPress={() => void saveResult()} />
              <Button label="キャンセル" variant="ghost" onPress={() => setResultOpen(false)} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Page>
      </Modal>
    </Page>
  );
}

function statusLabel(status: string) {
  return (
    {
      planned: '予定',
      in_progress: '実行中',
      paused: '一時停止',
      completed: '完了',
      skipped: 'スキップ',
      aborted: '中断',
    }[status] ?? status
  );
}
