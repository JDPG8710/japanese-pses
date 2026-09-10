# Cloudflare Pages／Worker／D1 配備手順

## Piko Playroom（2026-09-09）

共通入口、ニックネーム、オンライン一覧、家族の部屋、再戦、囲碁入門を追加。`0013_playroom_profiles.sql` と `playroom-v1`（`PlayroomSpace` / `PLAYROOMS`）が必要です。[実装・検証・公開記録](../docs/PLAYROOM_IMPLEMENTATION.md)を参照してください。

国際象棋真人对局、家庭房棋种切换、PGN 复盘与 8 步儿童新手课使用 `0014_chess.sql` 和 `chess-v1`（`ChessRoom` / `CHESS_ROOMS`）。详细说明与验证命令见 [CHESS_IMPLEMENTATION.md](../docs/CHESS_IMPLEMENTATION.md)。

## 9路囲碁（2026-09-08）

`/arena.html` はゲスト・ログイン利用者の招待対戦、マッチング、4段階のコンピューター練習に対応します。Worker の入口は `worker/arena-entry.mjs`。`0012_go_games.sql` と `go-v1` Durable Object migration が必要です。ローカル検証・仕様・公開前の確認は [GO_ARENA.md](../docs/GO_ARENA.md) を参照してください。

## World Play（2026-09-05追加）

`/world.html` に8つの論理ゲームと中・日・英UIを追加。`migrations/0005_world_games.sql` は公開代号と認証済み挑戦を保存し、既存DBは `0008_world_games_logic_lab.sql` が旧得点を保持したまま新ゲームIDへ移行します。`GET /api/world/leaderboard?game=circuit&level=1` は匿名公開、`POST /api/world/start` と `POST /api/world/answer` は既存認証必須です。公開データはランダム代号・順位・スコアだけです。

ローカル検証：`node tests/test_world_games.mjs`（16,000問の生成・解答・不正解拒否とMiniflareの隔離D1）。プレビュー：`node scripts/build.mjs` の後 `node scripts/preview-world.mjs`、起動時に表示されたローカルURLを開きます。プレビューは架空のログインやランキングを作りません。既存の `node tests/test_e2e_runner.js` も実行してください。

本番反映時は既存手順でD1マイグレーション→Worker→Pagesの順に配備し、新しい公開ランキングGET、既存Googleログイン、10問のサーバー採点を確認してください。旧版へ戻す場合も追加テーブルは削除せず記録を残します。

任意スコアの直接書き込みとリプレイは防止しますが、クライアントに公開するパズルを自動解答するボットまで検出する仕組みではありません。賞金や実物報酬はありません。

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

- Google の承認済み JavaScript 生成元：`https://piko-game.com`
- Google の承認済みリダイレクト URI：`https://piko-game.com/api/auth/google`
- `www` の301転送は `config/cloudflare-www-redirect.json` のホスト名条件だけを使います。`http.request.full_uri` に `http*://www.*` を適用すると、Google が `scope` に返す URL にも一致し、OAuth の戻り先を別ドメインへ誤転送します。Cloudflare Rules の設定は Worker/Pages の配備とは別管理です。
- 認証変更時は `npm run test:auth`、公開後は `npm run verify:auth:production` と実際の Google ログインを確認します。
- Turnstile の許可ホスト：`piko-game.com`（移行中はロールバック用に `manabi-pop.pages.dev` も残す）

ローカルホストとプライベート LAN は `Local Offline Mode` を使用し、本番の OAuth／Turnstile 状態を書き換えません。

## 4. 検証と配備

```powershell
npm install
npm run test
npm run build
npm run deploy
```

`npm run deploy` はテスト、静的成果物の再構築、本番 D1 マイグレーション、教材インポート、API Worker 配備、Pages 配備を順番に実行します。公開後は `https://piko-game.com/api/health`、`/api/game-data/manifest.json`、Googleログイン、無料会員の広告間隔、広告なし会員、ステージ精算を確認してください。

## 5. データ書き込み方針

- 教材はデプロイ時に D1 へ一括投入し、ETag 付き API で配信します。
- OAuth、セッション、会員権、Stripe支払いイベントは D1 上で検証・保存します。
- Stripe Webhook は生のリクエスト本文と署名を検証し、同じイベントを重複処理しません。
- プレイヤー進捗はステージ精算時または60秒デバウンスでバッチ送信します。
- 各挑戦は `attempt_id` で重複を防ぎ、卒業証は利用者ごとに一度だけ保存します。
- IndexedDB は断網時の一時保存に使い、再接続時は `updated_at` の新しい側へ収束させます。
