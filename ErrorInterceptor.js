/**
 * ErrorInterceptor.js - 客户端全方位异常拦截器与遥测系统
 * 
 * 1. 运行时 JS 错误 (window.onerror, unhandledrejection)
 * 2. WebGL 渲染崩溃与上下文丢失 (webglcontextlost)
 * 3. 页面卡顿与掉帧监控 (FPS < 15 持续 > 3s)
 * 4. UI 响应死锁 Watchdog (点击星图节点后 2s 内无响应)
 * 5. 用户最近行为回放队列 (最近 5 次交互坐标与元素)
 */

export class ErrorInterceptor {
  constructor(options = {}) {
    this.userId = options.userId || 'USR-ANON-DEBUG';
    this.currentNodeId = options.initialNodeId || 'KOKUGO_G1_KANA_KANJI';
    this.recentActions = [];
    this.maxActions = 5;

    // 性能监控状态
    this.fpsHistory = [];
    this.currentFps = 60;
    this.lowFpsDurationMs = 0;
    this.lastFrameTime = performance.now();

    // UI 死锁 Watchdog
    this.pendingNodeClick = null;
    this.clickWatchdogTimer = null;

    this.initActionTracker();
    this.initGlobalErrorHandlers();
    this.initFpsMonitor();
    this.initDeadlockWatchdog();
  }

  // 1. 用户操作行为轨迹录制 (最近 5 次)
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

  // 2. 全局 JS 异常与 Promise Rejection 捕获
  initGlobalErrorHandlers() {
    // 监听运行时脚本错误
    window.onerror = (message, source, lineno, colno, error) => {
      const errorLog = this.buildErrorPayload({
        category: 'RUNTIME_JS_ERROR',
        message: String(message),
        stackTrace: error?.stack || `${source}:${lineno}:${colno}`
      });
      this.dispatchBugReport(errorLog);
      return false;
    };

    // 监听未捕获的 Promise Rejection
    window.addEventListener('unhandledrejection', (event) => {
      const errorLog = this.buildErrorPayload({
        category: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason?.message || String(event.reason),
        stackTrace: event.reason?.stack || 'N/A'
      });
      this.dispatchBugReport(errorLog);
    });
  }

  // 3. WebGL 上下文丢失监听
  bindWebGLCanvas(canvasElement) {
    if (!canvasElement) return;
    canvasElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); // 阻止默认退出
      const errorLog = this.buildErrorPayload({
        category: 'WEBGL_CONTEXT_LOST',
        message: 'WebGL 渲染上下文发生丢失崩溃 (Context Lost)',
        stackTrace: 'Canvas WebGLContextLost Event Triggered'
      });
      this.dispatchBugReport(errorLog);
    });

    canvasElement.addEventListener('webglcontextrestored', () => {
      console.warn('[ErrorInterceptor] WebGL 上下文已自动恢复。');
    });
  }

  // 4. FPS 性能卡顿监控 (主循环 FPS < 15 超过 3 秒)
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
              message: `页面发生严重卡顿：FPS 低于 15 已持续 ${(this.lowFpsDurationMs / 1000).toFixed(1)} 秒`,
              stackTrace: `Current FPS: ${this.currentFps}, Threshold: 15 FPS, Duration: ${this.lowFpsDurationMs}ms`
            });
            this.dispatchBugReport(errorLog);
            this.lowFpsDurationMs = 0; // 避免重复高频触发
          }
        } else {
          this.lowFpsDurationMs = 0;
        }
      }

      requestAnimationFrame(checkFpsLoop);
    };

    requestAnimationFrame(checkFpsLoop);
  }

  // 5. UI 响应死锁 Watchdog (点击星图节点超过 2 秒无 DOM/弹窗响应)
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
              message: `UI 状态死锁：点击节点 [${nodeId}] 超过 2000ms 界面无任何 DOM 变化或弹窗响应`,
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

  // 封装统一的异常日志 JSON 格式
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

  // 派发 Bug 日志到全局 Agent 管道与控制台
  dispatchBugReport(errorPayload) {
    console.error('[ErrorInterceptor Captured Bug]', errorPayload);
    window.dispatchEvent(new CustomEvent('AGENT_BUG_CAPTURED', { detail: errorPayload }));
  }
}
