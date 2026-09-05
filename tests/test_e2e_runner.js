/**
 * tests/test_e2e_runner.js - Japanese PSES Galaxy Engine Master Test Runner
 * 
 * 4-Tier Systematic Testing Harness (Feature Coverage, Boundaries, Pairwise Combinations, Real-World Playthroughs)
 * Outputs: TAP 13 (Test Anything Protocol) & Structured JSON Summary
 */

const fs = require('fs');
const path = require('path');

// =========================================================================
// 1. Browser & Web API Mock Environment for Headless Node.js Execution
// =========================================================================
class MockAudioNode {
  constructor(context) {
    this.context = context;
    this.connectedTo = null;
  }
  connect(target) {
    this.connectedTo = target;
    return target;
  }
  disconnect() {
    this.connectedTo = null;
  }
}

class MockAudioParam {
  constructor(defaultValue = 1.0) {
    this.value = defaultValue;
    this.timeline = [];
  }
  setValueAtTime(val, time) {
    this.value = val;
    this.timeline.push({ type: 'set', val, time });
  }
  linearRampToValueAtTime(val, time) {
    this.value = val;
    this.timeline.push({ type: 'linear', val, time });
  }
  exponentialRampToValueAtTime(val, time) {
    this.value = Math.max(0.0001, val);
    this.timeline.push({ type: 'exponential', val: this.value, time });
  }
  cancelScheduledValues(time) {
    this.timeline = this.timeline.filter(e => e.time < time);
  }
}

class MockGainNode extends MockAudioNode {
  constructor(context) {
    super(context);
    this.gain = new MockAudioParam(1.0);
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor(context) {
    super(context);
    this.type = 'sine';
    this.frequency = new MockAudioParam(440);
    this.started = false;
    this.stopped = false;
  }
  start(time = 0) {
    this.started = true;
    this.startTime = time;
  }
  stop(time = 0) {
    this.stopped = true;
    this.stopTime = time;
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor(context) {
    super(context);
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(350);
    this.Q = new MockAudioParam(1.0);
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = new MockAudioNode(this);
    this.createdNodes = [];
  }
  createGain() {
    const node = new MockGainNode(this);
    this.createdNodes.push(node);
    return node;
  }
  createOscillator() {
    const node = new MockOscillatorNode(this);
    this.createdNodes.push(node);
    return node;
  }
  createBiquadFilter() {
    const node = new MockBiquadFilterNode(this);
    this.createdNodes.push(node);
    return node;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class MockCanvasRenderingContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.calls = [];
    this.globalAlpha = 1.0;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.font = '12px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
  }
  save() { this.calls.push({ method: 'save' }); }
  restore() { this.calls.push({ method: 'restore' }); }
  translate(x, y) { this.calls.push({ method: 'translate', args: [x, y] }); }
  rotate(angle) { this.calls.push({ method: 'rotate', args: [angle] }); }
  scale(sx, sy) { this.calls.push({ method: 'scale', args: [sx, sy] }); }
  beginPath() { this.calls.push({ method: 'beginPath' }); }
  closePath() { this.calls.push({ method: 'closePath' }); }
  moveTo(x, y) { this.calls.push({ method: 'moveTo', args: [x, y] }); }
  lineTo(x, y) { this.calls.push({ method: 'lineTo', args: [x, y] }); }
  arc(x, y, r, sa, ea) { this.calls.push({ method: 'arc', args: [x, y, r, sa, ea] }); }
  rect(x, y, w, h) { this.calls.push({ method: 'rect', args: [x, y, w, h] }); }
  roundRect(x, y, w, h, r) { this.calls.push({ method: 'roundRect', args: [x, y, w, h, r] }); }
  setLineDash(segments) { this.calls.push({ method: 'setLineDash', args: [segments] }); }
  getLineDash() { return []; }
  createLinearGradient() { return { addColorStop: () => {} }; }
  createRadialGradient() { return { addColorStop: () => {} }; }
  fill() { this.calls.push({ method: 'fill' }); }
  stroke() { this.calls.push({ method: 'stroke' }); }
  clearRect(x, y, w, h) { this.calls.push({ method: 'clearRect', args: [x, y, w, h] }); }
  fillRect(x, y, w, h) { this.calls.push({ method: 'fillRect', args: [x, y, w, h] }); }
  strokeRect(x, y, w, h) { this.calls.push({ method: 'strokeRect', args: [x, y, w, h] }); }
  fillText(text, x, y) { this.calls.push({ method: 'fillText', args: [text, x, y] }); }
  strokeText(text, x, y) { this.calls.push({ method: 'strokeText', args: [text, x, y] }); }
  measureText(text) { return { width: (text ? String(text).length : 1) * 8 }; }
}

class MockHTMLCanvasElement {
  constructor(width = 640, height = 480) {
    this.width = width;
    this.height = height;
    this.style = {};
    this.eventListeners = {};
    this.ctx = new MockCanvasRenderingContext2D(this);
  }
  getContext(type) {
    if (type === '2d') return this.ctx;
    return null;
  }
  addEventListener(event, handler) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }
  removeEventListener(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  }
  dispatchEvent(event) {
    const handlers = this.eventListeners[event.type] || [];
    handlers.forEach(h => h(event));
    return true;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width, height: this.height, right: this.width, bottom: this.height };
  }
}

class MockCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail || null;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
  }
}

function setupGlobalBrowserMock() {
  global.AudioContext = MockAudioContext;
  global.webkitAudioContext = MockAudioContext;
  global.localStorage = new MockLocalStorage();
  global.sessionStorage = new MockLocalStorage();
  global.CustomEvent = MockCustomEvent;
  
  const eventListeners = {};
  global.window = {
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    localStorage: global.localStorage,
    sessionStorage: global.sessionStorage,
    CustomEvent: MockCustomEvent,
    addEventListener: (type, handler) => {
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(handler);
    },
    removeEventListener: (type, handler) => {
      if (eventListeners[type]) {
        eventListeners[type] = eventListeners[type].filter(h => h !== handler);
      }
    },
    dispatchEvent: (event) => {
      const handlers = eventListeners[event.type] || [];
      handlers.forEach(h => h(event));
      return true;
    },
    _getEventListeners: () => eventListeners
  };

  global.document = {
    createElement: (tag) => {
      if (tag.toLowerCase() === 'canvas') return new MockHTMLCanvasElement();
      return {
        id: '',
        className: '',
        style: {},
        innerHTML: '',
        innerText: '',
        children: [],
        appendChild: function(c) { this.children.push(c); return c; },
        classList: {
          contains: () => false,
          add: () => {},
          remove: () => {},
          toggle: () => {}
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null
      };
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    body: {
      appendChild: () => {},
      removeChild: () => {},
      classList: { add: () => {}, remove: () => {} }
    }
  };

  global.navigator = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestRunner/1.0',
    vibrate: () => true
  };

  global.requestAnimationFrame = (callback) => {
    const id = setTimeout(() => callback(Date.now()), 16);
    if (id && typeof id.unref === 'function') id.unref();
    return id;
  };
  global.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Setup environment immediately
setupGlobalBrowserMock();

// =========================================================================
// 2. Comprehensive Assertion Library
// =========================================================================
class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

const assert = {
  strictEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new AssertionError(
        message || `Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`,
        actual,
        expected
      );
    }
  },

  notStrictEqual(actual, expected, message) {
    if (actual === expected) {
      throw new AssertionError(
        message || `Expected ${JSON.stringify(actual)} to NOT equal ${JSON.stringify(expected)}`,
        actual,
        expected
      );
    }
  },

  deepStrictEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new AssertionError(
        message || `Expected deep equality:\nActual:   ${actualStr}\nExpected: ${expectedStr}`,
        actual,
        expected
      );
    }
  },

  ok(value, message) {
    if (!value) {
      throw new AssertionError(message || `Expected truthy value, got ${JSON.stringify(value)}`, value, true);
    }
  },

  throws(fn, expectedErr, message) {
    let threw = false;
    let caughtErr = null;
    try {
      fn();
    } catch (e) {
      threw = true;
      caughtErr = e;
    }
    if (!threw) {
      throw new AssertionError(message || 'Expected function to throw an error, but it did not', null, 'Error');
    }
    if (expectedErr && typeof expectedErr === 'function' && !(caughtErr instanceof expectedErr)) {
      throw new AssertionError(message || `Expected error instance of ${expectedErr.name}, got ${caughtErr}`, caughtErr, expectedErr);
    }
  },

  closeTo(actual, expected, delta = 0.001, message) {
    if (Math.abs(actual - expected) > delta) {
      throw new AssertionError(
        message || `Expected ${actual} to be within ${delta} of ${expected} (diff: ${Math.abs(actual - expected)})`,
        actual,
        expected
      );
    }
  },

  isAbove(actual, target, message) {
    if (actual <= target) {
      throw new AssertionError(message || `Expected ${actual} to be strictly greater than ${target}`, actual, target);
    }
  },

  isAtLeast(actual, target, message) {
    if (actual < target) {
      throw new AssertionError(message || `Expected ${actual} to be at least ${target}`, actual, target);
    }
  },

  isBelow(actual, target, message) {
    if (actual >= target) {
      throw new AssertionError(message || `Expected ${actual} to be strictly less than ${target}`, actual, target);
    }
  },

  isAtMost(actual, target, message) {
    if (actual > target) {
      throw new AssertionError(message || `Expected ${actual} to be at most ${target}`, actual, target);
    }
  },

  includes(collection, item, message) {
    const contains = Array.isArray(collection) || typeof collection === 'string'
      ? collection.includes(item)
      : (collection && typeof collection === 'object' && Object.prototype.hasOwnProperty.call(collection, item));
    if (!contains) {
      throw new AssertionError(
        message || `Expected collection to include ${JSON.stringify(item)}`,
        collection,
        item
      );
    }
  },

  match(string, regex, message) {
    if (!regex.test(string)) {
      throw new AssertionError(
        message || `Expected "${string}" to match regex ${regex}`,
        string,
        regex.toString()
      );
    }
  },

  equal(actual, expected, message) {
    this.strictEqual(actual, expected, message);
  },

  deepEqual(actual, expected, message) {
    this.deepStrictEqual(actual, expected, message);
  },

  notEqual(actual, expected, message) {
    this.notStrictEqual(actual, expected, message);
  }
};

// =========================================================================
// 3. Test Suite & Test Runner Engine
// =========================================================================
class TestHarness {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.results = [];
    this.startTime = 0;
    this.endTime = 0;
  }

  describe(suiteName, suiteFn) {
    const suite = {
      name: suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      durationMs: 0
    };
    this.suites.push(suite);
    this.currentSuite = suite;
    try {
      suiteFn();
    } catch (e) {
      console.error(`Error configuring suite "${suiteName}":`, e);
      this.test(`suite "${suiteName}" must initialize without throwing`, () => {
        throw e;
      });
    }
    this.currentSuite = null;
  }

  test(testName, testFn) {
    if (!this.currentSuite) {
      throw new Error(`Test "${testName}" must be defined inside a describe() block`);
    }
    this.currentSuite.tests.push({
      name: testName,
      fn: testFn,
      passed: false,
      error: null,
      durationMs: 0
    });
  }

  async runAll() {
    this.startTime = Date.now();
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.results = [];

    console.log(`\n===============================================================`);
    console.log(`🚀 Japanese PSES Galaxy Engine — Master E2E Test Suite Runner`);
    console.log(`===============================================================\n`);

    let globalTestIndex = 1;
    const tapLines = ['TAP version 13'];

    for (const suite of this.suites) {
      console.log(`\n📦 Suite: ${suite.name}`);
      const suiteStart = Date.now();

      for (const t of suite.tests) {
        this.totalTests++;
        const testStart = Date.now();
        let pass = false;
        let err = null;

        try {
          // Reset mock storage between tests for isolation
          global.localStorage.clear();
          global.sessionStorage.clear();

          const res = t.fn(assert);
          if (res && typeof res.then === 'function') {
            await res;
          }
          pass = true;
          this.passedTests++;
          suite.passed++;
          console.log(`  ✅ [PASS] ${t.name}`);
          tapLines.push(`ok ${globalTestIndex} - ${suite.name} > ${t.name}`);
        } catch (e) {
          pass = false;
          err = e;
          this.failedTests++;
          suite.failed++;
          console.log(`  ❌ [FAIL] ${t.name}`);
          console.log(`     Error: ${e.message}`);
          if (e.actual !== undefined && e.expected !== undefined) {
            console.log(`     Actual:   ${JSON.stringify(e.actual)}`);
            console.log(`     Expected: ${JSON.stringify(e.expected)}`);
          }
          tapLines.push(`not ok ${globalTestIndex} - ${suite.name} > ${t.name}`);
          tapLines.push(`  ---`);
          tapLines.push(`  message: ${JSON.stringify(e.message)}`);
          tapLines.push(`  severity: fail`);
          tapLines.push(`  ...`);
        }

        t.passed = pass;
        t.error = err ? { message: err.message, stack: err.stack } : null;
        t.durationMs = Date.now() - testStart;
        globalTestIndex++;
      }

      suite.durationMs = Date.now() - suiteStart;
    }

    this.endTime = Date.now();
    const totalDurationMs = this.endTime - this.startTime;

    // Final TAP plan line
    tapLines.splice(1, 0, `1..${this.totalTests}`);

    console.log(`\n===============================================================`);
    console.log(`📊 TEST EXECUTION SUMMARY`);
    console.log(`===============================================================`);
    console.log(`Total Test Suites: ${this.suites.length}`);
    console.log(`Total Test Cases:  ${this.totalTests}`);
    console.log(`Passed:            ${this.passedTests} ✅`);
    console.log(`Failed:            ${this.failedTests} ${this.failedTests > 0 ? '❌' : ''}`);
    console.log(`Success Rate:      ${((this.passedTests / Math.max(1, this.totalTests)) * 100).toFixed(1)}%`);
    console.log(`Total Duration:    ${totalDurationMs} ms`);
    console.log(`===============================================================\n`);

    const summaryReport = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites: this.suites.length,
        totalTests: this.totalTests,
        passed: this.passedTests,
        failed: this.failedTests,
        successRate: Number((this.passedTests / Math.max(1, this.totalTests)).toFixed(4)),
        totalDurationMs
      },
      suites: this.suites.map(s => ({
        name: s.name,
        total: s.tests.length,
        passed: s.passed,
        failed: s.failed,
        durationMs: s.durationMs,
        tests: s.tests.map(t => ({
          name: t.name,
          passed: t.passed,
          durationMs: t.durationMs,
          error: t.error
        }))
      })),
      tapOutput: tapLines.join('\n')
    };

    return summaryReport;
  }
}

// Global harness singleton
const harness = new TestHarness();

function describe(name, fn) {
  harness.describe(name, fn);
}

function test(name, fn) {
  harness.test(name, fn);
}

const it = test;

// =========================================================================
// 3b. ESM-to-CJS loader (keeps function/class names in lexical scope)
// =========================================================================
const esmLoaderCache = new Map();

function transformEsmToCjs(source) {
  const exported = [];
  let code = source;

  const remember = (name) => {
    if (name && !exported.includes(name)) exported.push(name);
  };
  const rememberAlias = (exportName, localName) => {
    exported.push({ exportName, localName });
  };

  // export * from './relative'
  code = code.replace(/^[ \t]*export\s+\*\s+from\s+['"](\.[^'"]+)['"];?[ \t]*$/gm, (_, spec) => {
    return `Object.assign(module.exports, require(${JSON.stringify(spec)}));`;
  });

  // export { A, B as C } from './relative'
  code = code.replace(/^[ \t]*export\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"];?[ \t]*$/gm, (_, names, spec) => {
    const mappings = [];
    names.split(',').map((s) => s.trim()).filter(Boolean).forEach((p) => {
      const m = p.match(/^(\w+)\s+as\s+(\w+)$/);
      if (m) {
        remember(m[2]);
        mappings.push(`${m[1]}: ${m[2]}`);
      } else {
        remember(p);
        mappings.push(p);
      }
    });
    return `const { ${mappings.join(', ')} } = require(${JSON.stringify(spec)});`;
  });

  // import ... from './relative'  (relative only so template-string playwright imports stay intact)
  code = code.replace(/^[ \t]*import\s+([\s\S]*?)\s+from\s+['"](\.[^'"]+)['"];?[ \t]*$/gm, (_, clause, spec) => {
    const c = clause.trim();
    const specLit = JSON.stringify(spec);
    if (c.startsWith('{')) {
      const inner = c.slice(c.indexOf('{') + 1, c.lastIndexOf('}'));
      const parts = inner.split(',').map((s) => s.trim()).filter(Boolean).map((p) => {
        const m = p.match(/^(\w+)\s+as\s+(\w+)$/);
        return m ? `${m[1]}: ${m[2]}` : p;
      });
      return `const { ${parts.join(', ')} } = require(${specLit});`;
    }
    const ns = c.match(/^\*\s+as\s+(\w+)$/);
    if (ns) return `const ${ns[1]} = require(${specLit});`;
    const def = c.match(/^(\w+)$/);
    if (def) {
      return `const ${def[1]} = (() => { const __m = require(${specLit}); return (__m && __m.default !== undefined) ? __m.default : __m; })();`;
    }
    const mixed = c.match(/^(\w+)\s*,\s*(\{[\s\S]*\})$/);
    if (mixed) {
      const inner = mixed[2].slice(mixed[2].indexOf('{') + 1, mixed[2].lastIndexOf('}'));
      const parts = inner.split(',').map((s) => s.trim()).filter(Boolean).map((p) => {
        const m = p.match(/^(\w+)\s+as\s+(\w+)$/);
        return m ? `${m[1]}: ${m[2]}` : p;
      });
      return [
        `const ${mixed[1]} = (() => { const __m = require(${specLit}); return (__m && __m.default !== undefined) ? __m.default : __m; })();`,
        `const { ${parts.join(', ')} } = require(${specLit});`
      ].join('\n');
    }
    return `require(${specLit});`;
  });

  // side-effect import './relative'
  code = code.replace(/^[ \t]*import\s+['"](\.[^'"]+)['"];?[ \t]*$/gm, (_, spec) => {
    return `require(${JSON.stringify(spec)});`;
  });

  code = code.replace(/export\s+async\s+function\s+(\w+)/g, (_, n) => {
    remember(n);
    return `async function ${n}`;
  });
  code = code.replace(/export\s+function\s+(\w+)/g, (_, n) => {
    remember(n);
    return `function ${n}`;
  });
  code = code.replace(/export\s+class\s+(\w+)/g, (_, n) => {
    remember(n);
    return `class ${n}`;
  });
  code = code.replace(/export\s+(const|let|var)\s+(\w+)\s*=/g, (_, kind, n) => {
    remember(n);
    return `${kind} ${n} =`;
  });

  code = code.replace(/export\s+default\s+async\s+function\s+(\w+)/g, (_, n) => {
    remember(n);
    rememberAlias('default', n);
    return `async function ${n}`;
  });
  code = code.replace(/export\s+default\s+function\s+(\w+)/g, (_, n) => {
    remember(n);
    rememberAlias('default', n);
    return `function ${n}`;
  });
  code = code.replace(/export\s+default\s+class\s+(\w+)/g, (_, n) => {
    remember(n);
    rememberAlias('default', n);
    return `class ${n}`;
  });
  code = code.replace(/export\s+default\s+/g, () => {
    rememberAlias('default', '__defaultExport');
    return `const __defaultExport = `;
  });

  // export { A, B as C }
  code = code.replace(/^[ \t]*export\s+\{([^}]+)\}\s*;?[ \t]*$/gm, (_, names) => {
    names.split(',').map((s) => s.trim()).filter(Boolean).forEach((p) => {
      const m = p.match(/^(\w+)\s+as\s+(\w+)$/);
      if (m) rememberAlias(m[2], m[1]);
      else remember(p);
    });
    return '/* named export list collected for module.exports */';
  });

  const assignLines = [];
  const seen = new Set();
  for (const item of exported) {
    if (item && typeof item === 'object') {
      if (seen.has(item.exportName)) continue;
      seen.add(item.exportName);
      assignLines.push(`module.exports.${item.exportName} = ${item.localName};`);
    } else {
      if (seen.has(item)) continue;
      seen.add(item);
      assignLines.push(`module.exports.${item} = ${item};`);
    }
  }
  if (assignLines.length) {
    code += '\n' + assignLines.join('\n') + '\n';
  }
  return code;
}

function resolveRelativeModule(fromFile, spec) {
  const fileSpec = String(spec).split(/[?#]/, 1)[0];
  const base = path.resolve(path.dirname(fromFile), fileSpec);
  const candidates = [base, base + '.js', path.join(base, 'index.js')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  throw new Error(`Cannot resolve '${spec}' from ${fromFile}`);
}

function loadESModule(filePath, cache = esmLoaderCache) {
  const resolved = path.resolve(filePath);
  if (cache.has(resolved)) return cache.get(resolved);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Module not found: ${resolved}`);
  }

  const mod = { exports: {} };
  cache.set(resolved, mod.exports);

  const source = fs.readFileSync(resolved, 'utf-8');
  const cjsCode = transformEsmToCjs(source);

  const localRequire = (spec) => {
    if (typeof spec === 'string' && (spec.startsWith('.') || spec.startsWith('/') || path.isAbsolute(spec))) {
      return loadESModule(resolveRelativeModule(resolved, spec), cache);
    }
    return require(spec);
  };

  const wrappedFn = new Function(
    'module',
    'exports',
    'require',
    'window',
    'document',
    'localStorage',
    'sessionStorage',
    'CustomEvent',
    'navigator',
    'console',
    'global',
    'globalThis',
    `${cjsCode}\n//# sourceURL=${resolved.replace(/\\/g, '/')}`
  );

  wrappedFn(
    mod,
    mod.exports,
    localRequire,
    global.window,
    global.document,
    global.localStorage,
    global.sessionStorage,
    global.CustomEvent,
    global.navigator,
    console,
    global,
    typeof globalThis !== 'undefined' ? globalThis : global
  );

  cache.set(resolved, mod.exports);
  return mod.exports;
}

// Helper to load test modules
function registerSuites() {
  const testFiles = [
    'test_agents.js',
    'test_audio_fx.js',
    'test_curriculum_dag.js',
    'test_games.js',
    'test_curriculum_traceability.js',
    'test_question_banks.js',
    'test_world_curriculum_enhancements.js',
    'test_content_safety.js',
    'test_adversarial_challenger.js',
    'test_platform_architecture.js',
    'test_learning_entry_and_progression.js'
  ];

  for (const file of testFiles) {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) {
      describe(`LOAD FAILURE: ${file}`, () => {
        test(`${file} must exist`, () => {
          throw new Error(`Missing test suite file: ${fullPath}`);
        });
      });
      continue;
    }
    try {
      const suiteModule = require(fullPath);
      if (typeof suiteModule === 'function') {
        suiteModule({ describe, test, it, assert, loadESModule });
      } else if (suiteModule && typeof suiteModule.register === 'function') {
        suiteModule.register({ describe, test, it, assert, loadESModule });
      } else {
        throw new Error(`${file} did not export a register function`);
      }
    } catch (e) {
      console.error(`Failed to load test suite ${file}:`, e);
      describe(`LOAD FAILURE: ${file}`, () => {
        test(`${file} must load and register without error`, () => {
          throw e;
        });
      });
    }
  }
}

// Master CLI Execution Entrypoint
async function main() {
  registerSuites();
  const report = await harness.runAll();

  // Write summary to tests/test_results.json
  const resultsPath = path.join(__dirname, 'test_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📄 Structured JSON summary written to: ${resultsPath}\n`);

  if (process.env.OUTPUT_TAP) {
    console.log(`\n--- TAP OUTPUT ---\n`);
    console.log(report.tapOutput);
  }

  // Exit with non-zero code if failures exist
  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

module.exports = {
  harness,
  describe,
  test,
  it,
  assert,
  setupGlobalBrowserMock,
  loadESModule,
  transformEsmToCjs,
  main
};

if (require.main === module) {
  main();
}
