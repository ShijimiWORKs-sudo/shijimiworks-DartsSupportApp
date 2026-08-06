import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button, Card, EmptyState, Loading, Page, useTheme } from '../../components/ui';
import type {
  ImprovementIssueStatus,
  NextFocusStatus,
  RecommendationStatus,
} from '../../src/domain/types';
import { useSupportRepository } from '../../src/features/support/SupportDatabaseProvider';
import type { ImprovementIssueRow, NextFocusRow, RecommendationRow } from '../../src/db/repository';

const todayIso = () => new Date().toISOString().slice(0, 10);

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ImprovementsScreen() {
  const theme = useTheme();
  const { repository, unavailableView } = useSupportRepository();
  const [issues, setIssues] = useState<ImprovementIssueRow[]>([]);
  const [focusItems, setFocusItems] = useState<NextFocusRow[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!repository) {
      return;
    }
    setIsLoading(true);
    try {
      const [nextIssues, nextFocus, nextRecommendations] = await Promise.all([
        repository.listIssues(),
        repository.listNextFocus(),
        repository.listRecommendations(),
      ]);
      setIssues(nextIssues);
      setFocusItems(nextFocus);
      setRecommendations(nextRecommendations);
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

  const activeFocus = useMemo(
    () => focusItems.filter((item) => item.status === 'active').slice(0, 2),
    [focusItems],
  );

  if (!repository) {
    return unavailableView;
  }
  const repo = repository;

  async function changeIssueStatus(issueId: string, status: ImprovementIssueStatus) {
    await repo.updateIssueStatus(issueId, status);
    await reload();
  }

  async function changeFocusStatus(focusId: string, status: NextFocusStatus) {
    await repo.updateNextFocusStatus(focusId, status);
    await reload();
  }

  async function applyRecommendation(
    recommendation: RecommendationRow,
    date: string,
    saveAsTemplate: boolean,
  ) {
    await repo.applyRecommendation(recommendation, date, saveAsTemplate);
    await reload();
    Alert.alert(
      '追加しました',
      saveAsTemplate ? 'テンプレートにも保存しました。' : `${date} の練習へ追加しました。`,
    );
  }

  return (
    <Page title="改善管理" subtitle="AI評価を事実として断定せず、ユーザー確認で継続管理します。">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading ? <Loading /> : null}

        <Card>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>次回の改善点</Text>
          <Text style={{ color: theme.muted, marginTop: 4 }}>
            表示は最大2件です。必要に応じて完了・延期・却下できます。
          </Text>
          {activeFocus.length === 0 ? (
            <Text style={{ color: theme.muted, marginTop: 10 }}>
              現在の次回フォーカスはありません。
            </Text>
          ) : (
            activeFocus.map((focus) => (
              <View
                key={focus.id}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  marginTop: 10,
                  paddingTop: 10,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  {focus.priority === 1 ? '最優先' : '第2優先'}: {focus.title}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Button
                    label="完了"
                    onPress={() => void changeFocusStatus(focus.id, 'completed')}
                  />
                  <Button
                    label="延期"
                    variant="secondary"
                    onPress={() => void changeFocusStatus(focus.id, 'deferred')}
                  />
                  <Button
                    label="却下"
                    variant="danger"
                    onPress={() => void changeFocusStatus(focus.id, 'rejected')}
                  />
                </View>
              </View>
            ))
          )}
        </Card>

        {issues.length === 0 ? (
          <EmptyState
            title="改善課題はまだありません"
            body="ChatGPT評価を読み込むと候補が作成されます。保存前後に内容を確認し、状態変更は手動で行います。"
          />
        ) : (
          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>改善課題</Text>
            {issues.map((issue) => (
              <View
                key={issue.id}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  marginTop: 10,
                  paddingTop: 10,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>{issue.title}</Text>
                <Text style={{ color: theme.muted, marginTop: 4 }}>
                  {statusLabel(issue.status)} / 優先度 {issue.priority} /{' '}
                  {issue.target_part || '対象未登録'}
                </Text>
                {issue.detail ? (
                  <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
                    {issue.detail}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {(
                    [
                      'CONTINUING',
                      'IMPROVING',
                      'RESOLVED',
                      'RECURRED',
                      'UNKNOWN',
                    ] as ImprovementIssueStatus[]
                  ).map((status) => (
                    <Button
                      key={status}
                      label={statusLabel(status)}
                      variant={issue.status === status ? 'primary' : 'secondary'}
                      onPress={() => void changeIssueStatus(issue.id, status)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </Card>
        )}

        {recommendations.length === 0 ? (
          <EmptyState
            title="練習候補はまだありません"
            body="ChatGPT評価の「おすすめ練習メニュー」を読み込むと候補として保存されます。"
          />
        ) : (
          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              次回練習メニュー候補
            </Text>
            <Text style={{ color: theme.muted, marginTop: 4 }}>
              ラウンド数や投数は勝手に補完しません。今日の練習に追加後、必要値を確認してください。
            </Text>
            {recommendations.map((recommendation) => (
              <View
                key={recommendation.id}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  marginTop: 10,
                  paddingTop: 10,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>{recommendation.title}</Text>
                <Text style={{ color: theme.muted, marginTop: 4 }}>
                  状態: {recommendationStatusLabel(recommendation.status)}
                </Text>
                {recommendation.detail ? (
                  <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
                    {recommendation.detail}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Button
                    label="今日に追加"
                    onPress={() => void applyRecommendation(recommendation, todayIso(), false)}
                  />
                  <Button
                    label="明日に追加"
                    variant="secondary"
                    onPress={() => void applyRecommendation(recommendation, addDays(1), false)}
                  />
                  <Button
                    label="テンプレート保存"
                    variant="secondary"
                    onPress={() => void applyRecommendation(recommendation, todayIso(), true)}
                  />
                  <Button
                    label="却下"
                    variant="danger"
                    onPress={() => {
                      Alert.alert('候補を却下しますか', '候補一覧には状態付きで残ります。', [
                        { text: 'キャンセル', style: 'cancel' },
                        {
                          text: '却下',
                          style: 'destructive',
                          onPress: () =>
                            void repo
                              .updateRecommendationStatus(recommendation.id, 'rejected')
                              .then(reload),
                        },
                      ]);
                    }}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Page>
  );
}

function statusLabel(status: ImprovementIssueStatus) {
  return (
    {
      NEW: '新規',
      CONTINUING: '継続中',
      IMPROVING: '改善傾向',
      RESOLVED: '解決済み',
      RECURRED: '再発',
      UNKNOWN: '判断不能',
    }[status] ?? status
  );
}

function recommendationStatusLabel(status: RecommendationStatus) {
  return (
    {
      candidate: '候補',
      added: '追加済み',
      saved_template: 'テンプレート保存済み',
      rejected: '却下',
    }[status] ?? status
  );
}
