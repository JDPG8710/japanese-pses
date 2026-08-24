# Cloudflare Worker／D1 配備手順

この Worker は Turnstile、Google 認証、週2時間の累積ゲスト体験、教材配信、利用者プロファイル、ステージ通過、挑戦履歴、卒業証を Cloudflare D1 の一つの認証境界で提供します。ゲスト枠はステージが実行中かつページが表示中の時間だけを30秒間隔のハートビートで累積し、メニュー、結果画面、バックグラウンド中は消費しません。IndexedDB はオフラインキャッシュであり、クラウド側の正本は D1 です。

## 1. D1 データベース

本番データベースは `japanese-pses-production`、Worker バインディングは `DB` です。新しい環境では次を実行し、返された `database_id` を `wrangler.toml` に設定します。

```powershell
npx wrangler d1 create japanese-pses-production --location apac
npm run db:migrate
npm run db:seed
```

`migrations/` はテーブル変更、`scripts/import-game-data-d1.mjs` は `data/*.json` の検証・正規化・D1投入を担当します。JSON は移行元であり、本番ランタイムから直接読みません。

## 2. 機密値

```powershell
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put FINGERPRINT_PEPPER
```

`JWT_SECRET` と `FINGERPRINT_PEPPER` はそれぞれ独立した32バイト以上の乱数にします。秘密値、OAuth クライアント JSON、`.dev.vars` は GitHub へコミットしません。Apple ログインは現在 UI から停止しているため、`APPLE_CLIENT_SECRET` は不要です。

## 3. OAuth／Turnstile

- Google の承認済み JavaScript 生成元：`https://japanese-pses.j565718319.workers.dev`
- Google の承認済みリダイレクト URI：`https://japanese-pses.j565718319.workers.dev/api/auth/google`
- Turnstile の許可ホスト：`japanese-pses.j565718319.workers.dev`

ローカルホストとプライベート LAN は `Local Offline Mode` を使用し、本番の OAuth／Turnstile 状態を書き換えません。

## 4. 検証と配備

```powershell
npm install
npm run test
npm run build
npm run deploy
```

`npm run deploy` はテスト、静的成果物の再構築、本番 D1 マイグレーション、教材インポート、Worker 配備を順番に実行します。公開後は `/api/health`、`/api/game-data/manifest.json`、Google ログイン、ゲスト開始、ステージ精算を確認してください。

## 5. データ書き込み方針

- 教材はデプロイ時に D1 へ一括投入し、ETag 付き API で配信します。
- OAuth、セッション、ゲスト体験は D1 上で期限を検証します。
- プレイヤー進捗はステージ精算時または60秒デバウンスでバッチ送信します。
- 各挑戦は `attempt_id` で重複を防ぎ、卒業証は利用者ごとに一度だけ保存します。
- IndexedDB は断網時の一時保存に使い、再接続時は `updated_at` の新しい側へ収束させます。
