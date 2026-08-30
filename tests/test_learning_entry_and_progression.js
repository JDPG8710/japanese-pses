const fs = require('fs');
const path = require('path');

module.exports = ({ describe, test, assert, loadESModule }) => {
  const root = path.resolve(__dirname, '..');

  describe('学習入口と全学年 Profile', () => {
    test('初回アクセスで名前・年齢・性別を入力し、既定のひなたを表示しない', () => {
      const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      for (const field of ['learner_name', 'learner_age', 'learner_gender', 'learner_profile_completed']) {
        assert.ok(html.includes(field), `${field} をプロフィールへ保存してください`);
      }
      assert.ok(html.includes('new LearnerProfileModal()'), '認証後に学習者プロフィール入力を実行してください');
      assert.ok(html.includes('profile-learner-summary'), 'Profileで入力内容を確認できるようにしてください');
      assert.ok(!html.includes('id="current-user-name">ひなた</span>'), '既定名ひなたを表示しないでください');
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
      assert.ok(/PSES\s*<\/span>\s*<span[^>]*>Game/.test(html), '入口の上部に PSES Game のゲーム名を表示してください');
      assert.ok(css.includes('@keyframes pses-brand-float'), 'PSES Game の軽量アニメーションが必要です');
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

    test('銀河テーマは多層6色渦状腕・巨大ブラックホール・大判学科惑星を描画する', () => {
      const galaxy = fs.readFileSync(path.join(root, 'GalaxyEngine.js'), 'utf8');
      const build = fs.readFileSync(path.join(root, 'scripts', 'build.mjs'), 'utf8');
      assert.ok(galaxy.includes('spectralPalette'), '6本の渦状腕に補助色パレットが必要です');
      assert.ok(galaxy.includes('nebulaDustPoints') && galaxy.includes('nebulaSparkPoints') && galaxy.includes('nebulaRibbons'), '星雲はダスト・星・発光リボンの多層構成にしてください');
      assert.ok(galaxy.includes('blackHolePhotonRing') && galaxy.includes('blackHoleDisks') && galaxy.includes('blackHoleJets'), '中心に光子リング・降着円盤・双極ジェットを持つブラックホールが必要です');
      assert.ok(galaxy.includes('new THREE.SphereGeometry(24, 64, 64)'), '事象の地平面を十分大きく描画してください');
      assert.ok(galaxy.includes("node.status === 'CLEARED' ? 8.2 : (node.status === 'AVAILABLE' ? 7.4 : 6.2)"), '学科惑星を従来より大きくしてください');
      assert.ok(galaxy.includes('isInteractionHitSurface') && galaxy.includes('Math.max(14, radius * 1.9)'), 'タッチ用の大判ヒット領域が必要です');
      assert.ok(galaxy.includes('getSubjectSelectionPosition(node)'), '学年選択後は学科惑星を画面内の安定軌道へ配置してください');
      assert.ok(build.includes("createHash('sha256')") && build.includes("slice(0, 12)"), '同日中の再配信でも新しい静的資産を取得できる内容ハッシュが必要です');
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
