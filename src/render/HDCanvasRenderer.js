const DEFAULT_MIN_DPR = 2;
const DEFAULT_MAX_DPR = 3;

/**
 * Canvas の物理ピクセルとゲームの論理座標を分離する共通レンダラー。
 * ゲーム側は getLogicalWidth/Height と eventToCanvasPoint を使用する。
 */
export class HDCanvasRenderer {
  static instances = new WeakMap();

  static setup(canvas, cssWidth, cssHeight, options = {}) {
    if (!canvas) throw new TypeError('canvas is required');
    const previous = HDCanvasRenderer.instances.get(canvas);
    if (previous) previous.resize(cssWidth, cssHeight);
    else HDCanvasRenderer.instances.set(canvas, new HDCanvasRenderer(canvas, cssWidth, cssHeight, options));
    return HDCanvasRenderer.instances.get(canvas);
  }

  static for(canvas) { return HDCanvasRenderer.instances.get(canvas) || null; }

  constructor(canvas, cssWidth, cssHeight, { minDpr = DEFAULT_MIN_DPR, maxDpr = DEFAULT_MAX_DPR } = {}) {
    this.canvas = canvas;
    this.minDpr = minDpr;
    this.maxDpr = maxDpr;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('2D canvas context is unavailable');
    this.installIntegerAlignedText();
    this.resize(cssWidth, cssHeight);
  }

  installIntegerAlignedText() {
    if (typeof this.ctx.fillText === 'function' && !this.ctx.__hdOriginalFillText) {
      this.ctx.__hdOriginalFillText = this.ctx.fillText;
      this.ctx.fillText = (text, x, y, maxWidth) => maxWidth === undefined
        ? this.ctx.__hdOriginalFillText.call(this.ctx, text, Math.floor(x), Math.floor(y))
        : this.ctx.__hdOriginalFillText.call(this.ctx, text, Math.floor(x), Math.floor(y), maxWidth);
    }
    if (typeof this.ctx.strokeText === 'function' && !this.ctx.__hdOriginalStrokeText) {
      this.ctx.__hdOriginalStrokeText = this.ctx.strokeText;
      this.ctx.strokeText = (text, x, y, maxWidth) => maxWidth === undefined
        ? this.ctx.__hdOriginalStrokeText.call(this.ctx, text, Math.floor(x), Math.floor(y))
        : this.ctx.__hdOriginalStrokeText.call(this.ctx, text, Math.floor(x), Math.floor(y), maxWidth);
    }
  }

  resize(cssWidth, cssHeight) {
    const rect = this.canvas.getBoundingClientRect?.() || {};
    const nextWidth = Math.max(1, Math.round(Number(cssWidth) || rect.width || 640));
    const nextHeight = Math.max(1, Math.round(Number(cssHeight) || rect.height || 384));
    const deviceDpr = typeof window !== 'undefined' ? Number(window.devicePixelRatio) || 1 : 1;
    const nextDpr = Math.min(this.maxDpr, Math.max(this.minDpr, deviceDpr));
    if (this.logicalWidth === nextWidth && this.logicalHeight === nextHeight && this.dpr === nextDpr) return this;
    this.logicalWidth = nextWidth;
    this.logicalHeight = nextHeight;
    this.dpr = nextDpr;
    this.canvas.width = Math.floor(this.logicalWidth * this.dpr);
    this.canvas.height = Math.floor(this.logicalHeight * this.dpr);
    if (this.canvas.style) {
      this.canvas.style.width = `${this.logicalWidth}px`;
      this.canvas.style.height = `${this.logicalHeight}px`;
      this.canvas.style.touchAction = 'none';
    }
    if (this.canvas.dataset) {
      this.canvas.dataset.logicalWidth = String(this.logicalWidth);
      this.canvas.dataset.logicalHeight = String(this.logicalHeight);
      this.canvas.dataset.pixelRatio = String(this.dpr);
    } else {
      this.canvas.__logicalWidth = this.logicalWidth;
      this.canvas.__logicalHeight = this.logicalHeight;
      this.canvas.__pixelRatio = this.dpr;
    }
    this.resetTransform();
    return this;
  }

  resetTransform() {
    if (typeof this.ctx.setTransform === 'function') this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    else if (typeof this.ctx.scale === 'function') this.ctx.scale(this.dpr, this.dpr);
    this.ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in this.ctx) this.ctx.imageSmoothingQuality = 'high';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';
  }

  clear() {
    this.ctx.save?.();
    if (typeof this.ctx.setTransform === 'function') this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore?.();
    this.resetTransform();
  }

  pointFromEvent(event) { return eventToCanvasPoint(this.canvas, event); }

  align(value) { return Math.floor(Number(value) || 0); }

  dispose() {
    if (this.ctx.__hdOriginalFillText) { this.ctx.fillText = this.ctx.__hdOriginalFillText; delete this.ctx.__hdOriginalFillText; }
    if (this.ctx.__hdOriginalStrokeText) { this.ctx.strokeText = this.ctx.__hdOriginalStrokeText; delete this.ctx.__hdOriginalStrokeText; }
    HDCanvasRenderer.instances.delete(this.canvas);
  }
}

export function setupHighDPICanvas(canvas, cssWidth, cssHeight, options) {
  return HDCanvasRenderer.setup(canvas, cssWidth, cssHeight, options).ctx;
}

export function getLogicalCanvasWidth(canvas) {
  const renderer = HDCanvasRenderer.for(canvas);
  return renderer?.logicalWidth || Number(canvas?.dataset?.logicalWidth) || Number(canvas?.__logicalWidth) || Number(canvas?.width) || 1;
}

export function getLogicalCanvasHeight(canvas) {
  const renderer = HDCanvasRenderer.for(canvas);
  return renderer?.logicalHeight || Number(canvas?.dataset?.logicalHeight) || Number(canvas?.__logicalHeight) || Number(canvas?.height) || 1;
}

export function eventToCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches?.[0] || event.changedTouches?.[0] || event;
  return {
    x: (Number(source.clientX) - rect.left) * (getLogicalCanvasWidth(canvas) / Math.max(1, rect.width)),
    y: (Number(source.clientY) - rect.top) * (getLogicalCanvasHeight(canvas) / Math.max(1, rect.height))
  };
}
