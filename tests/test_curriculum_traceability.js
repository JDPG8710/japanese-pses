/**
 * Curriculum traceability and routing contract tests.
 *
 * These tests intentionally use an independent, frozen expectation map.  Reading
 * gameType from a node and asserting that it exists would only test the JSON
 * parser, not the product contract.
 */

const fs = require('fs');
const path = require('path');

function register({ describe, test, assert, loadESModule }) {
  const rootDir = path.resolve(__dirname, '..');
  const loader = loadESModule || require('./test_e2e_runner.js').loadESModule;
  const miniGames = loader(path.join(rootDir, 'MiniGameSystem.js'));
  const { MiniGameModal, GAME_GRADE_SUPPORT_MAP } = miniGames;

  const EXPECTED_ROUTES = {
    KOKUGO_G1_KANA: 'KOKUGO_CURRICULUM',
    KOKUGO_G1_KANJI_80: 'KOKUGO_CURRICULUM',
    MATH_G1_ADD_SUB: 'MATH_CURRICULUM',
    SEIKATSU_G1_SCHOOL_LIFE: 'LIFE_CURRICULUM',
    KOKUGO_G2_RADICAL_160: 'KOKUGO_CURRICULUM',
    MATH_G2_KUKU_LINK: 'MATH_CURRICULUM',
    SEIKATSU_G2_TOWN_TOMATO: 'LIFE_CURRICULUM',
    KOKUGO_G3_ROMAJI_PROVERB: 'KOKUGO_CURRICULUM',
    MATH_G3_DIV_FRACTION: 'MATH_CURRICULUM',
    RIKA_G3_MAGNET_INSECT: 'SCIENCE_CURRICULUM',
    SHAKAI_G3_MAP_SYMBOLS: 'SOCIAL_CURRICULUM',
    EIGO_G3_GREETING_COLOR: 'ENGLISH_CURRICULUM',
    KOKUGO_G4_CONJUNCTIONS: 'KOKUGO_CURRICULUM',
    MATH_G4_AREA_DECIMAL: 'MATH_CURRICULUM',
    RIKA_G4_AIR_ASTRONOMY: 'SCIENCE_CURRICULUM',
    SHAKAI_G4_PREFECTURES_47: 'SOCIAL_CURRICULUM',
    EIGO_G4_TIME_DAYS: 'ENGLISH_CURRICULUM',
    KOKUGO_G5_KEIGO_CLASSICS: 'KOKUGO_CURRICULUM',
    MATH_G5_RATIO: 'MATH_CURRICULUM',
    RIKA_G5_ELECTROMAGNET: 'SCIENCE_CURRICULUM',
    SHAKAI_G5_INDUSTRY_BELT: 'SOCIAL_CURRICULUM',
    EIGO_G5_DAILY_ROUTINE: 'ENGLISH_CURRICULUM',
    KOKUGO_G6_LOGIC_ESSAY: 'KOKUGO_CURRICULUM',
    MATH_G6_PROPORTION_SPEED: 'MATH_CURRICULUM',
    RIKA_G6_LEVER_AQUEOUS: 'SCIENCE_CURRICULUM',
    SHAKAI_G6_HISTORY_CONSTITUTION: 'SOCIAL_CURRICULUM',
    EIGO_G6_DREAMS_CULTURE: 'ENGLISH_CURRICULUM'
  };

  const EXPECTED_SUBJECTS = {
    1: ['国語', '算数', '生活'],
    2: ['国語', '算数', '生活'],
    3: ['国語', '算数', '理科', '社会', '外国語・英語'],
    4: ['国語', '算数', '理科', '社会', '外国語・英語'],
    5: ['国語', '算数', '理科', '社会', '外国語・英語'],
    6: ['国語', '算数', '理科', '社会', '外国語・英語']
  };

  function loadMasterNodes() {
    const master = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'subjects_curriculum.json'), 'utf8'));
    return master.nodes;
  }

  describe('Curriculum Traceability: frozen 27-node routing contract', () => {
    test('CT1: all and only the 27 curriculum nodes use their exact approved gameType', () => {
      const nodes = loadMasterNodes();
      assert.strictEqual(nodes.length, 27, 'The traceability contract covers exactly 27 nodes');
      assert.strictEqual(new Set(nodes.map(node => node.id)).size, 27, 'Curriculum node IDs must be unique');
      assert.deepStrictEqual(
        [...nodes.map(node => node.id)].sort(),
        Object.keys(EXPECTED_ROUTES).sort(),
        'Node set must exactly match the frozen traceability matrix'
      );
      nodes.forEach(node => {
        assert.strictEqual(
          node.gameType,
          EXPECTED_ROUTES[node.id],
          `${node.id} must route to ${EXPECTED_ROUTES[node.id]}, not ${node.gameType}`
        );
      });
    });

    test('CT2: grade-visible subjects exactly match the elementary curriculum', () => {
      const nodes = loadMasterNodes();
      for (let grade = 1; grade <= 6; grade++) {
        const actual = [...new Set(nodes.filter(node => node.grade === grade).map(node => node.subject))].sort();
        const expected = [...EXPECTED_SUBJECTS[grade]].sort();
        assert.deepStrictEqual(actual, expected, `Grade ${grade} visible subjects must match the frozen matrix`);
      }
    });

    test('CT3: every routed gameType is registered and explicitly supports its node grade', () => {
      const modal = new MiniGameModal();
      loadMasterNodes().forEach(node => {
        assert.ok(
          GAME_GRADE_SUPPORT_MAP[node.gameType],
          `${node.id} routes to unregistered gameType ${node.gameType}`
        );
        assert.strictEqual(
          modal.isGameSupportedForGrade(node.gameType, node.grade),
          true,
          `${node.gameType} must explicitly support Grade ${node.grade}`
        );
      });
    });

    test('CT4: unknown game types fail closed', () => {
      const modal = new MiniGameModal();
      ['UNKNOWN', 'MATH_TYPO', '', null, undefined].forEach(gameType => {
        assert.strictEqual(
          modal.isGameSupportedForGrade(gameType, 3),
          false,
          `Unknown gameType ${String(gameType)} must not silently fall back to another game`
        );
      });
    });

    test('CT5: Grade 3-6 math stays on MATH_CURRICULUM for 1,000 route resolutions per grade', () => {
      const modal = new MiniGameModal();
      for (let grade = 3; grade <= 6; grade++) {
        for (let attempt = 0; attempt < 1000; attempt++) {
          const inferred = modal.inferGameTypeBySubject({ subject: '算数', grade });
          assert.strictEqual(inferred, 'MATH_CURRICULUM', `Grade ${grade} math must never infer a balance game`);
          assert.notStrictEqual(inferred, 'AETHER_SCALE');
          assert.notStrictEqual(inferred, 'RATIO_SCALE');
        }
      }
    });
  });

  describe('Progress and failure safety contract', () => {
    test('CT6: zero-star/zero-score result must not dispatch GAME_CLEAR_SUCCESS', () => {
      const modal = new MiniGameModal();
      modal.currentLevel = 1;
      let clearEvents = 0;
      const handler = () => { clearEvents++; };
      window.addEventListener('GAME_CLEAR_SUCCESS', handler);
      modal.onGameOver({
        id: 'MATH_G3_DIV_FRACTION', subject: '算数', grade: 3,
        name: 'Failure boundary', gameType: 'MATH_CURRICULUM'
      }, 0, 0);
      window.removeEventListener('GAME_CLEAR_SUCCESS', handler);
      assert.strictEqual(clearEvents, 0, 'A failed or zero-score attempt must not be recorded as a clear');
    });

    test('CT7: zero-accuracy attempt must not mark a stage clear, unlock mastery, or award coins', () => {
      localStorage.clear();
      const { EconomyManager } = loader(path.join(rootDir, 'EconomySystem.js'));
      const economy = new EconomyManager();
      const beforeCoins = economy.starCoins;
      const nodeId = 'MATH_G3_DIV_FRACTION';
      economy.recordStageClear(nodeId, 1, 0);
      assert.strictEqual(economy.isStageCleared(nodeId, 1), false, '0-accuracy stage must remain uncleared');
      assert.strictEqual(economy.playerMastery[nodeId] || 0, 0, '0-accuracy attempt must not unlock mastery');
      assert.strictEqual(economy.starCoins, beforeCoins, '0-accuracy attempt must not award coins');
    });
  });
}

module.exports = register;
module.exports.register = register;
