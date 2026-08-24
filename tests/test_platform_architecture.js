const fs = require('fs');
const path = require('path');

module.exports = ({ describe, test, assert, loadESModule }) => {
  const root = path.resolve(__dirname, '..');
  const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

  describe('Cloudflare エッジ認証・保存契約', () => {
    test('Worker は必須認証、ゲスト、D1教材・進捗APIを公開する', () => {
      const worker = read('worker/index.js');
      for (const route of [
        '/api/auth/turnstile-verify', '/api/auth/google', '/api/auth/apple',
        '/api/guest/start', '/api/guest/status', '/api/guest/usage', '/api/game-data', '/api/star-graph', '/api/state'
      ]) assert.ok(worker.includes(route), `${route} が必要です`);
      assert.ok(worker.includes('https://challenges.cloudflare.com/turnstile/v0/siteverify'));
      assert.ok(worker.includes('GUEST_TTL_SECONDS'));
      assert.ok(worker.includes('requiredDatabase(env)'));
      assert.ok(worker.includes('content_documents'));
      assert.ok(worker.includes('node_progress'));
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

    test('旧ゲスト記録を移行し、累積2時間・7日周期の新しい体験を発行する', async () => {
      const worker = loadESModule(path.join(root, 'worker/index.js')).default;
      const originalFetch = global.fetch;
      const originalNow = Date.now;
      const now = 1_800_000_000_000;
      let current = { policyVersion: 2, status: 'EXPIRED', startTime: now - 86_400_000, blockExpiresAt: now + 2_000_000 };
      let stored;
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
          DB: createD1Mock({
            first: sql => sql.includes('FROM guest_trials') && current ? {
              policy_version: current.policyVersion,
              status: current.status,
              start_time: current.startTime,
              expires_at: current.blockExpiresAt,
              block_expires_at: current.blockExpiresAt,
              used_ms: current.usedMs || 0,
              last_heartbeat_at: current.lastHeartbeatAt || null,
              is_playing: current.isPlaying ? 1 : 0
            } : null,
            run: (sql, args) => {
              if (sql.startsWith('DELETE FROM guest_trials')) { deleted = true; current = null; }
              if (sql.includes('INSERT INTO guest_trials')) {
                stored = { policyVersion: args[1], status: 'ACTIVE', startTime: args[2], blockExpiresAt: args[3], usedMs: 0, isPlaying: false };
                current = stored;
              }
            }
          })
        }, {});
        const result = await response.json();
        assert.equal(response.status, 201);
        assert.equal(deleted, true, '旧方式の記録を削除してください');
        assert.equal(result.policyVersion, 3);
        assert.equal(result.usedMs, 0);
        assert.equal(result.remainingMs, 2 * 60 * 60 * 1000);
        assert.equal(result.periodEndsAt - result.periodStartedAt, 7 * 24 * 60 * 60 * 1000);
        assert.equal(stored.policyVersion, 3);
        assert.equal(stored.blockExpiresAt - stored.startTime, 7 * 24 * 60 * 60 * 1000);
      } finally {
        global.fetch = originalFetch;
        Date.now = originalNow;
      }
    });

    test('Worker は遊んでいる区間だけを累積し、ハートビート遅延を45秒で制限する', async () => {
      const worker = loadESModule(path.join(root, 'worker/index.js')).default;
      const originalNow = Date.now;
      let now = 1_800_000_000_000;
      const allowance = 2 * 60 * 60 * 1000;
      const current = {
        policy_version: 3, status: 'ACTIVE', start_time: now - 60_000,
        expires_at: now + 604_800_000, block_expires_at: now + 604_800_000,
        used_ms: 10_000, last_heartbeat_at: now - 30_000, is_playing: 1
      };
      const database = createD1Mock({
        first: sql => sql.includes('FROM guest_trials') ? { ...current } : null,
        run: (sql, args) => {
          if (!sql.includes('UPDATE guest_trials SET')) return;
          const [heartbeatAt, graceMs, limitMs, reportedMs, active] = args;
          const delta = current.is_playing && current.last_heartbeat_at != null
            ? Math.min(graceMs, Math.max(0, heartbeatAt - current.last_heartbeat_at))
            : 0;
          current.used_ms = Math.min(limitMs, Math.max(reportedMs, current.used_ms + delta));
          current.status = current.used_ms >= limitMs ? 'EXPIRED' : 'ACTIVE';
          current.is_playing = current.status === 'EXPIRED' ? 0 : active;
          current.last_heartbeat_at = heartbeatAt;
        }
      });
      const env = { APP_ORIGIN: 'https://app.example.test', FINGERPRINT_PEPPER: 'pepper', DB: database };
      const request = (route, active) => new Request(`https://app.example.test/api/guest/${route}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fingerprintHash: 'b'.repeat(64), usedMs: current.used_ms, ...(active == null ? {} : { active }) })
      });
      Date.now = () => now;
      try {
        let response = await worker.fetch(request('usage', true), env, {});
        let result = await response.json();
        assert.equal(result.usedMs, 40_000, '直前のプレイ30秒を一度だけ加算してください');
        now += 5 * 60 * 1000;
        response = await worker.fetch(request('status'), env, {});
        result = await response.json();
        assert.equal(result.usedMs, 85_000, '長い通信断は45秒までに制限してください');
        now += 5 * 60 * 1000;
        response = await worker.fetch(request('status'), env, {});
        result = await response.json();
        assert.equal(result.usedMs, 85_000, '停止中の経過時間を加算しないでください');
        assert.equal(result.remainingMs, allowance - 85_000);
      } finally {
        Date.now = originalNow;
      }
    });

    test('ゲスト残り時間を2時間対応の時分秒で表示する', () => {
      const manager = read('src/auth/GuestTrialManager.js');
      assert.ok(manager.includes('2 * 60 * 60 * 1000'));
      assert.ok(manager.includes('7 * 24 * 60 * 60 * 1000'));
      assert.ok(manager.includes('formatGuestRemaining(this.remainingMs)'));
      assert.ok(manager.includes("String(hours).padStart(2, '0')"));
      assert.ok(manager.includes('GAME_PLAY_STATE_CHANGED'));
      assert.ok(manager.includes('プレイ中のみ'));
    });

    test('ブラウザー側もゲーム実行中だけ残り時間を減らす', () => {
      const { GuestTrialManager } = loadESModule(path.join(root, 'src/auth/GuestTrialManager.js'));
      let now = 10_000;
      let stageVisible = true;
      const manager = new GuestTrialManager({
        storage: { saveGuestTracker: async () => {}, getGuestTracker: async () => null },
        fetchImpl: null,
        now: () => now,
        setIntervalImpl: () => 1,
        clearIntervalImpl: () => {},
        isGameStageVisible: () => stageVisible
      });
      manager.fingerprintHash = 'c'.repeat(64);
      manager.resume({ usedMs: 0, remainingMs: 7_200_000, periodStartedAt: now, periodEndsAt: now + 604_800_000 });
      manager.setGameActive(true);
      now += 1_000;
      manager.tick();
      now += 1_000;
      manager.tick();
      assert.equal(manager.usedMs, 2_000);
      manager.setGameActive(false);
      now += 60_000;
      manager.tick();
      assert.equal(manager.usedMs, 2_000, 'ゲーム停止中の1分を消費しないでください');

      stageVisible = false;
      manager.setGameActive(true);
      now += 60_000;
      manager.tick();
      assert.equal(manager.usedMs, 2_000, '星図・学科選択画面では活動イベントを受けても消費しないでください');

      stageVisible = true;
      manager.setGameActive(true);
      now += 1_000;
      manager.tick();
      stageVisible = false;
      now += 60_000;
      manager.tick();
      assert.equal(manager.usedMs, 3_000, 'ゲーム画面を閉じた後の時間を消費しないでください');
      manager.destroy();
    });

    test('星図画面はゲスト活動を明示停止し、ゲーム画面の可視性を二重確認する', () => {
      const html = read('index.html');
      const manager = read('src/auth/GuestTrialManager.js');
      assert.ok(html.includes("phase: 'GALAXY_SELECTION'"));
      assert.ok(manager.includes('defaultGameStageVisible'));
      assert.ok(manager.includes('this.isGameStageVisible()'));
      assert.ok(manager.includes("'星図では停止中'"));
    });

    test('Wrangler はD1を唯一のクラウドデータストアとして束縛し、秘密値を平文で持たない', () => {
      const config = read('wrangler.toml');
      assert.ok(config.includes('binding = "DB"'));
      assert.ok(config.includes('database_name = "japanese-pses-production"'));
      assert.ok(config.includes('migrations_dir = "migrations"'));
      assert.ok(!config.includes('SESSION_KV'));
      assert.ok(!config.includes('GUEST_KV'));
      assert.ok(!config.includes('GAME_DATA_R2'));
      assert.ok(config.includes('directory = "./dist"'));
      assert.ok(config.includes('run_worker_first = ["/api/*"]'));
      for (const secret of ['TURNSTILE_SECRET_KEY =', 'GOOGLE_CLIENT_SECRET =', 'APPLE_CLIENT_SECRET =', 'JWT_SECRET =', 'FINGERPRINT_PEPPER =']) {
        assert.ok(!config.includes(secret), `${secret} を設定ファイルへ書かないでください`);
      }
    });

    test('Worker のヘルスチェックと不正JSONが実行時に正しい状態コードを返す', async () => {
      const workerModule = loadESModule(path.join(root, 'worker/index.js'));
      const worker = workerModule.default;
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
