const fs = require('fs');
const path = require('path');

module.exports = ({ describe, test, assert, loadESModule }) => {
  const root = path.resolve(__dirname, '..');

  describe('学習入口と全学年 Profile', () => {
    test('初回はモード選択を先に表示し、名前・年齢・性別を後から設定できる', () => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      for (const field of ['learner_name', 'learner_age', 'learner_gender', 'learner_profile_completed']) {
        assert.ok(html.includes(field), `${field} をプロフィールへ保存してください`);
      }
      assert.ok(html.includes('new LearnerProfileModal()'), '後から開ける学習者プロフィール画面が必要です');
      assert.ok(html.includes('id="learner-profile-edit-btn"'), '学習きろくからプロフィールを設定できるボタンが必要です');
      assert.ok(!html.includes('let learnerProfile = await learnerProfileModal.collect'), '初回表示でプロフィール入力を待たせないでください');
      assert.ok(html.includes("DEFAULT_LEARNER_NAME = 'まなびくん'") || html.includes('DEFAULT_LEARNER_NAME,'), '未設定時は「まなびくん」で開始してください');
      assert.ok(html.includes('profile-learner-summary'), 'Profileで入力内容を確認できるようにしてください');
      assert.ok(html.includes('storedLearnerProfile.name || accessSession.user?.displayName'), '年齢未入力でも保存済みの学習者名を優先してください');
      assert.ok(!html.includes('id="current-user-name">ひなた</span>'), '既定名ひなたを表示しないでください');
      assert.ok(html.includes('id="current-user-name">まなびくん</span>'), '画面上の既定名を「まなびくん」にしてください');
      const auth = fs.readFileSync(path.join(root, 'src', 'auth', 'AuthManager.js'), 'utf8');
      assert.ok(auth.includes("displayName: 'まなびくん'"), 'ローカル免ログイン時も既定名を統一してください');
    });

    test('学習者プロフィールは有効な名前・5〜15歳・性別項目を検証する', () => {
      const profile = loadESModule(path.join(root, 'src/profile/LearnerProfile.js'));
      const valid = profile.validateLearnerProfile({ name: 'あおい', age: '9', gender: 'female' });
      assert.strictEqual(valid.valid, true);
      assert.deepStrictEqual(valid.profile, { name: 'あおい', age: 9, gender: 'female' });
      assert.strictEqual(profile.validateLearnerProfile({ name: '', age: 9, gender: 'female' }).valid, false);
      assert.strictEqual(profile.validateLearnerProfile({ name: 'あおい', age: 4, gender: 'female' }).valid, false);
      assert.strictEqual(profile.validateLearnerProfile({ name: 'あおい', age: 9, gender: '' }).valid, false);
      assert.strictEqual(profile.validateLearnerProfile({ name: 'あ'.repeat(21), age: 9, gender: 'female' }).valid, false);
      assert.strictEqual(profile.isLearnerProfileComplete(null), false, '新規利用者のnullプロフィールを安全に扱ってください');
    });

    test('新しい端末では入力した名前をEconomyの初期利用者にする', () => {
      global.localStorage.clear();
      const { EconomyManager } = loadESModule(path.join(root, 'EconomySystem.js'));
      const economy = new EconomyManager('みなと');
      assert.strictEqual(economy.currentUser, 'みなと');
      assert.strictEqual(economy.activeUser.name, 'みなと');
    });

    test('ログインを強制せず、学年優先・ゲーム優先の2つの入口を表示する', () => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
      const auth = fs.readFileSync(path.join(root, 'src/auth/AuthManager.js'), 'utf8');
      for (const id of [
        'learning-mode-modal', 'learning-mode-game-title', 'grade-first-mode-btn', 'game-first-mode-btn',
        'independent-game-list', 'independent-grade-list'
      ]) assert.ok(html.includes(`id="${id}"`), `${id} が必要です`);
      assert.ok(/ピコ\s*<\/span>\s*<span[^>]*>プレイ/.test(html), '入口の上部に、新しい読みやすいゲーム名を表示してください');
      assert.ok(css.includes('@keyframes pses-brand-float'), 'ゲーム名の軽量アニメーションが必要です');
      assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), '動きを減らす端末設定にも対応してください');
      assert.ok(html.includes('showLearningModeModal();'), '初期化後に入口モーダルを表示する必要があります');
      assert.ok(html.includes('GAME_GRADE_SUPPORT_MAP'), 'ゲームと対応学年は共通マップから生成してください');
      assert.ok(auth.includes('isLocalDevelopmentHost(location.hostname)'), 'ローカル環境は共通判定で認証を迂回してください');
      assert.ok(auth.includes("mode: 'anonymous'"), '本番の未認証アクセスも匿名モードですぐ開始してください');
      assert.ok(auth.includes('async showLogin('), '利用者が後からログイン画面を開けるようにしてください');
    });

    test('ループバックと主要なプライベートLANアドレスはローカル免認証として扱う', () => {
      const { isLocalDevelopmentHost } = loadESModule(path.join(root, 'src/runtime/LocalEnvironment.js'));
      for (const hostname of ['localhost', '127.0.0.1', '::1', '192.168.1.8', '10.0.0.5', '172.16.0.2', '172.31.255.254']) {
        assert.strictEqual(isLocalDevelopmentHost(hostname), true, `${hostname} はローカル環境です`);
      }
      for (const hostname of ['example.com', '8.8.8.8', '172.32.0.1', '192.167.1.8']) {
        assert.strictEqual(isLocalDevelopmentHost(hostname), false, `${hostname} はローカル環境ではありません`);
      }
    });

    test('LAN起動スクリプトは4173番を全インターフェースで公開する', () => {
      const script = fs.readFileSync(path.join(root, 'scripts/start-lan-server.ps1'), 'utf8');
      assert.ok(script.includes('[int]$Port = 4173'));
      assert.ok(script.includes('--bind 0.0.0.0'));
      assert.ok(script.includes('Get-NetFirewallApplicationFilter'));
    });

    test('Profile は6学年ごとの総関門数・クリア数と卒業証を表示する', () => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      for (const id of ['profile-total-progress', 'profile-grade-progress', 'profile-certificate-panel', 'graduation-modal']) {
        assert.ok(html.includes(`id="${id}"`), `${id} が必要です`);
      }
      assert.ok(html.includes('cleared_stages: economy.clearedStages'), 'クリア関門をクラウド同期してください');
      assert.ok(html.includes('好きなゲームからクリアした回数'), 'ゲーム優先モードの結果も学習記録に表示してください');
    });

    test('ホーム背景は制作イラストを使い、学年内の全ステージを選べる軽量冒険マップである', () => {
      const galaxy = fs.readFileSync(path.join(root, 'GalaxyEngine.js'), 'utf8');
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
      const build = fs.readFileSync(path.join(root, 'scripts', 'build.mjs'), 'utf8');
      assert.ok(galaxy.includes('cartoon-map-world') && galaxy.includes('map-stage-stop'), '冒険マップとタップ可能なステージが必要です');
      assert.ok(galaxy.includes('createUnitRoute') && galaxy.includes('createStageButton') && galaxy.includes('getStageCount'), '各単元の全ステージを背景上へ展開してください');
      assert.ok(html.includes('engine.setStageCountResolver') && html.includes('engine.setStageProgressResolver'), '実際の関門数とクリア状態をマップに連携してください');
      assert.ok(!galaxy.includes("from 'three'") && !galaxy.includes('requestAnimationFrame'), 'ホーム画面でThree.jsや常時描画ループを使わないでください');
      assert.ok(!html.includes('https://unpkg.com/three'), 'Three.js CDNを読み込まないでください');
      assert.ok(css.includes("url('../assets/maps/manabi-adventure-map.webp')") && css.includes('.map-unit-route'), '制作イラストと読みやすい単元ルートが必要です');
      assert.ok(css.includes('@media (max-width: 380px)') && css.includes('.map-node-layer { top: 178px; }'), '小画面向けのマップ調整が必要です');
      assert.ok(build.includes("['assets', 'css', 'js', 'src']"), '背景画像をビルド成果物へ含めてください');
      assert.ok(build.includes("createHash('sha256')") && build.includes("slice(0, 12)"), '同日中の再配信でも新しい静的資産を取得できる内容ハッシュが必要です');
    });

    test('一年生かな単元では、ひらがな・カタカナ・音読を別々に選べる', () => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      assert.ok(html.includes("node?.id === 'KOKUGO_G1_KANA'"), '一年生かな単元専用の選択分岐が必要です');
      ['HIRAGANA', 'KATAKANA', 'READ_ALOUD', 'ひらがな たんけん', 'カタカナ ずかん', 'おんどく おはなし'].forEach(text => {
        assert.ok(html.includes(text), `一年生かな選択に ${text} が必要です`);
      });
    });

    test('ゲーム終了時の戻るボタンは現在の冒険マップ名を表示する', () => {
      const miniGameSource = fs.readFileSync(path.join(root, 'MiniGameSystem.js'), 'utf8');
      const currentLabelCount = (miniGameSource.match(/まなびのぼうけんマップへ戻る/g) || []).length;
      assert.strictEqual(currentLabelCount, 2, '失敗画面とクリア画面の両方で現在のマップ名を表示してください');
      assert.strictEqual(miniGameSource.includes('銀河星図へ戻る'), false, '以前の銀河星図という名称をボタンに残さないでください');
    });

    test('学年メニューは連続正解表示の下に配置し、重ならない', () => {
      const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
      assert.ok(css.includes("top: max(4.25rem, calc(env(safe-area-inset-top) + 3.75rem)) !important"));
      assert.ok(css.includes("#grade-tabs-container { top: max(3.75rem"), 'スマートフォンでもヘッダーの下へ配置してください');
    });

    test('ショップのテーマ・バッジ・消費アイテムは表示だけでなく実処理へ接続される', () => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
      const miniGameSource = fs.readFileSync(path.join(root, 'MiniGameSystem.js'), 'utf8');
      const { GalaxyEngine } = loadESModule(path.join(root, 'GalaxyEngine.js'));
      const engine = Object.create(GalaxyEngine.prototype);
      engine.root = { dataset: {} };
      assert.strictEqual(engine.setBackgroundTheme('skin_nebula_aurora'), 'skin_nebula_aurora');
      assert.strictEqual(engine.root.dataset.theme, 'skin_nebula_aurora');
      assert.strictEqual(engine.setBackgroundTheme('unknown'), 'default');
      assert.ok(css.includes('[data-theme="skin_nebula_aurora"]') && css.includes('[data-theme="skin_cyber_neon"]'));
      for (const token of ['setShopItemAdapter', 'persistShopState', 'equipped-badge-icon', 'shop-action-notice', 'activateLearnerProfile']) {
        assert.ok(html.includes(token), `${token} を実際のUI・保存経路へ接続してください`);
      }
      for (const token of ['useTimeExtensionItem', 'useHintRadarItem']) {
        assert.ok(miniGameSource.includes(token), `${token} をゲーム中の実処理へ接続してください`);
      }
    });

    test('新しいゲーム名を1日1回、5秒表示し、閉じるボタンを備える', () => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      for (const token of ['Piko Play', 'daily-brand-splash', 'daily-brand-close', 'MANABI_POP_DAILY_SPLASH_V1']) {
        assert.ok(html.includes(token), `${token} が必要です`);
      }
      assert.ok(html.includes('let brandSecondsLeft = 5'));
      assert.ok(html.includes("timeZone: 'Asia/Tokyo'"));
    });

    test('ゲーム先行カードは難しい一文字名ではなく、親しみやすい固有名を使う', () => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      for (const name of ['ことばのにんじゃ', 'かんじパズルこうぼう', 'すうじのたからじま', 'ぴかぴかでんきこうぼう', 'にじいろえいごランド']) {
        assert.ok(html.includes(name), `${name} をカードに表示してください`);
      }
      assert.ok(html.includes('independent-game-card'));
    });
  });

  describe('小学校課程修了証', () => {
    const progression = loadESModule(path.join(root, 'ProgressionSystem.js'));
    const nodes = [1, 2, 3, 4, 5, 6].map(grade => ({ id: `NODE_G${grade}`, grade }));
    const getMaxStages = () => 2;

    test('学年ごとに関門総数とクリア数を独立集計する', () => {
      const cleared = {
        NODE_G1: { 1: true, 2: true },
        NODE_G2: { 1: true }
      };
      const result = progression.calculateGradeProgress(nodes, cleared, getMaxStages);
      assert.strictEqual(result.length, 6);
      assert.strictEqual(result[0].totalStages, 2);
      assert.strictEqual(result[0].clearedStages, 2);
      assert.strictEqual(result[0].completed, true);
      assert.strictEqual(result[1].clearedStages, 1);
      assert.strictEqual(result[1].completed, false);
    });

    test('6学年の全関門クリア前には証明書を発行しない', () => {
      const progress = progression.calculateGradeProgress(nodes, { NODE_G1: { 1: true, 2: true } }, getMaxStages);
      const certificate = progression.createGraduationCertificate({ userId: 'student', learnerName: 'あおい', gradeProgress: progress });
      assert.strictEqual(certificate, null);
    });

    test('全関門クリア時に1000枚報酬付きの証明書を生成する', () => {
      const cleared = Object.fromEntries(nodes.map(node => [node.id, { 1: true, 2: true }]));
      const progress = progression.calculateGradeProgress(nodes, cleared, getMaxStages);
      const certificate = progression.createGraduationCertificate({
        userId: 'student', learnerName: 'あおい', gradeProgress: progress, issuedAt: '2026-08-24T00:00:00.000Z'
      });
      assert.strictEqual(certificate.id, progression.ELEMENTARY_GRADUATION_ACHIEVEMENT_ID);
      assert.strictEqual(certificate.rewardCoins, 1000);
      assert.strictEqual(certificate.completedStages, 12);
      assert.ok(certificate.certificateNumber.startsWith('PSES-2026-'));
    });

    test('同じ証明書の成果報酬は一度だけ加算する', () => {
      global.localStorage.clear();
      const { EconomyManager } = loadESModule(path.join(root, 'EconomySystem.js'));
      const economy = new EconomyManager();
      const certificate = {
        id: progression.ELEMENTARY_GRADUATION_ACHIEVEMENT_ID,
        title: '小学校課程修了証', certificateNumber: 'PSES-TEST-1',
        issuedAt: '2026-08-24T00:00:00.000Z', rewardCoins: 1000
      };
      const initialCoins = economy.starCoins;
      assert.strictEqual(economy.awardGraduationCertificate(certificate).awarded, true);
      assert.strictEqual(economy.awardGraduationCertificate(certificate).awarded, false);
      assert.strictEqual(economy.starCoins, initialCoins + 1000);
      assert.strictEqual(economy.achievements.length, 1);
    });
  });
};
