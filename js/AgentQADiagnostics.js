/**
 * AgentQADiagnostics.js - エージェント自動テスト・原因診断・修復提案エンジン
 * 
 * 1. Playwright によるデスクトップ・タブレット・モバイルのランダム操作テスト
 * 2. 不具合原因の分類と修復案生成 (Root Cause Classification & REPAIR_PATCH_v1)
 * 3. エージェント間メッセージのスキーマ検証 (validateAgentSchema)
 * 4. 診断テストの実行管理 (AgentQADiagnosticsEngine)
 */

import { SCHEMAS, validateSchema } from './AgentIntegration.js';

export const PLAYWRIGHT_MONKEY_TEST_SCRIPT = `
import { test, expect, devices } from '@playwright/test';

// 表示幅テスト行列（Desktop 1080p、iPad Pro、iPhone 14）
const VIEWPORT_MATRIX = [
  { name: 'Desktop_1080p', viewport: { width: 1920, height: 1080 } },
  { name: 'iPad_Pro_Tablet', ...devices['iPad Pro 11'] },
  { name: 'iPhone_14_Mobile', ...devices['iPhone 14'] }
];

VIEWPORT_MATRIX.forEach(({ name, viewport }) => {
  test.describe(\`AI Monkey Testing - \${name}\`, () => {
    test.use({ viewport });

    test('3D星図ノードのランダム操作、Web Audio、ステージ復旧を検証する', async ({ page }) => {
      const capturedErrors = [];

      // 1. エージェントの例外監視を登録
      await page.exposeFunction('onBugCapturedByAgent', (bugLog) => {
        capturedErrors.push(bugLog);
      });

      await page.addInitScript(() => {
        window.addEventListener('AGENT_BUG_CAPTURED', (e) => {
          window.onBugCapturedByAgent(e.detail);
        });
      });

      // 2. ゲームのホーム画面を読み込む
      await page.goto('http://localhost:8080');
      await page.waitForSelector('#canvas-container canvas', { timeout: 8000 });

      // 3. モバイルで小学生向け操作領域を検証
      if (viewport.width <= 768) {
        const buttons = await page.$$('button, .subj-btn, .grade-tab-btn');
        for (const btn of buttons) {
          const box = await btn.boundingBox();
          if (box) {
            expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(40);
          }
        }
      }

      // 4. 50回のランダム操作を実行
      for (let i = 0; i < 50; i++) {
        const actionType = Math.floor(Math.random() * 4);

        if (actionType === 0) {
          // 操作A：星図をランダムにドラッグして回転
          const startX = 100 + Math.random() * (viewport.width - 200);
          const startY = 100 + Math.random() * (viewport.height - 200);
          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.mouse.move(startX + (Math.random() - 0.5) * 300, startY + (Math.random() - 0.5) * 300, { steps: 5 });
          await page.mouse.up();
        } else if (actionType === 1) {
          // 操作B：マウスホイールで素早く拡大・縮小
          await page.mouse.wheel(0, (Math.random() - 0.5) * 400);
        } else if (actionType === 2) {
          // 操作C：3D描画領域をランダムに選択
          const clickX = Math.random() * viewport.width;
          const clickY = Math.random() * viewport.height;
          await page.mouse.click(clickX, clickY);
        } else if (actionType === 3) {
          // 操作D：学年と教科の切り替え操作
          const tabs = await page.$$('.grade-tab-btn, .subj-btn');
          if (tabs.length > 0) {
            const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
            await randomTab.click().catch(() => {});
          }
        }

        await page.waitForTimeout(100);
      }

      // 5. ゲームへ入り、終了後の状態整合性を確認
      const startBtn = await page.$('#start-game-pc-btn:visible, #start-game-mobile-btn:visible');
      if (startBtn) {
        await startBtn.click();
        await page.waitForSelector('#game-modal:not(.hidden)', { timeout: 3000 });
        await page.mouse.click(viewport.width / 2, viewport.height / 2);
        await page.click('#game-close-btn');
        await page.waitForSelector('#game-modal.hidden', { timeout: 2000 });
      }

      // 6. 操作を妨げる重大エラーがないことを確認
      const fatalErrors = capturedErrors.filter(err => 
        err.category === 'WEBGL_CONTEXT_LOST' || 
        err.category === 'UI_DEADLOCK_HANG' ||
        err.category === 'RUNTIME_JS_ERROR'
      );
      expect(fatalErrors).toHaveLength(0);
    });
  });
});
`;

/**
 * エージェント間スキーマの検証入口
 */
export function validateAgentSchema(schemaType, payload) {
  return validateSchema(schemaType, payload);
}

/**
 * クライアントの例外記録を分類し、REPAIR_PATCH_v1 形式の修復案を生成する。
 * @param {Object} errorPayload 例外記録の JSON
 * @returns {Object} REPAIR_PATCH_v1 を含む診断結果
 */
export function diagnoseAndRecommendFix(errorPayload = {}) {
  const {
    category = 'UNKNOWN',
    error_message = '',
    stack_trace = '',
    fps = 60,
    viewport_size = { width: 1920, height: 1080 },
    recent_user_actions = []
  } = errorPayload;

  let classification = '[不明な例外]';
  let rootCause = '未捕捉の一般的なエラー';
  let severity = 'MEDIUM';
  let actionType = 'LOG_ONLY';
  let codePatchSuggestion = '';
  let runtimeIntervention = null;
  let affectedFiles = ['index.html'];

  // 1. UIの重なり・レスポンシブ表示の問題
  if (
    category === 'UI_OVERFLOW' ||
    (recent_user_actions?.some(a => a.targetClass?.includes('glass-panel')) && error_message?.includes('click')) ||
    (viewport_size?.width <= 768 && error_message?.includes('touch')) ||
    error_message?.includes('z-index')
  ) {
    classification = '[UI重なり／レスポンシブ表示エラー]';
    severity = 'HIGH';
    actionType = 'CSS_ZINDEX_PATCH';
    rootCause = `モバイル表示 (${viewport_size?.width}x${viewport_size?.height}) でUI要素が重なるか z-index の順序が崩れ、透明な上位要素が3D描画領域の操作を遮っています。`;
    codePatchSuggestion = `UIコンテナーを 'pointer-events-none' とし、実際に操作するボタンだけを 'pointer-events-auto' にします。モバイルの下部シートには touch-action: pan-y を設定します。`;
    runtimeIntervention = {
      cssSelector: '#canvas-container',
      styleOverride: { pointerEvents: 'auto', touchAction: 'none' }
    };
    affectedFiles = ['index.html', 'css/style.css'];
  }

  // 2. UI応答停止の判定
  else if (category === 'UI_DEADLOCK_HANG' || error_message?.includes('死锁') || error_message?.includes('Timeout') || error_message?.includes('2000ms')) {
    classification = '[UI応答停止]';
    severity = 'CRITICAL';
    actionType = 'STATE_MACHINE_RESET';
    rootCause = `星図ノードの選択後に GALAXY_NODE_SELECTED が送信されないか、ダイアログの状態が固定され、2000ms以内に反応がありません。`;
    codePatchSuggestion = `Raycaster の選択成功処理にタイマーを追加し、500ms以内にUIが反応しない場合は updateNodeCard() を再実行します。`;
    runtimeIntervention = {
      command: 'FORCE_RESET_MODAL_STATE'
    };
    affectedFiles = ['GalaxyEngine.js', 'MiniGameSystem.js'];
  }

  // 3. WebGL描画エラーの判定
  else if (
    category === 'WEBGL_CONTEXT_LOST' ||
    category === 'PERFORMANCE_FPS_DROP' ||
    stack_trace?.includes('three') ||
    stack_trace?.includes('WebGL') ||
    fps < 15
  ) {
    classification = '[WebGL描画エラー]';
    severity = fps < 15 ? 'HIGH' : 'CRITICAL';
    actionType = 'GPU_FALLBACK_RECOVERY';
    rootCause = `GPUメモリー負荷またはシェーダー負荷が高く、WebGLコンテキスト喪失または継続的なフレーム低下が発生しました (FPS: ${fps})。`;
    codePatchSuggestion = `WebGLContextLost を検出したら軽量描画で再初期化し、低性能端末では粒子数を900から300へ減らしてDPRを1.0に制限します。`;
    runtimeIntervention = {
      command: 'DOWNGRADE_RENDER_FIDELITY',
      targetDPR: 1.0,
      reduceParticleCount: 0.5
    };
    affectedFiles = ['GalaxyEngine.js', 'FXSystem.js'];
  }

  // 4. データ・ロジックエラーの判定
  else if (
    category === 'RUNTIME_JS_ERROR' ||
    category === 'UNHANDLED_PROMISE_REJECTION' ||
    category === 'DATA_SCHEMA_FALLBACK' ||
    error_message?.includes('undefined') ||
    error_message?.includes('null')
  ) {
    classification = '[データ・ロジックエラー]';
    severity = 'MEDIUM';
    actionType = 'DATA_SCHEMA_FALLBACK';
    rootCause = `知識グラフのノードまたは問題データに欠損・不正参照があります：${error_message}`;
    codePatchSuggestion = `問題データの発生源とスキーマを修正し、ゲーム開始前に必須項目を検証します。教育的に正しい代替データがある場合だけ安全な代替を使用します。`;
    runtimeIntervention = {
      command: 'APPLY_DEFAULT_FALLBACK_QUESTION'
    };
    affectedFiles = ['MiniGameSystem.js', 'CurriculumData.js'];
  }

  const repairPatch = {
    schema: 'REPAIR_PATCH_v1',
    bug_id: errorPayload.bug_id || `BUG-${Date.now()}`,
    root_cause: rootCause,
    action_type: actionType,
    affected_files: affectedFiles,
    verification_command: 'node tests/test_agents.js',
    status: 'RESOLVED'
  };

  return {
    diagnosisId: `DIAG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    classification,
    severity,
    rootCause,
    originalError: errorPayload,
    recommendedFix: {
      actionType,
      codePatchSuggestion,
      runtimeIntervention
    },
    repairPatch
  };
}

/**
 * QA Diagnostics & Test Simulation Engine
 */
export class AgentQADiagnosticsEngine {
  constructor() {
    this.capturedLogs = [];
    this.patchHistory = [];
  }

  recordBug(bugLog) {
    this.capturedLogs.push(bugLog);
    const diagnosis = diagnoseAndRecommendFix(bugLog);
    this.patchHistory.push(diagnosis.repairPatch);
    return diagnosis;
  }

  runDiagnosticSweep(errorLogs = []) {
    return errorLogs.map(log => this.recordBug(log));
  }

  getSummary() {
    return {
      totalBugsCaptured: this.capturedLogs.length,
      totalPatchesGenerated: this.patchHistory.length,
      logs: this.capturedLogs,
      patches: this.patchHistory
    };
  }
}
