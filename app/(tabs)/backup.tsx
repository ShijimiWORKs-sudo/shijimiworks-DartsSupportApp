import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { Button, Card, Field, Page, useTheme } from '../../components/ui';
import { SUPPORT_DATABASE_FILE_NAME } from '../../src/db/database';
import { CURRENT_SCHEMA_VERSION } from '../../src/db/schema';
import { selectSupportRepositoryMode } from '../../src/features/support/repositoryMode';
import { useSupportRepository } from '../../src/features/support/SupportDatabaseProvider';

export default function BackupScreen() {
  const theme = useTheme();
  const { repository, unavailableView } = useSupportRepository();
  const [backupText, setBackupText] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  if (!repository) {
    return unavailableView;
  }
  const repo = repository;

  async function exportBackup() {
    setIsBusy(true);
    try {
      const json = await repo.exportBackup();
      setBackupText(json);
      await Clipboard.setStringAsync(json);
      Alert.alert('Exportしました', 'バックアップJSONを表示し、クリップボードにもコピーしました。');
    } catch (error) {
      Alert.alert(
        'Exportに失敗しました',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function paste() {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      Alert.alert('クリップボードが空です', 'バックアップJSONをコピーしてから貼り付けてください。');
      return;
    }
    setBackupText(text);
  }

  async function importBackup() {
    if (!backupText.trim()) {
      Alert.alert('JSONが空です', 'ImportするバックアップJSONを貼り付けてください。');
      return;
    }
    Alert.alert(
      'Importしますか',
      '同じIDのデータはバックアップ内容で更新されます。動画本体は復元されません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            setIsBusy(true);
            void repo
              .importBackup(backupText)
              .then((result) => {
                Alert.alert('Importしました', `${result.importedRows}行を取り込みました。`);
              })
              .catch((error) => {
                Alert.alert(
                  'Importに失敗しました',
                  error instanceof Error ? error.message : '不明なエラーです。',
                );
              })
              .finally(() => setIsBusy(false));
          },
        },
      ],
    );
  }

  return (
    <Page title="バックアップ" subtitle="端末内SQLiteデータをJSONでExport/Importします。">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Card>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>動画の扱い</Text>
            <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
              初期版のバックアップは動画本体を含めません。form_videos
              のURI、撮影方向、メモなどのメタデータだけを保存します。写真判定も写真本体は含めず、URI、キャリブレーション、候補、確定座標だけを保存します。ドリル定義、デイリーミニマム、ドリル結果、おすすめ候補はJSONに含まれます。復元後に端末内ファイルが移動・削除されている場合は、動画や写真を再選択してください。
            </Text>
          </Card>
          {__DEV__ ? (
            <Card>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>開発用診断</Text>
              <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
                Platform: {Platform.OS}
                {'\n'}DB種別: {selectSupportRepositoryMode(Platform.OS)}
                {'\n'}DB名: {SUPPORT_DATABASE_FILE_NAME}
                {'\n'}schemaVersion: {CURRENT_SCHEMA_VERSION}
              </Text>
            </Card>
          ) : null}
          <Card>
            <Button
              label={isBusy ? '処理中' : 'Exportしてコピー'}
              onPress={() => void exportBackup()}
              disabled={isBusy}
            />
            <Button
              label="クリップボードから貼り付け"
              variant="secondary"
              onPress={() => void paste()}
            />
            <Field
              label="バックアップJSON"
              multiline
              value={backupText}
              onChangeText={setBackupText}
            />
            <Button
              label="Import"
              variant="danger"
              onPress={() => void importBackup()}
              disabled={isBusy}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
