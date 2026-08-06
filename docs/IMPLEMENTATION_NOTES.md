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
- `002_level_training_photo_scoring`
  - レベルプロフィール、レベル履歴
  - DartsSupportApp独自基準のレベルチェック
  - 6種類の一人用練習ゲーム
  - ラウンド、投擲、座標、集計メタデータ
  - 盤面キャリブレーション、写真判定候補、確定座標
- `003_daily_drills_training_library`
  - ビルトインドリル定義、プレイヤー別お気に入り/非表示
  - レベル別デイリーミニマム
  - ドリルセッション、ラウンド、結果、対象別結果
  - デイリーミニマム達成状況
  - 時間別プリセットと理由付きおすすめ候補
- `004_round_based_drill_input`
  - 3投単位入力向けのドリル説明、入力方式、終了条件
  - 日次メニューへドリル由来情報を保持する列
  - `drill_throw_results` による1投データ、キャッチ、target_hit/catch_hit
  - ラウンド入力の下書き、達成条件、再開用セッションメタデータ

## PC分析版

- PC Web版は分析専用で、正式なゲームエンジンやクラウド同期は実装していません。
- iPhone版はJSON Export、PC Web版はJSON Import、IndexedDB永続保存、ダッシュボード表示を担当します。
- repository切替は `selectSupportRepositoryMode` に集約し、iOS/AndroidはSQLite、WebはIndexedDBを選択します。
- IndexedDB store:
  - `imported_export_packages`: 取り込んだ分析用バックアップの正本
  - `import_history`: インポート日時、export ID、追加/スキップ件数
- Backup JSONは `export_format`, `schema_version`, `app_version`, `exported_at`, `account_id`, `player_id`, `device_type`, `record_counts`, `export_id`, `checksum` を持ちます。
- 写真・動画本体はJSONに含めず、URI、ファイル名、撮影日時、関連セッション、PCでは開けない可能性があるフラグを `media_metadata` に保存します。
- CSVは追加依存なしで生成し、日本語Excelで開きやすいようUTF-8 BOM付きにしています。
- 今回追加した依存パッケージはありません。ライセンス追加もありません。

## 将来同期の拡張ポイント

- 安定ID、`created_at`, `updated_at`, `deleted_at` を前提に、差分同期へ拡張できます。
- 将来の列候補は `device_id`, `revision`, `sync_status`, `source_device`, `last_synced_at` です。
- 初期版では大量の同期列追加は行わず、export ID、checksum、import履歴で重複判定を行います。

## Expo Go での制約

- `expo-image-picker` の範囲で動画撮影とライブラリ選択を行います。
- 動画プレビューは保存 URI を OS に渡して開きます。初期版では専用動画プレイヤー依存を追加していません。
- 動画ファイル削除は DB レコードを削除済みにするところまでです。端末内ファイル本体の削除は今後 `expo-file-system` 導入時に拡張します。
- 写真判定はExpo Go互換を優先し、OpenCVなどの非対応ネイティブモジュールは追加しません。
- 初期版はユーザーがBULL中心、20方向、ダブル外周4点以上、3投位置をタップするB方式の手動キャリブレーションです。
- 軽量候補はキャリブレーション後の初期位置補助であり、信頼度は低く扱います。重なり、黒いダーツと黒い盤面、斜め撮影、影がある場合は必ず手動補正します。
- エッジ検出、先端検出、楕円補正の高度化、OpenCV系処理は将来のDevelopment Build向け機能として分離します。
- 写真本体はSQLite BLOBやバックアップJSONへ含めません。URI、キャリブレーション、候補、確定座標、信頼度、手動修正有無だけを保存します。

## OpenAI API 連携の拡張ポイント

- `src/domain/assessment.ts` の prompt 生成と parser は API 連携時にも再利用できます。
- `ai_form_assessments.source_type` 相当の列追加で `manual_clipboard` と `openai_api` を分離できます。
- API 応答保存時も raw text、parsed JSON、raw hash を維持し、既存の重複防止と改善管理に接続します。
