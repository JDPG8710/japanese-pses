# Cloudflare Worker 配備手順

この Worker は Turnstile、Google／Apple 認証、10分ゲスト体験、KV セッション、R2 学習データを同一の認証境界で提供します。

## 1. リソース作成

```powershell
npx wrangler kv namespace create SESSION_KV
npx wrangler kv namespace create GUEST_KV
npx wrangler r2 bucket create japanese-pses-game-data
```

返された ID を `wrangler.toml` に設定します。プレビュー用も別に作成してください。

## 2. 機密値の登録

```powershell
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put APPLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
npx wrangler secret put FINGERPRINT_PEPPER
```

`JWT_SECRET` と `FINGERPRINT_PEPPER` はそれぞれ独立した32バイト以上の乱数にします。Apple の Client Secret は Apple Developer の秘密鍵で署名した短期 JWT を設定し、期限前にローテーションしてください。

## 3. OAuth 設定

- Google の承認済みリダイレクト URI：`https://<API_ORIGIN>/api/auth/google`
- Apple Services ID の Return URL：`https://<API_ORIGIN>/api/auth/apple`
- Turnstile の許可ホスト：`APP_ORIGIN` のホスト名

Apple の Return URL は HTTPS の公開ドメインが必須で、localhost や IP アドレスは登録できません。ローカル開発はアプリ側の `Local Offline Mode` を使用します。

## 4. 星図の初期投入と配備

```powershell
npx wrangler r2 object put japanese-pses-game-data/star_graph.json --file=data/subjects_curriculum.json --content-type=application/json --remote
npx wrangler deploy
```

プレイヤーのセーブデータは `users/{userId}/game_state.json`、星図は `star_graph.json` に保存されます。KV／R2 バケットを公開アクセスにせず、Worker 経由だけで読み書きしてください。

## 運用上の注意

- Turnstile Secret、OAuth Secret、Apple 秘密鍵、JWT Secret を Git へコミットしません。
- R2 PUT はステージ精算または60秒デバウンスの一括同期だけにします。
- KV は結果整合性のため、強い同時実行制御が必要な課金処理には使いません。
- 本番前に `APP_ORIGIN`、`API_ORIGIN`、Client ID、KV ID、R2 名のプレースホルダーを置換します。
