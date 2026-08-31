# Cloudflare Pages／Worker／D1 配備手順

Cloudflare Pages はゲームの静的フロントエンドを配信し、Pages Function の Service Binding が `/api/*` を `japanese-pses` Worker へ同一オリジンで転送します。Worker は Turnstile付きGoogle認証、教材配信、利用者プロファイル、ステージ通過、挑戦履歴、卒業証、広告なしメンバー購入を Cloudflare D1 の一つの認証境界で提供します。未ログインでもゲームは時間制限なく利用でき、ログインはクラウド保存と広告なしメンバー購入に使います。IndexedDB はオフラインキャッシュであり、クラウド側の正本は D1 です。

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
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

`JWT_SECRET` と Stripe の秘密値は Worker Secret にだけ登録します。秘密値、OAuth クライアント JSON、`.dev.vars` は GitHub へコミットしません。Apple ログインは現在 UI から停止しているため、`APPLE_CLIENT_SECRET` は不要です。Google H5 Games Ads の `ca-pub-...` は公開IDのため、取得後に `GOOGLE_H5_ADS_CLIENT` として設定します。

## 3. OAuth／Turnstile

- Google の承認済み JavaScript 生成元：`https://manabi-pop.pages.dev`
- Google の承認済みリダイレクト URI：`https://manabi-pop.pages.dev/api/auth/google`
- Turnstile の許可ホスト：`manabi-pop.pages.dev`（ロールバック用に旧WorkerホストもWidget側へ残してよい）

ローカルホストとプライベート LAN は `Local Offline Mode` を使用し、本番の OAuth／Turnstile 状態を書き換えません。

## 4. 検証と配備

```powershell
npm install
npm run test
npm run build
npm run deploy
```

`npm run deploy` はテスト、静的成果物の再構築、本番 D1 マイグレーション、教材インポート、API Worker 配備、Pages 配備を順番に実行します。公開後は `https://manabi-pop.pages.dev/api/health`、`/api/game-data/manifest.json`、Googleログイン、無料会員の広告間隔、広告なし会員、ステージ精算を確認してください。

## 5. データ書き込み方針

- 教材はデプロイ時に D1 へ一括投入し、ETag 付き API で配信します。
- OAuth、セッション、会員権、Stripe支払いイベントは D1 上で検証・保存します。
- Stripe Webhook は生のリクエスト本文と署名を検証し、同じイベントを重複処理しません。
- プレイヤー進捗はステージ精算時または60秒デバウンスでバッチ送信します。
- 各挑戦は `attempt_id` で重複を防ぎ、卒業証は利用者ごとに一度だけ保存します。
- IndexedDB は断網時の一時保存に使い、再接続時は `updated_at` の新しい側へ収束させます。
