// English option quality inside the e2e runner (ported from the DING
// worktree's test, adapted to the single shared validator in
// src/runtime/ChoiceQuality.mjs).
const path = require('node:path');
const fs = require('node:fs');

module.exports = ({ describe, test, assert, loadESModule }) => {
  const root = path.resolve(__dirname, '..');
  const { getEnglishQuestionBank } = loadESModule(path.join(root, 'src/competitions/EnglishQuestionBank.mjs'));
  const { englishPool } = loadESModule(path.join(root, 'src/world/FoundationEnglish.mjs'));
  const { assertChoiceSet, auditChoiceSet } = loadESModule(path.join(root, 'src/runtime/ChoiceQuality.mjs'));
  const games = loadESModule(path.join(root, 'MiniGameSystem.js'));
  const { createSession } = loadESModule(path.join(root, 'src/competitions/PracticeData.mjs'));
  const rules = item => auditChoiceSet(item).map(issue => issue.rule);

  describe('英語：近い意味の選択肢と長さの品質ゲート', () => {
    test('全モードと学年で、4択・正解・長さ・多数決・本文一致を検査する', () => {
      assert.strictEqual(games.getEnglishQuestionBank, getEnglishQuestionBank, '日本のゲームと英検は同じ生成器を使う');
      assert.ok(!fs.existsSync(path.join(root, 'src/learning/EnglishChoiceQuality.mjs')), '選択肢の検査器は1つだけ');
      for (const mode of ['BASIC', 'EIKEN3', 'EIKEN2', 'SHORT_READING', 'LONG_READING']) {
        const bank = getEnglishQuestionBank(mode);
        assert.strictEqual(bank.length, 200);
        bank.forEach(question => { assert.strictEqual(question.options.length, 4, question.id); assertChoiceSet(question); });
        for (let run = 0; run < 5; run++) {
          const session = createSession(bank);
          assert.strictEqual(session.length, 10);
          assert.strictEqual(new Set(session.map(question => question.id)).size, 10);
          session.forEach(question => assertChoiceSet(question));
        }
      }
      for (let grade = 0; grade <= 6; grade++) {
        for (const locale of ['ja', 'en', 'zh']) {
          englishPool(grade, locale).forEach(question => assertChoiceSet(question, { key: 'choices' }));
        }
      }
    });

    test('文型と動作の頻度を均等にして選択肢だけの多数決を防ぐ', () => {
      for (const mode of ['BASIC', 'EIKEN3', 'EIKEN2']) {
        for (const question of getEnglishQuestionBank(mode)) {
          const [a, b, c, d] = question.options;
          let start = 0;
          while (a[start] === b[start] && start < Math.min(a.length, b.length)) start++;
          let end = 0;
          while (a[a.length - 1 - end] === b[b.length - 1 - end] && end < Math.min(a.length, b.length) - start) end++;
          const original = a.slice(start, a.length - end);
          const alternate = b.slice(start, b.length - end);
          assert.ok(original && alternate, question.id);
          const substitutions = [];
          for (let position = c.indexOf(original); position !== -1; position = c.indexOf(original, position + 1)) {
            substitutions.push(c.slice(0, position) + alternate + c.slice(position + original.length));
          }
          assert.ok(substitutions.includes(d), `${question.id}: 動作と文型が2対2で対応する`);
        }
      }
    });

    test('無関係な短文・長さの外れ値・多数決・重複や欠落した正解を拒否する', () => {
      const bad = options => ({ correct: options[0], choices: options });
      assert.ok(rules(bad(['The blue schoolbag is cheaper than the red one.', 'Hello.', 'Good morning.', 'Thank you.'])).includes('answer-longest'));
      assert.ok(rules(bad(['It is on a map of the sea.', 'International cooperation.', 'Environmental protection.', 'Community transportation.'])).length, 'word-count / shape outlier');
      assert.ok(rules(bad(['Hello.', 'hello!', 'Thanks.', 'Sorry.'])).includes('duplicate-option'));
      assert.ok(rules(bad(['私は図書館で本を読む。', '私は明日の午後に図書館で本をたくさん読みます。', '私は教室で手紙を書く。', '私は学校で地図を見る。'])).includes('isolated-length'));
      assert.ok(rules({ correct: 'Absent.', choices: ['Red.', 'Blue.', 'Green.', 'Yellow.'] }).includes('answer-count'));
      assert.ok(rules(bad(['Red.', '!!!', 'Blue.', 'Green.'])).includes('empty-option'));
      assert.ok(rules(bad(['Open your book.', 'Close your book.', 'Open your bag.', 'Open my book.'])).includes('convergence'));
      assert.deepStrictEqual(rules(bad(['Open your book.', 'Close your book.', 'Open your bag.', 'Close your bag.'])), []);
      assert.deepStrictEqual(rules(bad(['Red.', 'Blue.', 'Green.', 'Yellow.'])), []);
    });
  });
};

if (require.main === module) {
  const harness = require('./test_e2e_runner.js');
  module.exports(harness);
  harness.harness.runAll().then(report => {
    if (report.summary.failed) process.exitCode = 1;
  });
}
