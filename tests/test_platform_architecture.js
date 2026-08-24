const fs = require('fs');
const path = require('path');

module.exports = ({ describe, test, assert, loadESModule }) => {
  const root = path.resolve(__dirname, '..');
  const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

  describe('Cloudflare エッジ認証・保存契約', () => {
    test('Worker は必須認証、ゲスト、R2 API を公開する', () => {
      const worker = read('worker/index.js');
      for (const route of [
        '/api/auth/turnstile-verify', '/api/auth/google', '/api/auth/apple',
        '/api/guest/start', '/api/guest/status', '/api/game-data', '/api/star-graph', '/api/state'
      ]) assert.ok(worker.includes(route), `${route} が必要です`);
      assert.ok(worker.includes('https://challenges.cloudflare.com/turnstile/v0/siteverify'));
      assert.ok(worker.includes('GUEST_TTL_SECONDS'));
      assert.ok(worker.includes('users/${encodeURIComponent(userId)}/game_state.json'));
      assert.ok(worker.includes('code_challenge_method'));
      assert.ok(worker.includes("claims.nonce !== expectedNonce"));
    });

    test('ログイン画面は可視Turnstile完了後だけGoogleとゲストを許可する', () => {
      const modal = read('src/auth/LoginModal.js');
      const manager = read('src/auth/AuthManager.js');
      assert.ok(modal.includes("action: 'access'"), 'ログインとゲストで同じ検証actionを使用してください');
      assert.ok(modal.includes("appearance: 'always'"), '人間確認を常に表示してください');
      assert.ok(modal.includes('data-provider="google" disabled'), '検証前はGoogleボタンを無効にしてください');
      assert.ok(modal.includes('data-action="guest" disabled'), '検証前はゲストボタンを無効にしてください');
      assert.ok(!modal.includes('data-provider="apple"'), 'Appleログインボタンは一時的に非表示にしてください');
      assert.ok(manager.includes("provider !== 'google'"), '画面外からApple認証を開始できないようにしてください');
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

    test('旧ゲスト記録を移行し、週2時間・7日周期の新しい体験を発行する', async () => {
      const worker = loadESModule(path.join(root, 'worker/index.js')).default;
      const originalFetch = global.fetch;
      const originalNow = Date.now;
      const now = 1_800_000_000_000;
      let current = { status: 'EXPIRED', startTime: now - 86_400_000, expiresAt: now - 1, blockExpiresAt: now + 2_000_000 };
      let stored;
      let storedOptions;
      let deleted = false;
      global.fetch = async () => new Response(JSON.stringify({ success: true, hostname: 'app.example.test', action: 'access' }), {
        headers: { 'content-type': 'application/json' }
      });
      Date.now = () => now;
      try {
        const response = await worker.fetch(new Request('https://app.example.test/api/guest/start', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fingerprintHash: 'a'.repeat(64), 'cf-turnstile-response': 'valid-looking-token' })
        }), {
          APP_ORIGIN: 'https://app.example.test', TURNSTILE_HOSTNAME: 'app.example.test',
          TURNSTILE_SECRET_KEY: 'test-secret', FINGERPRINT_PEPPER: 'pepper',
          GUEST_KV: {
            get: async () => current,
            delete: async () => { deleted = true; current = null; },
            put: async (_key, value, options) => { stored = JSON.parse(value); storedOptions = options; current = stored; }
          }
        }, {});
        const result = await response.json();
        assert.equal(response.status, 201);
        assert.equal(deleted, true, '旧30日ポリシー記録を削除してください');
        assert.equal(result.policyVersion, 2);
        assert.equal(result.expiresAt - result.startTime, 2 * 60 * 60 * 1000);
        assert.equal(result.blockExpiresAt - result.startTime, 7 * 24 * 60 * 60 * 1000);
        assert.equal(stored.policyVersion, 2);
        assert.equal(storedOptions.expirationTtl, 7 * 24 * 60 * 60);
      } finally {
        global.fetch = originalFetch;
        Date.now = originalNow;
      }
    });

    test('ゲスト残り時間を2時間対応の時分秒で表示する', () => {
      const manager = read('src/auth/GuestTrialManager.js');
      assert.ok(manager.includes('2 * 60 * 60 * 1000'));
      assert.ok(manager.includes('7 * 24 * 60 * 60 * 1000'));
      assert.ok(manager.includes('formatGuestRemaining(remaining)'));
      assert.ok(manager.includes("String(hours).padStart(2, '0')"));
    });

    test('Wrangler は KV 2系統と R2 を束縛し、秘密値を平文で持たない', () => {
      const config = read('wrangler.toml');
      assert.ok(config.includes('binding = "SESSION_KV"'));
      assert.ok(config.includes('binding = "GUEST_KV"'));
      assert.ok(config.includes('binding = "GAME_DATA_R2"'));
      assert.ok(config.includes('directory = "./dist"'));
      assert.ok(config.includes('run_worker_first = ["/api/*"]'));
      for (const secret of ['TURNSTILE_SECRET_KEY =', 'GOOGLE_CLIENT_SECRET =', 'APPLE_CLIENT_SECRET =', 'JWT_SECRET =', 'FINGERPRINT_PEPPER =']) {
        assert.ok(!config.includes(secret), `${secret} を設定ファイルへ書かないでください`);
      }
    });

    test('Worker のヘルスチェックと不正JSONが実行時に正しい状態コードを返す', async () => {
      const workerModule = loadESModule(path.join(root, 'worker/index.js'));
      const worker = workerModule.default;
      const health = await worker.fetch(new Request('https://api.example.test/api/health'), { APP_ORIGIN: 'https://app.example.test' }, {});
      assert.equal(health.status, 200);
      const invalid = await worker.fetch(new Request('https://api.example.test/api/auth/turnstile-verify', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{'
      }), { APP_ORIGIN: 'https://app.example.test' }, {});
      assert.equal(invalid.status, 400);
    });

    test('教材APIはR2オブジェクトをETag付きで配信する', async () => {
      const worker = loadESModule(path.join(root, 'worker/index.js')).default;
      const env = {
        APP_ORIGIN: 'https://app.example.test',
        GAME_DATA_R2: {
          get: async key => key === 'game-data/metadata.json'
            ? { body: JSON.stringify({ grades: [] }), httpEtag: '"content-v1"', httpMetadata: { contentType: 'application/json; charset=utf-8' } }
            : null
        }
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

  describe('IndexedDB と R2 の競合マージ', () => {
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

    test('R2教材はIndexedDB互換キャッシュへ保存できる', async () => {
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
        director_agent: ['Turnstile', 'R2', 'DPR'],
        game_designer_agent: ['HDCanvasRenderer', 'exportSaveState', 'StorageAdapter'],
        qa_player_agent: ['Playwright', '2時間', 'DPR'],
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
