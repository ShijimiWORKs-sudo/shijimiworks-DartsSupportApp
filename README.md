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

## iPhoneのExpo Goで起動する

### PC側

1. Windows PCとiPhoneを同じWi-Fiへ接続する。
2. PowerShellを開く。
3. 次を実行する。

```powershell
cd "C:\制作データ\10_App\DartsSupportApp"
npm install
npx expo start --lan
```

または package script を使う場合:

```powershell
npm run start:lan
```

4. ターミナルまたはブラウザにQRコードが表示されることを確認する。

### iPhone側

1. App StoreからExpo Goをインストールする。
2. Expo Goを起動する。
3. PC側に表示されたQRコードを読み取る。
4. DartsSupportAppが起動し、下部タブを操作できることを確認する。

### LAN接続できない場合

同一Wi-Fiでも接続できない場合はTunnelを使います。

```powershell
npx expo start --tunnel
```

または:

```powershell
npm run start:tunnel
```

Tunnelは開発用に `@expo/ngrok` を使用します。`ngrok.exe ENOENT` のようなエラーが出る場合は、`npm install` を再実行し、セキュリティソフトやnpmのinstall script制限で `node_modules/@expo/ngrok-bin-win32-x64/ngrok.exe` が削除またはブロックされていないか確認してください。

### キャッシュ問題がある場合

古い画面や白画面が続く場合はキャッシュをクリアして起動します。

```powershell
npx expo start -c
```

または:

```powershell
npm run start:clear
```

### Windows Firewallで確認すること

- Node.jsまたはExpoの通信がWindows Firewallで許可されているか
- プライベートネットワーク通信が許可されているか
- PCとiPhoneが同一Wi-Fiに接続されているか
- ゲストWi-Fiや端末間通信禁止設定になっていないか
- VPNが有効になっていないか

## 実機QA

iPhoneでの確認項目は [docs/qa/EXPO_GO_IPHONE_QA.md](docs/qa/EXPO_GO_IPHONE_QA.md) にあります。

問題が起きた場合は、Expo Goの赤いエラー画面、PC側Metroターミナルのエラー、起動方式、iPhone機種、iOSバージョン、Expo Goバージョン、Wi-Fi/VPN状態、発生画面、再現手順を記録してください。
