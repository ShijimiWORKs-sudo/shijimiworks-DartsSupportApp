import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button, Card, EmptyState, Field, Page, Segmented, useTheme } from '../../components/ui';
import { parseBackupJson, type BackupPreview, type BackupPayload } from '../../src/domain/backup';
import {
  buildCsv,
  buildPcAnalysis,
  formatJapanDateTime,
  type AnalysisCategory,
  type AnalysisRange,
  type ChartPoint,
} from '../../src/domain/pcAnalysis';
import { useSupportRepository } from '../../src/features/support/SupportDatabaseProvider';

const ranges: { label: string; value: AnalysisRange }[] = [
  { label: '今日', value: 'today' },
  { label: '7日', value: '7d' },
  { label: '30日', value: '30d' },
  { label: '3か月', value: '3m' },
  { label: '6か月', value: '6m' },
  { label: '1年', value: '1y' },
  { label: '全期間', value: 'all' },
];

const categories: { label: string; value: AnalysisCategory }[] = [
  { label: '全ドリル', value: 'all' },
  { label: 'BULL', value: 'bull' },
  { label: 'クリケット', value: 'cricket' },
  { label: 'シングル', value: 'single' },
  { label: 'ダブル', value: 'double' },
  { label: 'トリプル', value: 'triple' },
  { label: 'フォーム', value: 'form' },
  { label: 'レベル', value: 'level' },
  { label: 'デイリー', value: 'daily_minimum' },
];

type PcRepository = ReturnType<typeof useSupportRepository>['repository'] & {
  previewBackupImport?: (jsonText: string) => Promise<BackupPreview>;
  listImportHistory?: () => Promise<
    {
      imported_at: string;
      file_name: string;
      export_id: string;
      added_rows: number;
      updated_rows: number;
      skipped_rows: number;
      error_rows: number;
    }[]
  >;
  exportAnalysisCsv?: (name: string) => Promise<string>;
};

export default function AnalysisScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { repository, unavailableView } = useSupportRepository();
  const [payload, setPayload] = useState<BackupPayload | null>(null);
  const [backupText, setBackupText] = useState('');
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [importHistory, setImportHistory] = useState<
    Awaited<ReturnType<NonNullable<PcRepository['listImportHistory']>>>
  >([]);
  const [range, setRange] = useState<AnalysisRange>('30d');
  const [category, setCategory] = useState<AnalysisCategory>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'new' | 'old' | 'throws' | 'bull' | 'marks'>('new');

  const isPc = Platform.OS === 'web' && width >= 1024;
  const pcRepo = repository as PcRepository;

  const reload = useCallback(async () => {
    if (!repository) {
      return;
    }
    try {
      const json = await repository.exportBackup();
      setPayload(parseBackupJson(json));
      if (pcRepo?.listImportHistory) {
        setImportHistory(await pcRepo.listImportHistory());
      }
    } catch {
      setPayload(null);
    }
  }, [repository, pcRepo]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const analysis = useMemo(() => buildPcAnalysis(payload ?? {}, range), [payload, range]);
  const filteredHistory = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = analysis.history
      .filter((row) => (category === 'all' ? true : row.drillName.toLowerCase().includes(category)))
      .filter((row) => (keyword ? JSON.stringify(row).toLowerCase().includes(keyword) : true));
    return [...rows].sort((a, b) => {
      if (sortKey === 'old') {
        return a.date.localeCompare(b.date);
      }
      if (sortKey === 'throws') {
        return b.totalThrows - a.totalThrows;
      }
      if (sortKey === 'bull') {
        return b.bullCount - a.bullCount;
      }
      if (sortKey === 'marks') {
        return b.markCount - a.markCount;
      }
      return b.date.localeCompare(a.date);
    });
  }, [analysis.history, category, search, sortKey]);

  if (!repository) {
    return unavailableView;
  }
  const repo = repository;

  async function previewImport(text = backupText) {
    if (!text.trim()) {
      Alert.alert('JSONが空です', 'iPhoneでExportしたJSONを選択または貼り付けてください。');
      return;
    }
    try {
      if (pcRepo?.previewBackupImport) {
        setPreview(await pcRepo.previewBackupImport(text));
      } else {
        setPreview({ ok: false, error: 'PC Web版ではIndexedDB repositoryが必要です。' });
      }
    } catch (error) {
      setPreview({
        ok: false,
        error: error instanceof Error ? error.message : 'JSONを確認できませんでした。',
      });
    }
  }

  async function importBackup() {
    if (!backupText.trim()) {
      return;
    }
    try {
      const result = await repo.importBackup(backupText);
      Alert.alert(
        'Importしました',
        `追加 ${result.addedRows ?? result.importedRows} / 更新 ${result.updatedRows ?? 0} / スキップ ${result.skippedRows ?? 0}`,
      );
      await reload();
      await previewImport(backupText);
    } catch (error) {
      Alert.alert(
        'Importに失敗しました',
        error instanceof Error ? error.message : '不明なエラーです。',
      );
    }
  }

  async function pasteJson() {
    const text = await Clipboard.getStringAsync();
    setBackupText(text);
    await previewImport(text);
  }

  async function selectJsonFile() {
    if (Platform.OS !== 'web') {
      Alert.alert('PC Web専用です', 'ファイル選択はPCブラウザ版で使用してください。');
      return;
    }
    const doc = (
      globalThis as unknown as {
        [key: string]: { createElement?: (tag: string) => HTMLInputElement };
      }
    )['document'];
    if (!doc?.createElement) {
      Alert.alert('ファイル選択を利用できません', 'ブラウザのファイル選択APIが使えません。');
      return;
    }
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      void file
        .text()
        .then((text) => {
          setBackupText(text);
          return previewImport(text);
        })
        .catch(() => {
          Alert.alert('読み取りに失敗しました', 'JSONファイルを開けませんでした。');
        });
    };
    input.click();
  }

  async function copyCsv(name: string) {
    const csv = pcRepo?.exportAnalysisCsv
      ? await pcRepo.exportAnalysisCsv(name)
      : buildCsv(name, payload ?? {});
    await Clipboard.setStringAsync(csv);
    Alert.alert('CSVをコピーしました', `${name}.csv をクリップボードへコピーしました。`);
  }

  const content = (
    <>
      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>データ取り込み</Text>
        <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
          iPhoneでJSONエクスポートしたファイルをPCへ移動し、ここで取り込みます。同じIDの行は標準でスキップします。
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <Button label="JSONファイルを選択" onPress={() => void selectJsonFile()} />
          <Button label="貼り付け" variant="secondary" onPress={() => void pasteJson()} />
          <Button label="プレビュー" variant="secondary" onPress={() => void previewImport()} />
          <Button label="Import実行" variant="danger" onPress={() => void importBackup()} />
        </View>
        <Field label="バックアップJSON" multiline value={backupText} onChangeText={setBackupText} />
        {preview ? (
          <Text
            style={{ color: preview.ok ? theme.text : theme.danger, marginTop: 6, lineHeight: 20 }}
          >
            {preview.ok
              ? `形式: ${preview.exportFormat} / schema ${preview.schemaVersion} / 合計 ${preview.totalRows}行 / 重複 ${Object.values(preview.duplicateTables).reduce((sum, count) => sum + count, 0)}行`
              : preview.error}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>フィルター</Text>
        <Segmented value={range} onChange={setRange} options={ranges} />
        <Segmented value={category} onChange={setCategory} options={categories.slice(0, 4)} />
        <Field label="検索" value={search} onChangeText={setSearch} />
      </Card>

      <KpiGrid analysis={analysis} isPc={isPc} />
      <ChartCard
        title="BULL率推移"
        note="旧形式データはINNER／OUTER内訳がありません。旧形式はhit_count由来の参考BULL率として表示します。"
        points={analysis.bull.chart}
      />
      <ChartCard
        title="クリケット平均マーク"
        note="20〜15・BULLの平均マーク比較です。キャッチは有効対象へ別途加算されます。"
        points={analysis.cricket.targetAverages}
      />

      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>練習履歴</Text>
        <Segmented
          value={sortKey}
          onChange={setSortKey}
          options={[
            { label: '新しい順', value: 'new' },
            { label: '古い順', value: 'old' },
            { label: '投矢数', value: 'throws' },
            { label: 'BULL', value: 'bull' },
            { label: 'マーク', value: 'marks' },
          ]}
        />
        {filteredHistory.length === 0 ? (
          <EmptyState
            title="履歴がありません"
            body="PC Web版でJSONを取り込むと、ここに練習履歴が表示されます。"
          />
        ) : (
          filteredHistory.slice(0, 30).map((row) => (
            <View
              key={row.id}
              style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 8 }}
            >
              <Text style={{ color: theme.text, fontWeight: '800' }}>
                {formatJapanDateTime(row.date)} / {row.drillName}
              </Text>
              <Text style={{ color: theme.muted, marginTop: 3 }}>
                投矢 {row.totalThrows} / R {row.rounds} / BULL {row.bullDisplay} / マーク{' '}
                {row.markCount} / 入力 {row.inputMethod}
              </Text>
              {row.bullDataKind === 'legacy_summary' ? (
                <Text style={{ color: theme.muted, marginTop: 3 }}>
                  INNER／OUTER内訳：未記録 / 参考BULL率 {Math.round(row.bullRate * 100)}%
                </Text>
              ) : null}
              {row.dataQualityLabels.length > 0 ? (
                <Text style={{ color: theme.muted, marginTop: 3 }}>
                  {row.dataQualityLabels.join(' / ')}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </Card>
    </>
  );

  return (
    <Page title="PC分析" subtitle="iPhoneで記録した長期間データをPCブラウザで分析します。">
      {isPc ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View
            style={{ width: 220, padding: 16, borderRightWidth: 1, borderRightColor: theme.border }}
          >
            {[
              'ダッシュボード',
              '練習履歴',
              'BULL分析',
              'クリケット分析',
              'レベル',
              'フォーム・改善',
              'データ取り込み',
              'CSV出力',
            ].map((item) => (
              <Text key={item} style={{ color: theme.text, fontWeight: '800', marginBottom: 14 }}>
                {item}
              </Text>
            ))}
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1.6 }}>{content}</View>
              <View style={{ flex: 1 }}>
                <SideAnalysis analysis={analysis} importHistory={importHistory} onCsv={copyCsv} />
              </View>
            </View>
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>{content}</ScrollView>
      )}
    </Page>
  );
}

function KpiGrid({
  analysis,
  isPc,
}: {
  analysis: ReturnType<typeof buildPcAnalysis>;
  isPc: boolean;
}) {
  const items = [
    ['現在レベル', analysis.currentLevel],
    ['総練習日数', `${analysis.totalPracticeDays}日`],
    ['総練習時間', `${Math.round(analysis.totalPracticeSeconds / 60)}分`],
    ['総投矢数', `${analysis.totalThrows}投`],
    ['今週の投矢数', `${analysis.weeklyThrows}投`],
    ['デイリー達成率', `${Math.round(analysis.dailyMinimumRate)}%`],
    ['連続練習日数', `${analysis.practiceStreakDays}日`],
    ['最近のBULL率', `${Math.round(analysis.recentBullRate * 100)}%`],
    ['最近の平均マーク', analysis.recentAverageMarks.toFixed(2)],
    ['最終練習日', analysis.lastPracticeDateDisplay],
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {items.map(([label, value]) => (
        <Card key={label} style={{ width: isPc ? '30%' : undefined }}>
          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '800' }}>{label}</Text>
          <Text style={{ fontSize: 22, color: '#0f172a', fontWeight: '900', marginTop: 4 }}>
            {value}
          </Text>
        </Card>
      ))}
    </View>
  );
}

function ChartCard({ title, note, points }: { title: string; note: string; points: ChartPoint[] }) {
  const theme = useTheme();
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <Card>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>{note}</Text>
      {points.length === 0 ? (
        <Text style={{ color: theme.muted, marginTop: 12 }}>データなし</Text>
      ) : (
        <View style={{ marginTop: 12, gap: 8 }}>
          {points.slice(0, 12).map((point, index) => (
            <View
              key={`${point.label}-${index}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Text style={{ width: 76, color: theme.muted }} numberOfLines={1}>
                {point.label}
              </Text>
              <View style={{ flex: 1, height: 14, backgroundColor: theme.border, borderRadius: 4 }}>
                <Pressable
                  accessibilityRole="text"
                  style={{
                    width: `${Math.max(4, (point.value / max) * 100)}%`,
                    height: 14,
                    backgroundColor: point.kind === 'legacy' ? '#f59e0b' : theme.accent,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text style={{ width: 54, color: theme.text, textAlign: 'right' }}>
                {point.value.toFixed(1)}
              </Text>
            </View>
          ))}
          {points.some((point) => point.kind === 'legacy') ? (
            <Text style={{ color: theme.muted, marginTop: 4 }}>橙色：旧形式集計データ</Text>
          ) : null}
        </View>
      )}
    </Card>
  );
}

function SideAnalysis({
  analysis,
  importHistory,
  onCsv,
}: {
  analysis: ReturnType<typeof buildPcAnalysis>;
  importHistory: { imported_at: string; added_rows: number; skipped_rows: number }[];
  onCsv: (name: string) => Promise<void>;
}) {
  const theme = useTheme();
  return (
    <>
      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>得意・苦手</Text>
        {[...analysis.strengths.strongCandidates, ...analysis.strengths.weakCandidates].map(
          (item) => (
            <Text
              key={`${item.target}-${item.reason}`}
              style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}
            >
              {item.reason}
            </Text>
          ),
        )}
      </Card>
      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>キャッチ分析</Text>
        <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
          キャッチ {analysis.catches.catchThrows}投 / {analysis.catches.catchMarks}マーク /
          キャッチ率 {Math.round(analysis.catches.catchRate * 100)}%
        </Text>
      </Card>
      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>レベル・フォーム</Text>
        <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
          DartsSupportApp独自基準 / 昇格候補 {analysis.level.promotionReady ? 'あり' : 'なし'} /
          ChatGPT評価 {analysis.form.assessments}件 / 次回重点 {analysis.form.nextFocusItems}件
        </Text>
        <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}>
          レベル開始 {analysis.level.levelStartedAtDisplay} / 最新フォーム評価{' '}
          {analysis.form.latestAssessmentDateDisplay}
        </Text>
      </Card>
      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>データ品質</Text>
        {analysis.dataQualityLabels.length === 0 ? (
          <Text style={{ color: theme.muted, marginTop: 6 }}>追加の注意なし</Text>
        ) : (
          analysis.dataQualityLabels.map((label) => (
            <Text key={label} style={{ color: theme.muted, marginTop: 6 }}>
              {label}
            </Text>
          ))
        )}
      </Card>
      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>CSV出力</Text>
        {[
          'session_summary',
          'round_results',
          'throw_results',
          'bull_analysis',
          'cricket_analysis',
          'level_history',
        ].map((name) => (
          <Button
            key={name}
            label={`${name}.csv`}
            variant="secondary"
            onPress={() => void onCsv(name)}
          />
        ))}
      </Card>
      <Card>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>インポート履歴</Text>
        {importHistory.length === 0 ? (
          <Text style={{ color: theme.muted, marginTop: 6 }}>履歴なし</Text>
        ) : (
          importHistory.slice(0, 5).map((row) => (
            <Text
              key={row.imported_at}
              style={{ color: theme.muted, marginTop: 6, lineHeight: 20 }}
            >
              {formatJapanDateTime(row.imported_at)}: 追加 {row.added_rows} / スキップ{' '}
              {row.skipped_rows}
            </Text>
          ))
        )}
      </Card>
    </>
  );
}
