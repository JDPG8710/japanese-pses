/** Programmatic question-bank scale, curriculum coverage and randomness tests. */

const fs = require('fs');
const path = require('path');

function register({ describe, test, assert, loadESModule }) {
  const rootDir = path.resolve(__dirname, '..');
  const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
  const games = loader(path.join(rootDir, 'MiniGameSystem.js'));
  const radicalBank = loader(path.join(rootDir, 'RadicalQuestionBank.js'));

  const MATH_THEME_BASELINE = {
    1: [/100/, /たし算|加/, /ひき算|減/, /比較|大小/, /形|かたち/, /長さ/, /時刻|時間/],
    2: [/大きな数|数/, /たし算|加/, /ひき算|減/, /九九|かけ算/, /長さ/, /容量|かさ/, /時刻|時間/, /表/],
    3: [/かけ算|乗/, /わり算|除/, /余り|あまり/, /分数/, /小数/, /時間|時刻/, /計量|長さ|重さ/, /表/, /棒グラフ|グラフ/],
    4: [/大きな数|四則/, /小数/, /分数/, /角/, /面積/, /折れ線|グラフ/],
    5: [/小数/, /分数/, /面積/, /体積/, /平均/, /単位量/, /割合|百分率/, /多角形|円/],
    6: [/分数/, /(?:^|\|)比(?:\||$)/, /比例/, /速さ/, /体積|立体/, /対称/, /統計|データ/]
  };

  const ABOVE_GRADE_MATH = {
    1: [/九九|かけ算|わり算|分数|小数|割合|百分率|比例|速さ|体積|統計/],
    2: [/小数|百分率|比例|速さ|体積|平均|統計/],
    3: [/百分率|比例|速さ|体積|平均|統計|対称/],
    4: [/百分率|比例|速さ|体積|平均|対称/],
    5: [/比例|速さ|統計|対称/],
    6: []
  };

  function makeCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    return canvas;
  }

  function assertQuestion(question, label) {
    assert.ok(question && typeof question === 'object', `${label}: question object is required`);
    assert.ok(String(question.prompt || question.q || '').trim(), `${label}: prompt must be non-empty`);
    const correct = String(question.correct);
    const options = question.options;
    assert.ok(Array.isArray(options), `${label}: options must be an array`);
    assert.strictEqual(options.length, 4, `${label}: exactly four options are required`);
    assert.strictEqual(new Set(options.map(String)).size, 4, `${label}: options must be unique`);
    assert.ok(options.map(String).includes(correct), `${label}: correct answer must be present in options`);
    assert.ok(!options.some(value => /NaN|undefined|null/.test(String(value))), `${label}: options must not contain NaN/undefined/null`);
    assert.ok(!/NaN|undefined|null/.test(correct), `${label}: correct answer must be valid`);
  }

  function extractSession(game) {
    if (typeof game.getSessionQuestions === 'function') return game.getSessionQuestions();
    return game.sessionQuestions || game.questionSet || game.questions || null;
  }

  describe('Grade-aligned radical and component bank', () => {
    test('RB1: every grade has 12 valid assigned-kanji puzzles across three question types', () => {
      const kanjiDb = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'kanji_1026.json'), 'utf8'));
      for (let grade = 1; grade <= 6; grade++) {
        const bank = radicalBank.RADICAL_PUZZLES_BY_GRADE[grade];
        const allowed = new Set(kanjiDb.grades[grade].kanjiList.map(entry => entry.k));
        assert.strictEqual(bank.length, 12, `Grade ${grade} radical bank must contain 12 puzzles`);
        assert.deepStrictEqual(new Set(bank.map(puzzle => puzzle.type)), new Set(['ASSEMBLY', 'RADICAL_CHOICE', 'STRUCTURE_CHOICE']), `Grade ${grade} must cover all three radical question types`);
        bank.forEach((puzzle, index) => {
          assert.ok(allowed.has(puzzle.target), `Grade ${grade} puzzle ${index} uses out-of-grade kanji ${puzzle.target}`);
          assert.ok(puzzle.prompt && puzzle.reading && puzzle.hint, `Grade ${grade} puzzle ${index} must have complete display text`);
          assert.ok(Array.isArray(puzzle.parts) && puzzle.parts.length > 0, `Grade ${grade} puzzle ${index} requires answer parts`);
          assert.ok(Array.isArray(puzzle.options) && puzzle.options.length >= 4, `Grade ${grade} puzzle ${index} requires usable options`);
          const rendered = JSON.stringify(puzzle);
          assert.strictEqual(/undefined|null|NaN/.test(rendered), false, `Grade ${grade} puzzle ${index} contains an invalid display value`);
          puzzle.parts.forEach(part => assert.ok(puzzle.options.includes(part), `Grade ${grade} puzzle ${index} omits required part ${part}`));
        });
      }
    });

    test('RB2: RadicalBuilder rejects generic quiz records and always creates a safe random 10-puzzle session', () => {
      for (let grade = 1; grade <= 6; grade++) {
        const game = new games.RadicalBuilderGame(makeCanvas(), {
          questions: [{ prompt: 'generic quiz', correct: 'x', options: ['x', 'y', 'z', 'w'] }]
        }, () => {}, grade, 1);
        assert.strictEqual(game.puzzles.length, 10, `Grade ${grade} must start with ten radical puzzles`);
        game.puzzles.forEach((puzzle, index) => {
          assert.ok(puzzle.target && puzzle.parts.length, `Grade ${grade} puzzle ${index} must be radical-shaped data`);
          assert.strictEqual(/undefined|null|NaN/.test(JSON.stringify(puzzle)), false, `Grade ${grade} puzzle ${index} must be render-safe`);
        });
      }
    });

    test('RB3: selected answers become explicit interaction state in radical and shared quiz games', () => {
      global.HTMLElement = global.HTMLElement || function HTMLElement() {};
      const canvas = makeCanvas();
      canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 480 });
      const radical = new games.RadicalBuilderGame(canvas, {}, () => {}, 3, 1);
      radical.running = true;
      radical.setupPuzzle();
      const requiredTile = radical.palette.find(tile => tile.text === radical.requiredParts[0]);
      radical.handlePointer({ clientX: requiredTile.x, clientY: requiredTile.y });
      assert.strictEqual(requiredTile.used, true, 'radical tile must retain a selected state for highlighting');

      const quiz = new games.CurriculumQuizGame(canvas, {}, () => {}, 3, 1, '国語');
      quiz.running = true;
      const layout = quiz.getOptionLayout();
      quiz.handlePointer({ clientX: layout.x + 20, clientY: layout.startY + 20 });
      assert.ok(quiz.selectedOption, 'shared curriculum quiz must retain the selected option');
      assert.strictEqual(quiz.locked, true, 'selected quiz option must remain visible during feedback');
      radical.destroy();
      quiz.destroy();
    });
  });

  describe('Math curriculum procedural engine', () => {
    test('QB1: MathCurriculumGame is a dedicated exported engine', () => {
      assert.strictEqual(typeof games.MathCurriculumGame, 'function', 'MATH_CURRICULUM must not fall back to balance/Kanji');
    });

    test('QB2: Grades 1-6 each survive 1,000 generated questions with valid unique options', () => {
      assert.strictEqual(typeof games.MathCurriculumGame, 'function', 'MathCurriculumGame export is required');
      for (let grade = 1; grade <= 6; grade++) {
        const game = new games.MathCurriculumGame(makeCanvas(), {}, () => {}, grade, 1);
        for (let attempt = 0; attempt < 1000; attempt++) {
          const question = game.buildQuestion(attempt % 5);
          assertQuestion(question, `Grade ${grade} math sample ${attempt}`);
          const content = `${question.theme || ''} ${question.prompt || question.q || ''}`;
          ABOVE_GRADE_MATH[grade].forEach(pattern => {
            assert.strictEqual(pattern.test(content), false, `Grade ${grade} math sample ${attempt} contains an above-grade topic: ${content}`);
          });
        }
        if (game.destroy) game.destroy();
      }
    });

    test('QB3: every grade covers every frozen math theme family', () => {
      assert.strictEqual(typeof games.MathCurriculumGame, 'function', 'MathCurriculumGame export is required');
      const missingByGrade = [];
      for (let grade = 1; grade <= 6; grade++) {
        const game = new games.MathCurriculumGame(makeCanvas(), {}, () => {}, grade, 1);
        const themes = [];
        for (let attempt = 0; attempt < 2000; attempt++) {
          themes.push(String(game.buildQuestion(attempt % 5).theme || ''));
        }
        const joined = themes.join('|');
        const missing = MATH_THEME_BASELINE[grade].filter(pattern => !pattern.test(joined));
        if (missing.length) missingByGrade.push(`G${grade}: ${missing.map(String).join(', ')}`);
        if (game.destroy) game.destroy();
      }
      assert.deepStrictEqual(missingByGrade, [], `Frozen math theme gaps: ${missingByGrade.join('; ')}`);
    });

    test('QB4: an actual math session exposes exactly 10 non-repeating questions', () => {
      assert.strictEqual(typeof games.MathCurriculumGame, 'function', 'MathCurriculumGame export is required');
      for (let grade = 1; grade <= 6; grade++) {
        for (let run = 0; run < 10; run++) {
          const game = new games.MathCurriculumGame(makeCanvas(), {}, () => {}, grade, 1);
          const session = extractSession(game);
          assert.ok(Array.isArray(session), `Grade ${grade} math must expose its real session question list for QA`);
          assert.strictEqual(session.length, 10, `Grade ${grade} math session must contain exactly 10 questions`);
          const identities = session.map(q => `${q.prompt || q.q}::${q.correct}`);
          assert.strictEqual(new Set(identities).size, 10, `Grade ${grade} math session must not repeat questions`);
          session.forEach((question, index) => assertQuestion(question, `Grade ${grade} session question ${index}`));
          if (game.destroy) game.destroy();
        }
      }
    });
  });

  describe('English five-mode banks', () => {
    const modes = ['BASIC', 'EIKEN3', 'EIKEN2', 'SHORT_READING', 'LONG_READING'];

    test('QB5: every English mode has at least 200 structurally unique records', () => {
      assert.strictEqual(typeof games.getEnglishQuestionBank, 'function', 'getEnglishQuestionBank export is required');
      modes.forEach(mode => {
        const bank = games.getEnglishQuestionBank(mode);
        assert.isAtLeast(bank.length, 200, `${mode} must contain at least 200 questions`);
        assert.isAtLeast(new Set(bank.map(item => JSON.stringify(item))).size, 200, `${mode} must contain 200 unique records`);
      });
    });

    test('QB6: every English mode draws exactly 10 unique questions per session', () => {
      assert.strictEqual(typeof games.ContextMatchGame, 'function', 'ContextMatchGame export is required');
      modes.forEach(mode => {
        const orders = new Set();
        for (let run = 0; run < 20; run++) {
          const game = new games.ContextMatchGame(makeCanvas(), { difficulty: mode }, () => {}, 5, 1);
          if (typeof game.setDifficulty === 'function') game.setDifficulty(mode);
          const session = game.selectedQuestionSet || extractSession(game);
          assert.ok(Array.isArray(session), `${mode} must expose its selected session for QA`);
          assert.strictEqual(session.length, 10, `${mode} must draw exactly 10 questions`);
          assert.strictEqual(new Set(session.map(item => JSON.stringify(item))).size, 10, `${mode} session must be duplicate-free`);
          session.forEach((item, index) => {
            if (Array.isArray(item.options)) assertQuestion({ prompt: item.prompt || item.question || item.passage, correct: item.correct, options: item.options }, `${mode} ${index}`);
          });
          orders.add(session.map(item => item.id || `${item.prompt}::${item.correct}`).join('|'));
          if (game.destroy) game.destroy();
        }
        assert.isAbove(orders.size, 1, `${mode} must select a different random 10-question order across launches`);
      });
    });
  });

  describe('Science and life curriculum randomness', () => {
    test('QB7: science/life pools cover every approved grade and can form 10-question sessions', () => {
      assert.strictEqual(typeof games.CurriculumQuizGame, 'function', 'CurriculumQuizGame export is required');
      const matrix = { '理科': [3, 4, 5, 6], '生活': [1, 2] };
      Object.entries(matrix).forEach(([subject, grades]) => grades.forEach(grade => {
        const game = new games.CurriculumQuizGame(makeCanvas(), { subject, grade }, () => {}, grade, 1, subject);
        const session = extractSession(game);
        assert.ok(Array.isArray(session), `${subject} Grade ${grade} must expose the selected pool slice`);
        assert.strictEqual(session.length, 10, `${subject} Grade ${grade} needs at least 10 usable questions`);
        assert.strictEqual(new Set(session.map(item => JSON.stringify(item))).size, 10, `${subject} Grade ${grade} needs 10 unique questions`);
        session.forEach((question, index) => assertQuestion(question, `${subject} Grade ${grade} question ${index}`));
        if (game.destroy) game.destroy();
      }));
    });

    test('QB8: repeated science/life sessions change order while each session remains unique', () => {
      assert.strictEqual(typeof games.CurriculumQuizGame, 'function', 'CurriculumQuizGame export is required');
      const matrix = { '理科': [3, 4, 5, 6], '生活': [1, 2] };
      Object.entries(matrix).forEach(([subject, grades]) => grades.forEach(grade => {
        const orders = new Set();
        for (let run = 0; run < 12; run++) {
          const game = new games.CurriculumQuizGame(makeCanvas(), { subject, grade }, () => {}, grade, 1);
          const session = extractSession(game);
          assert.ok(Array.isArray(session), `${subject} Grade ${grade} must expose a session list`);
          assert.strictEqual(session.length, 10, `${subject} Grade ${grade} session must contain 10 questions`);
          const ids = session.map(q => `${q.prompt || q.q}::${q.correct}`);
          assert.strictEqual(new Set(ids).size, 10, `${subject} Grade ${grade} session must not repeat`);
          orders.add(ids.join('|'));
          if (game.destroy) game.destroy();
        }
        assert.isAbove(orders.size, 1, `${subject} Grade ${grade} session order must vary across launches`);
      }));
    });
  });
}

module.exports = register;
module.exports.register = register;
