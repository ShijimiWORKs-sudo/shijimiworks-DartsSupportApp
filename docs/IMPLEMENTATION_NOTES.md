# DartsSupportApp 初期実装メモ

## 調査結果

- 対象フォルダ `C:\制作データ\10_App\DartsSupportApp` は空で、Git リポジトリではありませんでした。
- GitHub remote `ShijimiWORKs-sudo/shijimiworks-DartsSupportApp` は refs が空でした。
- 兄弟プロジェクト `DartsApp` は Expo Router、Expo SDK 54、SQLite 正本、Account/Player 境界を採用しています。
- 兄弟プロジェクト `DartsPractisAI` は `darts-support-app` 名で Expo SDK 54 系の依存構成を持っていました。

## 実装方針

- 空リポジトリのため、Expo Router + TypeScript + SQLite の新規初期版として構成しました。
- DB は `darts_support.db` を正本とし、`accounts` と `players` にローカル OWNER を自動作成します。
- 正式ゲームエンジンは作らず、練習用のセット、ラウンド、投数、時間の簡易進行に限定します。
- ChatGPT 連携はクリップボード経由のみで、OpenAI API キーや自動送信は実装していません。
- 動画本体は端末 URI 参照のみで、SQLite と JSON バックアップにはメタデータだけを保存します。

## Migration

- `001_daily_practice_form_ai_import`
  - Account/Player
  - 練習メニュー、日別プラン、日別項目
  - 練習セッション、練習結果
  - フォーム動画メタデータ
  - ChatGPT 評価原文、解析 JSON、重複検出用 raw_hash
  - 改善課題、課題履歴
  - 次回フォーカス、練習候補

## Expo Go での制約

- `expo-image-picker` の範囲で動画撮影とライブラリ選択を行います。
- 動画プレビューは保存 URI を OS に渡して開きます。初期版では専用動画プレイヤー依存を追加していません。
- 動画ファイル削除は DB レコードを削除済みにするところまでです。端末内ファイル本体の削除は今後 `expo-file-system` 導入時に拡張します。

## OpenAI API 連携の拡張ポイント

- `src/domain/assessment.ts` の prompt 生成と parser は API 連携時にも再利用できます。
- `ai_form_assessments.source_type` 相当の列追加で `manual_clipboard` と `openai_api` を分離できます。
- API 応答保存時も raw text、parsed JSON、raw hash を維持し、既存の重複防止と改善管理に接続します。
