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
                Alert.alert(
                  'Importしました',
                  `追加 ${result.addedRows ?? result.importedRows} / 更新 ${result.updatedRows ?? 0} / スキップ ${
                    result.skippedRows ?? 0
                  }`,
                );
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
    <Page title="バックアップ" subtitle="iPhone記録をJSONでExportし、PC分析版へ取り込めます。">
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
              JSONには練習予定、セッション、結果、デイリーミニマム、ドリル定義、ドリルラウンド、1投データ、写真判定メタデータ、動画メタデータ、ChatGPT評価、改善課題、レベル履歴を含めます。動画・写真本体は含めず、PCでは開けない可能性があるファイルとして扱います。
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
