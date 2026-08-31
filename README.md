# まなびぽっぷ！

日本の小学生（1〜6年生）向けに、国語・算数・理科・社会・生活・外国語／英語をゲーム形式で学べるブラウザー教材です。軽量なカートゥーン冒険マップから、その学年で履修する教科と学習テーマを選べます。

## 主な機能

- 文部科学省の学年別漢字配当表（1,026字）に対応した漢字・部首ゲーム
- 学年別単元に沿った算数問題と、ランダムに出題される10問セッション
- 観察条件を変えられる理科実験、月の満ち欠け、電気回路などの学習ゲーム
- 都道府県、産業、歴史、政治を扱う社会問題
- 基礎・英検3級・英検2級・短文読解・長文読解から選べる英語学習
- 生活科の分類・場面判断ゲーム
- 学習状況、スターコイン、クリア履歴のブラウザー保存
- ログインなしですぐ遊べる入口、Googleログインによるクラウド保存
- 無料メンバー向け5分間隔のGoogle H5ゲーム広告と、500円の永久広告なしメンバー
- Cloudflare D1 と IndexedDB の双方向同期、オフライン学習
- DPR 2〜3倍の Retina Canvas と論理座標補正による高精細な表示・タップ判定
- WebGLを使わず低性能端末でも動きやすいカートゥーン冒険マップ
- 音声合成、パーティクル、段階的なヒントによる子ども向けフィードバック

## 起動方法

ES Modules を使用しているため、ファイルを直接開かず、ローカルの静的サーバー経由で起動してください。

```powershell
npx serve .
```

または次のコマンドを使用します。

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

表示された URL をブラウザーで開いてください。

### 同じLANのスマートフォン・タブレットから開く

Windows では次のスクリプトを実行すると、サーバーが全ネットワークインターフェースで待ち受け、利用可能なLAN用URLを表示します。

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-lan-server.ps1
```

手動で起動する場合は `python -m http.server 4173 --bind 0.0.0.0` を使用します。同じWi-Fi／LAN上の端末から `http://<このPCのIPv4アドレス>:4173/` を開いてください。プライベートLANアドレス（`10.x.x.x`、`172.16〜31.x.x`、`192.168.x.x`）ではローカルオフラインモードとなり、OAuth／Turnstile ログインは要求されません。Windows Defender Firewall の確認が表示された場合は、現在利用中のネットワークで Python の通信を許可してください。

## テスト

全テストは次のコマンドで実行できます。

```powershell
node tests/test_e2e_runner.js
```

## Cloudflareへビルド・公開

本番では静的ゲームを Cloudflare Pages（`https://manabi-pop.pages.dev`）から配信し、Pages Function が `/api/*` を Service Binding で認証・教材 API Worker へ同一オリジン転送します。教材、利用者、認証セッション、会員権、支払いイベント、通過状況、挑戦履歴、卒業証は Cloudflare D1 を唯一のクラウドデータベースとして扱います。`data/` の JSON はローカル開発と D1 インポート元としてだけ保持され、静的成果物には含めません。本番実行時は `/api/game-data/` が D1 を読み、JSON ファイルへフォールバックしません。

```powershell
npm install
npm run deploy
```

このコマンドは全テスト、`dist/` 再構築、D1 マイグレーション、全教材の D1 インポート、Worker 配備を順番に実行します。OAuth JSONや秘密値は `secrets/`、`.dev.vars`、Cloudflare Worker Secretsだけに保存し、GitHubへコミットしません。

個別の検証方法と対象範囲は [TEST_INFRA.md](TEST_INFRA.md) と [TEST_READY.md](TEST_READY.md) を参照してください。

## 主な構成

- `index.html`：ホーム画面、学年・教科メニュー、各種モーダル
- `MiniGameSystem.js`：全教科のゲーム制御と問題生成
- `CurriculumData.js`：学年・教科・学習テーマの対応
- `GalaxyEngine.js`：軽量カートゥーン冒険マップの描画
- `RadicalQuestionBank.js`：学年別の部首・漢字パーツ問題
- `data/`：漢字、教科、都道府県、英語などの教材データ
- `.agents/agents/`：製品管理、設計、品質保証、修復、知識グラフ管理の役割定義
- `tests/`：単体・統合・回帰テスト
- `migrations/`：Cloudflare D1 の教材、認証、利用者、進捗、挑戦履歴、卒業証スキーマ
- `worker/`：Cloudflare Worker の認証、会員決済、D1 API
- `src/auth/`：任意のGoogleログインモーダルとTurnstile
- `src/ads/` / `src/membership/`：実プレイ時間広告と広告なしメンバー管理
- `src/storage/`：IndexedDB オフラインキャッシュと D1 の競合解決・一括同期
- `src/render/`：全Canvas共通の高DPIレンダラー

Cloudflare への配備と秘密値の登録は [worker/README.md](worker/README.md) を参照してください。ローカルホストでは認証を要求せず、自動的にオフライン開発モードへ切り替わります。

## 言語方針

画面文言、説明文、開発文書、エージェント指示は日本語を標準とします。英語学習問題の英文、JavaScript の識別子、JSON のスキーマ名、Web API 名など、教材または機械的な互換性に必要な文字列は翻訳しません。
