const fs = require('fs');
const path = require('path');

module.exports = ({ describe, test, assert, loadESModule }) => {
  const root = path.resolve(__dirname, '..');
  const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

  describe('Cloudflare エッジ認証・会員・保存契約', () => {
    test('Worker は任意認証、会員購入、D1教材・進捗APIを公開する', () => {
      const worker = read('worker/index.js');
      for (const route of [
        '/api/auth/turnstile-verify', '/api/auth/google', '/api/auth/session',
        '/api/membership', '/api/membership/checkout', '/api/membership/webhook',
        '/api/game-data', '/api/star-graph', '/api/state'
      ]) assert.ok(worker.includes(route), `${route} が必要です`);
      for (const removedRoute of ['/api/guest/start', '/api/guest/status', '/api/guest/usage']) {
        assert.ok(!worker.includes(`url.pathname === '${removedRoute}'`), `${removedRoute} は廃止してください`);
      }
      assert.ok(worker.includes('https://challenges.cloudflare.com/turnstile/v0/siteverify'));
      assert.ok(worker.includes('MEMBERSHIP_PRICE_JPY = 500'));
      assert.ok(worker.includes('STRIPE_CHECKOUT_URL'));
      assert.ok(worker.includes('requiredDatabase(env)'));
      assert.ok(worker.includes('content_documents'));
      assert.ok(worker.includes('node_progress'));
      assert.ok(worker.includes('code_challenge_method'));
      assert.ok(worker.includes("claims.nonce !== expectedNonce"));
    });

    test('初回はログインを強制せず、Googleログインを利用者が後から開ける', () => {
      const modal = read('src/auth/LoginModal.js');
      const manager = read('src/auth/AuthManager.js');
      assert.ok(modal.includes("action: 'access'"));
      assert.ok(modal.includes("appearance: 'always'"));
      assert.ok(modal.includes('data-provider="google" disabled'));
      assert.ok(modal.includes('今はログインしない'));
      assert.ok(!modal.includes('data-action="guest"'));
      assert.ok(!modal.includes('data-provider="apple"'));
      assert.ok(manager.includes("mode: 'anonymous'"));
      assert.ok(manager.includes('async showLogin('));
      assert.ok(!manager.includes('GuestTrialManager'));
      assert.ok(!manager.includes('await this.modal.show({ message: availability'));
    });

    test('匿名利用者には実プレイ5分ごとに、安全な区切りでログイン案内を一度表示する', async () => {
      const { LoginReminderManager, LOGIN_REMINDER_INTERVAL_MS } = loadESModule(path.join(root, 'src/auth/LoginReminderManager.js'));
      assert.equal(LOGIN_REMINDER_INTERVAL_MS, 5 * 60 * 1000);
      let now = 1000;
      let reminders = 0;
      const manager = new LoginReminderManager({
        now: () => now,
        isVisible: () => true,
        onReminder: () => { reminders += 1; },
        setIntervalImpl: () => 1,
        clearIntervalImpl: () => {}
      }).start();
      manager.setGameActive(true);
      for (let i = 0; i < 60; i += 1) { now += 5000; manager.tick(); }
      assert.equal(manager.reminderDue, true);
      assert.equal(reminders, 0, '答えを入力している途中では案内を重ねないでください');
      manager.setGameActive(false);
      await Promise.resolve();
      assert.equal(reminders, 1);
      manager.setGameActive(false);
      assert.equal(reminders, 1, '同じ5分枠で二重表示しないでください');
      manager.setSessionMode('authenticated');
      now += LOGIN_REMINDER_INTERVAL_MS;
      manager.tick();
      manager.setGameActive(false);
      assert.equal(reminders, 1, 'ログイン済み利用者には表示しないでください');
      manager.destroy();
    });

    test('Worker はTurnstile actionがaccessと完全一致しないトークンを拒否する', async () => {
      const worker = loadESModule(path.join(root, 'worker/index.js')).default;
      const originalFetch = global.fetch;
      global.fetch = async () => new Response(JSON.stringify({ success: true, hostname: 'app.example.test', action: 'auth' }), {
        headers: { 'content-type': 'application/json' }
      });
      try {
        const response = await worker.fetch(new Request('https://app.example.test/api/auth/google', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ 'cf-turnstile-response': 'valid-looking-token' })
        }), { APP_ORIGIN: 'https://app.example.test', TURNSTILE_HOSTNAME: 'app.example.test', TURNSTILE_SECRET_KEY: 'test-secret' }, {});
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error, 'TURNSTILE_FAILED');
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('無料会員は5分の実プレイ後、安全な画面遷移まで広告を待つ', () => {
      const { H5AdManager, FREE_AD_INTERVAL_MS } = loadESModule(path.join(root, 'src/ads/H5AdManager.js'));
      assert.equal(FREE_AD_INTERVAL_MS, 5 * 60 * 1000);
      let now = 1000;
      let continued = 0;
      const manager = new H5AdManager({ now: () => now, intervalMs: 300_000, setIntervalImpl: () => 1, clearIntervalImpl: () => {} }).start();
      manager.setGameActive(true);
      for (let i = 0; i < 60; i += 1) { now += 5000; manager.tick(); }
      assert.equal(manager.adDue, true, 'ゲーム中は広告を直接割り込ませず、表示待ちにしてください');
      manager.runAtSafeBreak(() => { continued += 1; });
      assert.equal(manager.adDue, false);
      assert.equal(continued, 1);
      manager.setAdFree(true);
      now += 300_000;
      manager.tick();
      assert.equal(manager.adDue, false, '広告なしメンバーには広告を予約しないでください');
      manager.destroy();
    });

    test('AdSenseタグはPagesに一度だけ埋め込み、H5広告管理へ同じ公開IDを渡す', () => {
      const page = read('index.html');
      const ads = read('src/ads/H5AdManager.js');
      const publisherId = 'ca-pub-8738651569097071';
      assert.ok(page.includes(`<meta name="google-adsense-account" content="${publisherId}"`));
      assert.ok(page.includes(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`));
      assert.ok(page.includes('crossorigin="anonymous"'));
      assert.ok(page.includes('membershipStatus.googleH5AdsPublisherId || embeddedAdsPublisherId'));
      assert.ok(ads.includes('const existingScript = Array.from(document.scripts || [])'));
      assert.ok(ads.includes('if (existingScript)'));
    });

    test('Stripe Webhook は生本文のHMAC署名と5分以内の時刻だけを受け付ける', async () => {
      const { verifyStripeWebhookSignature } = loadESModule(path.join(root, 'worker/index.js'));
      const body = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed' });
      const secret = 'whsec_test_value';
      const timestamp = 1_800_000_000;
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)));
      const digest = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
      assert.equal(await verifyStripeWebhookSignature(body, `t=${timestamp},v1=${digest}`, secret, timestamp + 10), true);
      assert.equal(await verifyStripeWebhookSignature(body, `t=${timestamp},v1=${digest}`, secret, timestamp + 301), false);
      assert.equal(await verifyStripeWebhookSignature(`${body} `, `t=${timestamp},v1=${digest}`, secret, timestamp), false);
    });

    test('会員マイグレーションは永久広告なし権利と支払いイベントをD1へ保存する', () => {
      const migration = read('migrations/0004_membership_and_ads.sql');
      assert.ok(!migration.includes('DROP TABLE'), '旧试玩记录は履歴として残し、不可逆に削除しないでください');
      assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS memberships'));
      assert.ok(migration.includes("AD_FREE_LIFETIME"));
      assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS payment_events'));
      assert.ok(migration.includes('REFERENCES users(user_id)'));
    });

    test('Pages は静的フロントを配信し、Service BindingでD1 API Workerへ同一オリジン接続する', () => {
      const config = read('wrangler.toml');
      const pagesConfig = read('wrangler.jsonc');
      const pagesProxy = read('functions/api/[[path]].js');
      assert.ok(config.includes('binding = "DB"'));
      assert.ok(config.includes('database_name = "japanese-pses-production"'));
      assert.ok(config.includes('migrations_dir = "migrations"'));
      assert.ok(config.includes('workers_dev = false'), 'API Worker は Pages の Service Binding だけから公開してください');
      assert.ok(!config.includes('SESSION_KV'));
      assert.ok(!config.includes('GUEST_KV'));
      assert.ok(!config.includes('GAME_DATA_R2'));
      assert.ok(!config.includes('[assets]'), 'API Workerから静的フロントを分離してください');
      assert.ok(pagesConfig.includes('"pages_build_output_dir": "./dist"'));
      assert.ok(pagesConfig.includes('"binding": "API"'));
      assert.ok(pagesConfig.includes('"service": "japanese-pses"'));
      assert.ok(pagesProxy.includes('context.env.API.fetch(context.request)'));
      assert.ok(config.includes('APP_ORIGIN = "https://piko-game.com"'));
      assert.ok(config.includes('API_ORIGIN = "https://piko-game.com"'));
      assert.ok(config.includes('TURNSTILE_HOSTNAMES = "piko-game.com,manabi-pop.pages.dev"'));
      const packageScripts = JSON.parse(read('package.json')).scripts;
      const dataImporter = read('scripts/import-game-data-d1.mjs');
      assert.ok(packageScripts['db:migrate'].includes('--config wrangler.toml'));
      assert.ok(packageScripts['db:migrate:local'].includes('--config wrangler.toml'));
      assert.ok(dataImporter.includes("path.join(root, 'wrangler.toml')"));
      for (const secret of ['TURNSTILE_SECRET_KEY =', 'GOOGLE_CLIENT_SECRET =', 'APPLE_CLIENT_SECRET =', 'JWT_SECRET =', 'FINGERPRINT_PEPPER =', 'STRIPE_SECRET_KEY =', 'STRIPE_WEBHOOK_SECRET =']) {
        assert.ok(!config.includes(secret), `${secret} を設定ファイルへ書かないでください`);
      }
    });

    test('ローカルプレビューは正式ビルドへ教材を混ぜず、日本の学年教材だけを安全に配信する', () => {
      const preview = read('scripts/preview-world.mjs');
      const build = read('scripts/build.mjs');
      const loader = read('CurriculumData.js');
      assert.ok(preview.includes("const dataRoot=path.resolve('data')"));
      assert.ok(preview.includes("url.pathname.startsWith('/data/')"));
      assert.ok(preview.includes("/^[a-z0-9_-]+\\.json$/i.test(name)"), '教材パスは単一の安全なJSON名だけを許可してください');
      assert.ok(preview.includes('path.dirname(file)!==dataRoot'), '教材ディレクトリ外への移動を拒否してください');
      assert.ok(preview.includes("readdir('migrations')"), 'ローカルD1も全マイグレーションを順番に適用してください');
      assert.ok(!build.includes("['assets', 'css', 'data', 'js', 'src']"), '本番の静的成果物へ教材JSONを混ぜないでください');
      assert.ok(loader.includes("fetch(localPath, { cache: 'no-store' })"));
      assert.ok(loader.includes('安全のため空の知識グラフを返します'), '欠損時に別学年の問題へフォールバックしないでください');
    });

    test('Pages API proxy はURL・Cookie・レスポンスヘッダーを変えずにWorkerへ転送する', async () => {
      const { onRequest } = loadESModule(path.join(root, 'functions/api/[[path]].js'));
      const request = new Request('https://piko-game.com/api/auth/session', {
        headers: { cookie: 'pses_session=test-token', origin: 'https://piko-game.com' }
      });
      let forwarded;
      const response = await onRequest({
        request,
        env: {
          API: {
            fetch: async incoming => {
              forwarded = incoming;
              return new Response('{"authenticated":true}', {
                headers: { 'content-type': 'application/json', 'set-cookie': 'pses_session=renewed; Path=/; Secure' }
              });
            }
          }
        }
      });
      assert.equal(forwarded.url, request.url);
      assert.equal(forwarded.headers.get('cookie'), 'pses_session=test-token');
      assert.equal(response.headers.get('set-cookie'), 'pses_session=renewed; Path=/; Secure');
      assert.deepEqual(await response.json(), { authenticated: true });
    });

    test('旧Workerの画面URLはPagesへ恒久転送し、未知APIはJSON 404のままにする', async () => {
      const worker = loadESModule(path.join(root, 'worker/index.js')).default;
      const env = { APP_ORIGIN: 'https://piko-game.com' };
      const page = await worker.fetch(new Request('https://old.example.test/grade/1?from=legacy'), env, {});
      assert.equal(page.status, 308);
      assert.equal(page.headers.get('location'), 'https://piko-game.com/grade/1?from=legacy');
      const api = await worker.fetch(new Request('https://old.example.test/api/not-found'), env, {});
      assert.equal(api.status, 404);
      assert.equal((await api.json()).error, 'NOT_FOUND');
    });

    test('Worker のヘルスチェックと不正JSONが実行時に正しい状態コードを返す', async () => {
      const worker = loadESModule(path.join(root, 'worker/index.js')).default;
      const health = await worker.fetch(new Request('https://api.example.test/api/health'), {
        APP_ORIGIN: 'https://app.example.test', DB: createD1Mock({ first: () => ({ ready: 1 }) })
      }, {});
      assert.equal(health.status, 200);
      const invalid = await worker.fetch(new Request('https://api.example.test/api/auth/turnstile-verify', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{'
      }), { APP_ORIGIN: 'https://app.example.test' }, {});
      assert.equal(invalid.status, 400);
    });

    test('教材APIはD1分割ドキュメントをETag付きで配信する', async () => {
      const worker = loadESModule(path.join(root, 'worker/index.js')).default;
      const env = {
        APP_ORIGIN: 'https://app.example.test',
        DB: createD1Mock({
          first: (sql, args) => sql.includes('FROM content_documents') && args[0] === 'metadata.json'
            ? { document_key: 'metadata.json', etag: '"content-v1"', content_type: 'application/json; charset=utf-8', byte_size: 13, chunk_count: 2 }
            : null,
          all: sql => sql.includes('content_document_chunks')
            ? { results: [{ content_chunk: '{"grades":' }, { content_chunk: '[]}' }] }
            : { results: [] }
        })
      };
      const response = await worker.fetch(new Request('https://app.example.test/api/game-data/metadata.json'), env, {});
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('etag'), '"content-v1"');
      assert.deepEqual(await response.json(), { grades: [] });
      const unchanged = await worker.fetch(new Request('https://app.example.test/api/game-data/metadata.json', {
        headers: { 'if-none-match': '"content-v1"' }
      }), env, {});
      assert.equal(unchanged.status, 304);
    });
  });

  describe('Retina Canvas 論理座標', () => {
    test('DPR 3でも物理サイズと論理サイズを分離し、ヒット座標を補正する', () => {
      global.window.devicePixelRatio = 3;
      const { HDCanvasRenderer, getLogicalCanvasWidth, getLogicalCanvasHeight, eventToCanvasPoint } = loadESModule(path.join(root, 'src/render/HDCanvasRenderer.js'));
      const context = { scale() {}, clearRect() {}, save() {}, restore() {}, imageSmoothingEnabled: false, textAlign: '', textBaseline: '' };
      const canvas = {
        width: 0, height: 0, style: {}, dataset: {},
        getContext: () => context,
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 320, height: 180 })
      };
      const renderer = HDCanvasRenderer.setup(canvas, 320, 180);
      assert.equal(canvas.width, 960);
      assert.equal(canvas.height, 540);
      assert.equal(getLogicalCanvasWidth(canvas), 320);
      assert.equal(getLogicalCanvasHeight(canvas), 180);
      const point = eventToCanvasPoint(canvas, { clientX: 170, clientY: 110 });
      assert.equal(point.x, 160);
      assert.equal(point.y, 90);
      renderer.dispose();
    });
  });

  describe('IndexedDB と D1 の競合マージ', () => {
    test('profile と node_progress は updated_at が新しい側を採用する', () => {
      const { mergeSnapshots } = loadESModule(path.join(root, 'src/storage/StorageAdapter.js'));
      const merged = mergeSnapshots(
        { updatedAt: 20, profile: { user_id: 'u', star_coins: 800, updated_at: 20 }, nodeProgress: [{ node_id: 'A', mastery_score: 0.9, updated_at: 20 }] },
        { updatedAt: 10, profile: { user_id: 'u', star_coins: 500, updated_at: 10 }, nodeProgress: [{ node_id: 'A', mastery_score: 0.4, updated_at: 10 }, { node_id: 'B', mastery_score: 0.7, updated_at: 15 }] },
        'u'
      );
      assert.equal(merged.profile.star_coins, 800);
      assert.equal(merged.nodeProgress.find(node => node.node_id === 'A').mastery_score, 0.9);
      assert.equal(merged.nodeProgress.find(node => node.node_id === 'B').mastery_score, 0.7);
    });

    test('同じ node_id でも利用者ごとのローカル進捗を混在させない', async () => {
      const { StorageAdapter } = loadESModule(path.join(root, 'src/storage/StorageAdapter.js'));
      const storage = new StorageAdapter({ fetchImpl: null });
      storage.setUser('user-a', { cloudEnabled: false });
      await storage.saveNodeProgress({ node_id: 'MATH-1', mastery_score: 0.9 });
      storage.setUser('user-b', { cloudEnabled: false });
      await storage.saveNodeProgress({ node_id: 'MATH-1', mastery_score: 0.4 });
      const userB = await storage.getLocalSnapshot();
      assert.equal(userB.nodeProgress.length, 1);
      assert.equal(userB.nodeProgress[0].mastery_score, 0.4);
      storage.setUser('user-a', { cloudEnabled: false });
      const userA = await storage.getLocalSnapshot();
      assert.equal(userA.nodeProgress.length, 1);
      assert.equal(userA.nodeProgress[0].mastery_score, 0.9);
    });

    test('D1教材はIndexedDB互換キャッシュへ保存できる', async () => {
      const { StorageAdapter } = loadESModule(path.join(root, 'src/storage/StorageAdapter.js'));
      const storage = new StorageAdapter({ fetchImpl: null });
      await storage.cacheContent('metadata.json', { grades: [1, 2, 3] }, '"v1"');
      const cached = await storage.getCachedContent('metadata.json');
      assert.deepEqual(cached.data.grades, [1, 2, 3]);
      assert.equal(cached.etag, '"v1"');
    });
  });

  describe('Antigravity 役割契約', () => {
    test('指定5エージェントが認証、保存、Retina の責務を分担する', () => {
      const expectations = {
        director_agent: ['Turnstile', 'D1', 'DPR'],
        game_designer_agent: ['HDCanvasRenderer', 'exportSaveState', 'StorageAdapter'],
        qa_player_agent: ['Playwright', 'DPR'],
        bug_repair_agent: ['DPR_HITBOX_OFFSET', 'CANVAS_MEMORY_LEAK', 'WORKER_CORS'],
        graph_evolution_agent: ['star_graph.json', 'IndexedDB', 'ETag']
      };
      for (const [agent, terms] of Object.entries(expectations)) {
        const content = read(`.agents/agents/${agent}/agent.md`);
        for (const term of terms) assert.ok(content.includes(term), `${agent} に ${term} が必要です`);
      }
    });
  });
};

function createD1Mock(handlers = {}) {
  return {
    prepare(sql) {
      const statement = {
        sql,
        args: [],
        bind(...args) { this.args = args; return this; },
        async first() { return handlers.first ? handlers.first(sql, this.args) : null; },
        async all() { return handlers.all ? handlers.all(sql, this.args) : { results: [] }; },
        async run() { return handlers.run ? (await handlers.run(sql, this.args)) ?? { success: true } : { success: true }; }
      };
      return statement;
    },
    async batch(statements) {
      if (handlers.batch) return handlers.batch(statements);
      return Promise.all(statements.map(statement => statement.run()));
    }
  };
}
