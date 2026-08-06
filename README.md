# DartsSupportApp

iPhone と Expo Go を主対象にした、ダーツ練習支援アプリの初期版です。

## できること

- 毎日の練習メニューを手入力し、テンプレートとして再利用する
- 今日の練習を開始、一時停止、再開、完了、スキップ、中断する
- セット、ラウンド、投数の簡易進行と直前操作の Undo を行う
- 練習結果を手入力して保存する
- 投擲フォーム動画の URI とメタデータを練習記録へ関連付ける
- ChatGPT 用の評価依頼文をクリップボードへコピーする
- ChatGPT の回答全文を貼り付け、見出しごとに解析して保存する
- 改善課題、次回フォーカス、練習候補を継続管理する
- SQLite データを JSON で Export/Import する

## 実装しないこと

この初期版では OpenAI API 連携、動画の自動解析、骨格推定、正式な 01/CRICKET/MATCH ゲーム進行は実装していません。

## 動画保存方針

動画本体は SQLite の BLOB に保存しません。`form_videos` には URI、撮影方向、利き腕、ダーツ重量、メモなどのメタデータだけを保存します。

バックアップ JSON も動画本体を含みません。復元先端末で URI が無効になった場合は動画を再選択してください。

## 開発

```sh
npm install
npm run typecheck
npm run lint
npm test
npm run validate:data
npx expo install --check
npx expo-doctor
npm run expo:export
```
