/**
 * ErrorInterceptor.js - クライアント例外監視・動作記録システム
 * 
 * 1. 実行時 JavaScript エラー (window.onerror, unhandledrejection)
 * 2. WebGL の描画停止とコンテキスト喪失 (webglcontextlost)
 * 3. 画面停止とフレーム低下の監視 (FPS < 15 が3秒超)
 * 4. UI 応答停止の監視 (星図ノード選択後2秒以内に反応がない場合)
 * 5. 直近5件の利用者操作を記録
 */

export class ErrorInterceptor {
  constructor(options = {}) {
    this.userId = options.userId || 'USR-ANON-DEBUG';
    this.currentNodeId = options.initialNodeId || 'KOKUGO_G1_KANA_KANJI';
    this.recentActions = [];
    this.maxActions = 5;

    // 性能監視の状態
    this.fpsHistory = [];
    this.currentFps = 60;
    this.lowFpsDurationMs = 0;
    this.lastFrameTime = performance.now();

    // UI 応答停止の監視
    this.pendingNodeClick = null;
    this.clickWatchdogTimer = null;

    this.initActionTracker();
    this.initGlobalErrorHandlers();
    this.initFpsMonitor();
    this.initDeadlockWatchdog();
  }

  // 1. 直近5件の利用者操作を記録
  initActionTracker() {
    window.addEventListener(
      'pointerdown',
      (e) => {
        const action = {
          timestamp: new Date().toISOString(),
          type: e.pointerType || 'mouse',
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
          targetTag: e.target?.tagName || 'UNKNOWN',
          targetId: e.target?.id || '',
          targetClass: (e.target?.className || '').toString().slice(0, 50)
        };
        this.recentActions.push(action);
        if (this.recentActions.length > this.maxActions) {
          this.recentActions.shift();
        }
      },
      true
    );
  }

  // 2. 全体の JavaScript 例外と Promise 拒否を捕捉
  initGlobalErrorHandlers() {
    // 実行時スクリプトエラーを監視
    window.onerror = (message, source, lineno, colno, error) => {
      const errorLog = this.buildErrorPayload({
        category: 'RUNTIME_JS_ERROR',
        message: String(message),
        stackTrace: error?.stack || `${source}:${lineno}:${colno}`
      });
      this.dispatchBugReport(errorLog);
      return false;
    };

    // 未処理の Promise 拒否を監視
    window.addEventListener('unhandledrejection', (event) => {
      const errorLog = this.buildErrorPayload({
        category: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason?.message || String(event.reason),
        stackTrace: event.reason?.stack || 'N/A'
      });
      this.dispatchBugReport(errorLog);
    });
  }

  // 3. WebGL コンテキスト喪失を監視
  bindWebGLCanvas(canvasElement) {
    if (!canvasElement) return;
    canvasElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); // ブラウザーの既定終了処理を抑止
      const errorLog = this.buildErrorPayload({
        category: 'WEBGL_CONTEXT_LOST',
        message: 'WebGL 描画コンテキストが失われました。',
        stackTrace: 'Canvas WebGLContextLost Event Triggered'
      });
      this.dispatchBugReport(errorLog);
    });

    canvasElement.addEventListener('webglcontextrestored', () => {
      console.warn('[ErrorInterceptor] WebGL コンテキストが復旧しました。');
    });
  }

  // 4. FPS 低下を監視（主ループが15 FPS未満で3秒超）
  initFpsMonitor() {
    let frameCount = 0;
    let lastTime = performance.now();

    const checkFpsLoop = (now) => {
      frameCount++;
      const delta = now - lastTime;

      if (delta >= 1000) {
        this.currentFps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastTime = now;

        if (this.currentFps < 15) {
          this.lowFpsDurationMs += delta;
          if (this.lowFpsDurationMs >= 3000) {
            const errorLog = this.buildErrorPayload({
              category: 'PERFORMANCE_FPS_DROP',
              message: `画面の応答が大きく低下しています。15 FPS未満の状態が ${(this.lowFpsDurationMs / 1000).toFixed(1)} 秒続きました。`,
              stackTrace: `Current FPS: ${this.currentFps}, Threshold: 15 FPS, Duration: ${this.lowFpsDurationMs}ms`
            });
            this.dispatchBugReport(errorLog);
            this.lowFpsDurationMs = 0; // 短時間の重複通知を防ぐ
          }
        } else {
          this.lowFpsDurationMs = 0;
        }
      }

      requestAnimationFrame(checkFpsLoop);
    };

    requestAnimationFrame(checkFpsLoop);
  }

  // 5. UI 応答停止を監視（星図ノード選択後2秒以内に画面変化がない場合）
  initDeadlockWatchdog() {
    window.addEventListener('GALAXY_NODE_CLICK_START', (e) => {
      const nodeId = e.detail?.nodeId || 'UNKNOWN';
      this.currentNodeId = nodeId;
      this.pendingNodeClick = {
        nodeId,
        startTime: performance.now(),
        initialDomSignature: this.getDomSignature()
      };

      if (this.clickWatchdogTimer) clearTimeout(this.clickWatchdogTimer);

      this.clickWatchdogTimer = setTimeout(() => {
        if (this.pendingNodeClick) {
          const currentSignature = this.getDomSignature();
          const modalVisible = !document.getElementById('mobile-sheet')?.classList.contains('translate-y-full') ||
                               !document.getElementById('game-modal')?.classList.contains('hidden');

          if (currentSignature === this.pendingNodeClick.initialDomSignature && !modalVisible) {
            const errorLog = this.buildErrorPayload({
              category: 'UI_DEADLOCK_HANG',
              message: `UI が応答していません。ノード [${nodeId}] の選択から2000ms経過しても画面またはダイアログに変化がありません。`,
              stackTrace: `NodeClick at: ${this.pendingNodeClick.startTime}, Timeout: 2000ms, ModalVisible: false`
            });
            this.dispatchBugReport(errorLog);
          }
          this.pendingNodeClick = null;
        }
      }, 2000);
    });

    window.addEventListener('GALAXY_NODE_SELECTED', () => {
      this.pendingNodeClick = null;
      if (this.clickWatchdogTimer) clearTimeout(this.clickWatchdogTimer);
    });
  }

  getDomSignature() {
    const pcTitle = document.getElementById('node-title')?.innerText || '';
    const mTitle = document.getElementById('m-node-title')?.innerText || '';
    return `${pcTitle}__${mTitle}`;
  }

  setCurrentNode(nodeId) {
    this.currentNodeId = nodeId;
  }

  // 例外記録を共通 JSON 形式にまとめる
  buildErrorPayload({ category, message, stackTrace }) {
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth <= 768;

    return {
      schema: 'AGENT_BUG_OBSERVATION_v1',
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      device_type: isMobile ? 'Mobile' : 'Desktop',
      viewport_size: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1
      },
      route: window.location.pathname || '/',
      node_id: this.currentNodeId,
      category: category,
      error_message: message,
      stack_trace: stackTrace,
      fps: this.currentFps,
      recent_user_actions: [...this.recentActions]
    };
  }

  // 不具合記録を全体イベントとコンソールへ送る
  dispatchBugReport(errorPayload) {
    console.error(`[ErrorInterceptor 不具合検出] ${JSON.stringify(errorPayload)}`);
    window.dispatchEvent(new CustomEvent('AGENT_BUG_CAPTURED', { detail: errorPayload }));
  }
}
