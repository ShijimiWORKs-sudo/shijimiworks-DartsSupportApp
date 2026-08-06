import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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
import {
  assessmentHeadingMap,
  emptyAssessmentSections,
  generateChatGptPrompt,
  parseChatGptAssessment,
} from '../../src/domain/assessment';
import type { AssessmentSections, VideoDirection } from '../../src/domain/types';
import { useSupportRepository } from '../../src/features/support/SupportDatabaseProvider';
import type {
  AssessmentRow,
  FormVideoRow,
  ImprovementIssueRow,
  PracticeSessionRow,
} from '../../src/db/repository';

const directionOptions: { label: string; value: VideoDirection }[] = [
  { label: '正面', value: 'front' },
  { label: '横', value: 'side' },
  { label: '後方', value: 'back' },
  { label: 'スロー', value: 'slow' },
  { label: 'その他', value: 'other' },
];

export default function FormScreen() {
  const theme = useTheme();
  const { repository, unavailableView } = useSupportRepository();
  const [sessions, setSessions] = useState<PracticeSessionRow[]>([]);
  const [videos, setVideos] = useState<FormVideoRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [issues, setIssues] = useState<ImprovementIssueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoDraft, setVideoDraft] = useState({
    uri: '',
    direction: 'side' as VideoDirection,
    memo: '',
    handedness: '',
    dartWeightGrams: '',
    durationMs: null as number | null,
    fileSizeBytes: null as number | null,
  });
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [sections, setSections] = useState<AssessmentSections>(emptyAssessmentSections());
  const [recognizedCount, setRecognizedCount] = useState(0);
  const [showRaw, setShowRaw] = useState(false);

  const reload = useCallback(async () => {
    if (!repository) {
      return;
    }
    setIsLoading(true);
    try {
      const [nextSessions, nextVideos, nextAssessments, nextIssues] = await Promise.all([
        repository.listSessions(),
        repository.listVideos(),
        repository.listAssessments(),
        repository.listIssues(),
      ]);
      setSessions(nextSessions);
      setVideos(nextVideos);
      setAssessments(nextAssessments);
      setIssues(nextIssues);
      setSelectedSessionId((current) => current ?? nextSessions[0]?.id ?? null);
      setSelectedVideoId((current) => current ?? nextVideos[0]?.id ?? null);
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

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? null;
  const latestAssessment = assessments[0] ?? null;
  const previousAssessment = assessments[1] ?? null;
  const parsedLatest = useMemo(
    () =>
      latestAssessment ? (JSON.parse(latestAssessment.parsed_json) as AssessmentSections) : null,
    [latestAssessment],
  );
  const parsedPrevious = useMemo(
    () =>
      previousAssessment
        ? (JSON.parse(previousAssessment.parsed_json) as AssessmentSections)
        : null,
    [previousAssessment],
  );

  if (!repository) {
    return unavailableView;
  }
  const repo = repository;

  async function pickVideo(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        '権限が必要です',
        source === 'camera'
          ? 'カメラ権限が拒否されました。'
          : '写真ライブラリ権限が拒否されました。',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            videoMaxDuration: 120,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.8,
          });

    if (result.canceled) {
      Alert.alert('選択をキャンセルしました', '動画は追加されていません。');
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      Alert.alert('動画を読み込めません', '選択した動画の参照先が見つかりません。');
      return;
    }
    if (asset.fileSize && asset.fileSize > 500 * 1024 * 1024) {
      Alert.alert('動画が大きすぎます', '初期版では500MB以下の動画を目安にしてください。');
      return;
    }

    setVideoDraft({
      ...videoDraft,
      uri: asset.uri,
      durationMs: asset.duration ?? null,
      fileSizeBytes: asset.fileSize ?? null,
    });
  }

  async function saveVideo() {
    if (!videoDraft.uri) {
      Alert.alert('動画が未選択です', '撮影またはライブラリから動画を選んでください。');
      return;
    }
    await repo.saveVideo({
      practiceSessionId: selectedSessionId,
      direction: videoDraft.direction,
      uri: videoDraft.uri,
      durationMs: videoDraft.durationMs,
      fileSizeBytes: videoDraft.fileSizeBytes,
      handedness: videoDraft.handedness,
      dartWeightGrams: videoDraft.dartWeightGrams.trim()
        ? Number(videoDraft.dartWeightGrams)
        : null,
      memo: videoDraft.memo,
    });
    setVideoDraft({ ...videoDraft, uri: '', memo: '' });
    await reload();
    Alert.alert('保存しました', '動画メタデータを練習記録へ関連付けました。');
  }

  async function previewVideo(uri: string) {
    try {
      const supported = await Linking.canOpenURL(uri);
      if (!supported) {
        Alert.alert(
          '動画を開けません',
          '端末内の参照先が無効になっている可能性があります。必要に応じて動画を再選択してください。',
        );
        return;
      }
      await Linking.openURL(uri);
    } catch (error) {
      Alert.alert(
        '動画を開けません',
        error instanceof Error ? error.message : '動画の参照先を確認してください。',
      );
    }
  }

  async function copyPrompt() {
    const previousIssues = issues
      .filter((issue) => issue.status !== 'RESOLVED')
      .slice(0, 2)
      .map((issue) => issue.title);
    const prompt = generateChatGptPrompt({
      handedness: selectedVideo?.handedness ?? videoDraft.handedness,
      dartWeight:
        selectedVideo?.dart_weight_grams !== null && selectedVideo?.dart_weight_grams !== undefined
          ? String(selectedVideo.dart_weight_grams)
          : videoDraft.dartWeightGrams,
      direction: selectedVideo
        ? directionLabel(selectedVideo.direction)
        : directionLabel(videoDraft.direction),
      throwCount: selectedSession?.current_throw ?? null,
      practicePurpose: selectedSession?.title_snapshot ?? null,
      userConcern: selectedVideo?.memo ?? videoDraft.memo,
      previousIssues,
    });
    await Clipboard.setStringAsync(prompt);
    Alert.alert(
      'コピーしました',
      'ChatGPT用指示文をクリップボードへコピーしました。動画と一緒に送信してください。',
    );
  }

  async function pasteAssessment() {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      Alert.alert(
        'クリップボードが空です',
        'ChatGPTの評価全文をコピーしてから貼り付けてください。',
      );
      return;
    }
    setRawText(text);
    const parsed = parseChatGptAssessment(text);
    setSections(parsed.sections);
    setRecognizedCount(parsed.recognizedCount);
    setAssessmentOpen(true);
  }

  function parseTypedText() {
    const parsed = parseChatGptAssessment(rawText);
    setSections(parsed.sections);
    setRecognizedCount(parsed.recognizedCount);
    if (!parsed.hasRecognizedHeading) {
      Alert.alert(
        '見出しを検出できませんでした',
        '原文は保存できます。必要な項目は手動で修正してください。',
      );
    }
  }

  async function saveAssessment() {
    if (!rawText.trim()) {
      Alert.alert('原文が空です', 'ChatGPTの回答全文を貼り付けてください。');
      return;
    }
    const result = await repo.saveAssessment(
      rawText,
      sections,
      selectedSessionId,
      selectedVideoId,
      null,
    );
    if (result.duplicate) {
      Alert.alert('重複の可能性があります', '同じ練習記録に同じ原文の評価が既に保存されています。');
      return;
    }
    setAssessmentOpen(false);
    setRawText('');
    setSections(emptyAssessmentSections());
    await reload();
    Alert.alert(
      '保存しました',
      result.parseStatus === 'parsed'
        ? '評価と解析結果を保存しました。'
        : '原文を保存しました。必要に応じて項目を修正してください。',
    );
  }

  return (
    <Page title="フォーム記録" subtitle="動画を記録し、ChatGPT評価をコピー＆ペーストで管理します。">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
              関連する練習記録
            </Text>
            {sessions.length === 0 ? (
              <Text style={{ color: theme.muted, marginTop: 6 }}>
                先に今日の練習でセッションを開始してください。
              </Text>
            ) : (
              sessions
                .slice(0, 6)
                .map((session) => (
                  <Button
                    key={session.id}
                    label={`${selectedSessionId === session.id ? '選択中: ' : ''}${session.title_snapshot}`}
                    variant={selectedSessionId === session.id ? 'primary' : 'secondary'}
                    onPress={() => setSelectedSessionId(session.id)}
                  />
                ))
            )}
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>動画追加</Text>
            <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>
              Expo
              Go初期版では動画本体をアプリ管理領域へコピーしません。写真ライブラリ由来URIは、端末状態によって後から開けなくなる場合があります。
            </Text>
            <Segmented
              value={videoDraft.direction}
              options={directionOptions}
              onChange={(direction) => setVideoDraft({ ...videoDraft, direction })}
            />
            <Field
              label="利き腕"
              value={videoDraft.handedness}
              onChangeText={(handedness) => setVideoDraft({ ...videoDraft, handedness })}
            />
            <Field
              label="ダーツ重量 g"
              keyboardType="decimal-pad"
              value={videoDraft.dartWeightGrams}
              onChangeText={(dartWeightGrams) => setVideoDraft({ ...videoDraft, dartWeightGrams })}
            />
            <Field
              label="本人メモ"
              multiline
              value={videoDraft.memo}
              onChangeText={(memo) => setVideoDraft({ ...videoDraft, memo })}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button label="カメラで撮影" onPress={() => void pickVideo('camera')} />
              <Button
                label="ライブラリから選択"
                variant="secondary"
                onPress={() => void pickVideo('library')}
              />
            </View>
            {videoDraft.uri ? (
              <Text style={{ color: theme.muted, marginTop: 8 }} numberOfLines={3}>
                選択中: {videoDraft.uri}
              </Text>
            ) : null}
            <Button label="動画メタデータを保存" onPress={() => void saveVideo()} />
          </Card>

          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>ChatGPT連携</Text>
            <Text style={{ color: theme.muted, marginTop: 6 }}>
              アプリは動画をAI解析しません。指示文を作り、ChatGPTの回答を保存・整理します。
            </Text>
            <Button label="ChatGPT用指示文をコピー" onPress={() => void copyPrompt()} />
            <Button
              label="ChatGPT評価を読み込む"
              variant="secondary"
              onPress={() => setAssessmentOpen(true)}
            />
            <Button
              label="クリップボードから貼り付け"
              variant="ghost"
              onPress={() => void pasteAssessment()}
            />
          </Card>

          {isLoading ? <Loading /> : null}

          {videos.length === 0 ? (
            <EmptyState
              title="動画履歴はまだありません"
              body="撮影または選択した動画のURIとメタデータを保存します。動画本体はSQLiteへ保存しません。"
            />
          ) : (
            videos.map((video) => (
              <Card key={video.id}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  {directionLabel(video.direction)}動画
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4 }} numberOfLines={2}>
                  {video.uri}
                </Text>
                <Text style={{ color: theme.muted, marginTop: 4 }}>
                  {video.handedness || '利き腕未登録'} /{' '}
                  {video.dart_weight_grams ? `${video.dart_weight_grams}g` : '重量未登録'}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Button
                    label={selectedVideoId === video.id ? '評価対象' : '評価対象にする'}
                    onPress={() => setSelectedVideoId(video.id)}
                  />
                  <Button
                    label="プレビュー"
                    variant="secondary"
                    onPress={() => void previewVideo(video.uri)}
                  />
                  <Button
                    label="削除"
                    variant="danger"
                    onPress={() =>
                      Alert.alert(
                        '削除しますか',
                        'DBレコードを削除済みにします。端末内ファイル本体は初期版では削除しません。',
                        [
                          { text: 'キャンセル', style: 'cancel' },
                          {
                            text: '削除',
                            style: 'destructive',
                            onPress: () => void repo.deleteVideo(video.id).then(reload),
                          },
                        ],
                      )
                    }
                  />
                </View>
              </Card>
            ))
          )}

          {latestAssessment && parsedLatest ? (
            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                過去評価との比較
              </Text>
              <Text style={{ color: theme.muted, marginTop: 4 }}>
                今回: {new Date(latestAssessment.created_at).toLocaleString()} / 前回:{' '}
                {previousAssessment
                  ? new Date(previousAssessment.created_at).toLocaleString()
                  : 'なし'}
              </Text>
              <CompareLine
                label="前回の課題"
                value={
                  parsedPrevious?.nextPriority ||
                  parsedPrevious?.improvementPoints ||
                  '前回評価なし'
                }
              />
              <CompareLine label="今回の評価" value={parsedLatest.overall || '未登録'} />
              <CompareLine
                label="改善した点"
                value={parsedLatest.improvedSincePrevious || '未登録'}
              />
              <CompareLine label="継続している点" value={parsedLatest.notImprovedYet || '未登録'} />
              <CompareLine
                label="新しく見つかった点"
                value={parsedLatest.improvementPoints || '未登録'}
              />
              <CompareLine
                label="判断できなかった点"
                value={
                  parsedLatest.confidence.includes('判断')
                    ? parsedLatest.confidence
                    : '必要に応じて原文を確認'
                }
              />
              <CompareLine label="次回確認する点" value={parsedLatest.nextPriority || '未登録'} />
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={assessmentOpen}
        animationType="slide"
        onRequestClose={() => setAssessmentOpen(false)}
      >
        <Page
          title="ChatGPT評価を読み込む"
          subtitle={`検出見出し ${recognizedCount}/${Object.keys(assessmentHeadingMap).length}`}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16, paddingBottom: 70 }}
            >
              <Button label="クリップボードから貼り付け" onPress={() => void pasteAssessment()} />
              <Field
                label="ChatGPT回答の原文"
                multiline
                value={rawText}
                onChangeText={setRawText}
              />
              <Button label="内容を解析" variant="secondary" onPress={parseTypedText} />
              <Button
                label={showRaw ? '解析結果を確認' : '元文章を確認'}
                variant="ghost"
                onPress={() => setShowRaw(!showRaw)}
              />
              {!showRaw
                ? (Object.keys(assessmentHeadingMap) as (keyof AssessmentSections)[]).map((key) => (
                    <Field
                      key={key}
                      label={assessmentHeadingMap[key]}
                      multiline
                      value={sections[key]}
                      onChangeText={(value) => setSections({ ...sections, [key]: value })}
                    />
                  ))
                : null}
              <Button label="保存" onPress={() => void saveAssessment()} />
              <Button label="キャンセル" variant="ghost" onPress={() => setAssessmentOpen(false)} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Page>
      </Modal>
    </Page>
  );
}

function directionLabel(direction: string) {
  return (
    {
      front: '正面',
      side: '横',
      back: '後方',
      slow: 'スロー',
      other: 'その他',
    }[direction] ?? direction
  );
}

function CompareLine({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: theme.text, fontWeight: '800' }}>{label}</Text>
      <Text style={{ color: theme.muted, marginTop: 3, lineHeight: 20 }}>{value}</Text>
    </View>
  );
}
