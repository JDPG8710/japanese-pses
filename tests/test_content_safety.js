/** Content leakage, pictograph and home-page regression tests. */

const fs = require('fs');
const path = require('path');

function register({ describe, test, assert, loadESModule }) {
  const rootDir = path.resolve(__dirname, '..');
  const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
  const games = loader(path.join(rootDir, 'MiniGameSystem.js'));
  const pictograph = /[\p{Extended_Pictographic}\uFE0F]/u;

  function makeCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    return canvas;
  }

  function semanticAnswer(value) {
    const raw = String(value || '');
    const parenthetical = raw.match(/\(([^)]{1,40})\)|（([^）]{1,40})）/);
    const semantic = parenthetical ? (parenthetical[1] || parenthetical[2]) : raw;
    return semantic
      .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
      .replace(/^[\s〒◎○△×・:：]+/u, '')
      .replace(/\([^)]*\)|（[^）]*）/g, '')
      .replace(/[\s「」『』【】・,，.。:：!?！？]/g, '')
      .trim();
  }

  describe('Social studies content safety', () => {
    test('CS1: all social stems, answers and options contain zero Extended_Pictographic characters', () => {
      assert.strictEqual(typeof games.PrefectureJigsawGame, 'function');
      [3, 4, 5, 6].forEach(grade => {
        const curriculumGame = new games.CurriculumQuizGame(makeCanvas(), {}, () => {}, grade, 1, '社会');
        (curriculumGame.questions || []).forEach(question => {
          const content = [question.prompt, question.correct, ...(question.options || [])].join(' ');
          assert.strictEqual(pictograph.test(content), false, `Grade ${grade} curriculum question contains a pictograph hint: ${content}`);
        });
        if (curriculumGame.destroy) curriculumGame.destroy();

        const mode = grade === 3 ? 'MAP_SYMBOLS' : grade === 4 ? 'PREFECTURES' : grade === 5 ? 'INDUSTRY' : 'HISTORY_CIVICS';
        const game = new games.PrefectureJigsawGame(makeCanvas(), { mode }, () => {}, grade, 1);
        const stages = typeof game.getStagesForCurrentMode === 'function' ? game.getStagesForCurrentMode() : [];
        stages.forEach(stage => {
          const content = [stage.title, stage.q, stage.correct, ...(stage.options || [])].join(' ');
          assert.strictEqual(pictograph.test(content), false, `Grade ${grade} stage ${stage.id} contains a pictograph hint: ${content}`);
        });
        if (game.destroy) game.destroy();
      });
    });

    test('CS2: social question stems do not contain their semantic correct answer', () => {
      [3, 4, 5, 6].forEach(grade => {
        const curriculumGame = new games.CurriculumQuizGame(makeCanvas(), {}, () => {}, grade, 1, '社会');
        (curriculumGame.questions || []).forEach(question => {
          const stem = semanticAnswer(question.prompt);
          const answer = semanticAnswer(question.correct);
          assert.ok(answer.length >= 1, `Grade ${grade} curriculum question must have a meaningful answer`);
          assert.strictEqual(stem.includes(answer), false, `Grade ${grade} curriculum question leaks answer "${answer}" in its stem`);
        });
        if (curriculumGame.destroy) curriculumGame.destroy();

        const mode = grade === 3 ? 'MAP_SYMBOLS' : grade === 4 ? 'PREFECTURES' : grade === 5 ? 'INDUSTRY' : 'HISTORY_CIVICS';
        const game = new games.PrefectureJigsawGame(makeCanvas(), { mode }, () => {}, grade, 1);
        const stages = typeof game.getStagesForCurrentMode === 'function' ? game.getStagesForCurrentMode() : [];
        stages.filter(stage => stage.q && stage.correct).forEach(stage => {
          const stem = semanticAnswer(stage.q);
          const answer = semanticAnswer(stage.correct);
          assert.ok(answer.length >= 2, `Stage ${stage.id} must have a meaningful correct answer`);
          assert.strictEqual(stem.includes(answer), false, `Stage ${stage.id} leaks answer "${answer}" in its stem`);
          assert.ok(Array.isArray(stage.options) && stage.options.map(String).includes(String(stage.correct)), `Stage ${stage.id} correct answer must be selectable`);
          assert.strictEqual(new Set(stage.options.map(String)).size, stage.options.length, `Stage ${stage.id} options must be unique`);
        });
        if (game.destroy) game.destroy();
      });
    });
  });

  describe('Home-page static anti-regression contract', () => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const markupBeforeModule = html.split('<script type="module">')[0].replace(/<!--[\s\S]*?-->/g, '');

    test('CS3: no bottom quick-game launcher is present', () => {
      const forbidden = [
        /id=["'](?:popular-game-bar|quick-game-bar|bottom-game-bar|popular-games)["']/i,
        /class=["'][^"']*(?:quick-game|popular-game|bottom-game)[^"']*["']/i,
        /onclick=["'](?:window\.)?launchPopular\(/i
      ];
      forbidden.forEach(pattern => assert.strictEqual(pattern.test(html), false, `Forbidden quick-game UI matched ${pattern}`));
    });

    test('CS4: no visible Agent status, Agent button, or Agent toast exists in homepage markup', () => {
      [/id=["']agent-toast["']/i, />\s*AI\s*Agent\s*</i, /Agent\s*(?:観測|状态|状態|補助)/i].forEach(pattern => {
        assert.strictEqual(pattern.test(markupBeforeModule), false, `Visible Agent UI matched ${pattern}`);
      });
    });

    test('CS5: grade selection is collapsed initially and appears before the subject selector', () => {
      const gradeToggleIndex = html.indexOf('id="grade-menu-toggle"');
      const gradeMenuIndex = html.indexOf('id="grade-tabs"');
      const subjectNavIndex = html.indexOf('id="subject-nav"');
      assert.ok(gradeToggleIndex >= 0, 'Homepage must expose one grade menu toggle');
      assert.ok(gradeMenuIndex > gradeToggleIndex, 'Collapsed grade menu must be controlled by the grade toggle');
      assert.ok(subjectNavIndex > gradeMenuIndex, 'Grade selection must appear before subject selection');
      assert.match(html.slice(gradeMenuIndex, gradeMenuIndex + 240), /class=["'][^"']*hidden/, 'Grade options must be collapsed initially');
      assert.match(html.slice(subjectNavIndex, subjectNavIndex + 240), /style=["'][^"']*display\s*:\s*none/, 'Subjects must be hidden before selecting a grade');
    });

    test('CS6: subject visibility logic contains the exact lower/upper grade split', () => {
      assert.match(html, /currentActiveGrade\s*<=\s*2[\s\S]{0,160}\['国語',\s*'算数',\s*'生活'\]/, 'Grades 1-2 must show only 国語・算数・生活');
      assert.match(html, /\['国語',\s*'算数',\s*'理科',\s*'社会',\s*'外国語・英語'\]/, 'Grades 3-6 must show 国語・算数・理科・社会・英語');
    });

    test('CS7: visible Japanese copy speaks to children instead of exposing implementation terms', () => {
      const miniGames = fs.readFileSync(path.join(rootDir, 'MiniGameSystem.js'), 'utf8');
      const login = fs.readFileSync(path.join(rootDir, 'src', 'auth', 'LoginModal.js'), 'utf8');
      ['Bloom', '認知深度', '有向グラフ', '独立ゲームモード', '標準モード', '交換履歴元帳', 'Profile'].forEach(term => {
        assert.strictEqual(markupBeforeModule.includes(term), false, `Visible homepage copy must not expose "${term}"`);
      });
      assert.strictEqual(miniGames.includes('操作ヒント：'), false, 'Game guidance must use direct, natural instructions');
      assert.strictEqual(miniGames.includes('(Stage '), false, 'Game titles must not mix developer-style English stage notation into Japanese');
      assert.ok(login.includes('学習きろくを保存しよう') && login.includes('ゲームはログインなしでも遊べます') && login.includes('安全チェック'), 'Login copy must be friendly and understandable');
      assert.ok(html.includes('どちらを選んでも、がんばった記録は「わたしの学習きろく」に残るよ。'), 'Learning entrance must explain the result in child-friendly language');
    });

    test('CS8: homepage exposes complete crawl and share metadata', () => {
      const canonical = 'https://manabi-pop.pages.dev/';
      assert.match(html, /<title>まなびぽっぷ！｜小学生向け無料学習ゲーム<\/title>/);
      assert.match(html, /<meta name="description" content="[^"]+"\s*\/>/);
      assert.ok(html.includes(`<link rel="canonical" href="${canonical}" />`), 'Canonical URL must point to production');
      assert.ok(html.includes('<meta property="og:title"') && html.includes('<meta property="og:description"'), 'Open Graph metadata is required');
      assert.ok(html.includes('<meta name="twitter:card"'), 'Twitter card metadata is required');
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      assert.ok(jsonLdMatch, 'SoftwareApplication JSON-LD is required');
      const structured = JSON.parse(jsonLdMatch[1]);
      const app = structured['@graph'].find(item => item['@type'] === 'SoftwareApplication');
      assert.strictEqual(app.name, 'まなびぽっぷ！');
      assert.strictEqual(app.offers.price, '0');
      assert.strictEqual(app.url, canonical);
      assert.ok(fs.readFileSync(path.join(rootDir, 'robots.txt'), 'utf8').includes('/sitemap.xml'));
      assert.ok(fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8').includes(`<loc>${canonical}</loc>`));
      assert.ok(fs.existsSync(path.join(rootDir, 'site.webmanifest')) && fs.existsSync(path.join(rootDir, 'favicon.svg')));
    });
  });
}

module.exports = register;
module.exports.register = register;
