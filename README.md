# 日本小学校 星図学習ゲーム

日本の小学生（1〜6年生）向けに、国語・算数・理科・社会・生活・外国語／英語をゲーム形式で学べるブラウザー教材です。学年を選ぶと、その学年で履修する教科と学習テーマだけが表示されます。

## 主な機能

- 文部科学省の学年別漢字配当表（1,026字）に対応した漢字・部首ゲーム
- 学年別単元に沿った算数問題と、ランダムに出題される10問セッション
- 観察条件を変えられる理科実験、月の満ち欠け、電気回路などの学習ゲーム
- 都道府県、産業、歴史、政治を扱う社会問題
- 基礎・英検3級・英検2級・短文読解・長文読解から選べる英語学習
- 生活科の分類・場面判断ゲーム
- 学習状況、スターコイン、クリア履歴のブラウザー保存
- 6種類の宇宙背景に加え、大樹や高層都市などを選べるテーマ機能
- 音声合成、パーティクル、段階的なヒントによる子ども向けフィードバック

## 起動方法

ES Modules を使用しているため、ファイルを直接開かず、ローカルの静的サーバー経由で起動してください。

```powershell
npx serve .
```

または次のコマンドを使用します。

```powershell
python -m http.server 8080
```

表示された URL をブラウザーで開いてください。

## テスト

全テストは次のコマンドで実行できます。

```powershell
node tests/test_e2e_runner.js
```

個別の検証方法と対象範囲は [TEST_INFRA.md](TEST_INFRA.md) と [TEST_READY.md](TEST_READY.md) を参照してください。

## Cloudflare Workers への公開

本プロジェクトは Cloudflare Workers Static Assets に対応しています。公開用ファイルだけを `dist/` に生成するため、テスト、開発文書、エージェント設定は配信されません。

```powershell
npm install
npm run check
npm run deploy
```

初回の手動公開では、先に `npx wrangler login` で Cloudflare を認証してください。独自ドメインを設定しなくても、Cloudflare が発行する `workers.dev` の URL で確認できます。

### Git 連携による自動公開

Cloudflare ダッシュボードの **Workers & Pages** から **Create application**、**Import a repository** の順に進み、このリポジトリを接続します。次の値を設定すると、`main` ブランチへの更新時に自動でテスト、ビルド、公開できます。

- Build command: `npm run check`
- Deploy command: `npx wrangler deploy`
- Production branch: `main`

機能ブランチの変更はプレビュー URL で確認し、問題がなければ `main` にマージしてください。

## 主な構成

- `index.html`：ホーム画面、学年・教科メニュー、各種モーダル
- `MiniGameSystem.js`：全教科のゲーム制御と問題生成
- `CurriculumData.js`：学年・教科・学習テーマの対応
- `GalaxyEngine.js`：星図とテーマ背景の描画
- `RadicalQuestionBank.js`：学年別の部首・漢字パーツ問題
- `data/`：漢字、教科、都道府県、英語などの教材データ
- `.agents/agents/`：製品管理、設計、品質保証、修復、知識グラフ管理の役割定義
- `tests/`：単体・統合・回帰テスト

## 言語方針

画面文言、説明文、開発文書、エージェント指示は日本語を標準とします。英語学習問題の英文、JavaScript の識別子、JSON のスキーマ名、Web API 名など、教材または機械的な互換性に必要な文字列は翻訳しません。
