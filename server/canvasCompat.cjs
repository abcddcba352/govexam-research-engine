'use strict';

/**
 * Cloudflare-safe shim for @napi-rs/canvas.
 *
 * pdf-parse → pdfjs-dist optionally imports @napi-rs/canvas for server-side
 * rendering of PDF pages to images.  We never use that feature (we only
 * extract *text*), so every export is a harmless no-op / stub.
 *
 * The alias in wrangler.jsonc maps "@napi-rs/canvas" to this file so the
 * bundler never tries to load the native .node binary.
 */

// Minimal stub Canvas that satisfies pdfjs-dist's optional canvas factory
class CanvasStub {
  constructor(width, height) {
    this.width = width || 0;
    this.height = height || 0;
  }

  getContext() {
    return {
      // Drawing context stubs — all no-ops
      fillRect() {},
      clearRect() {},
      putImageData() {},
      setTransform() {},
      resetTransform() {},
      drawImage() {},
      save() {},
      restore() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      stroke() {},
      fill() {},
      translate() {},
      scale() {},
      rotate() {},
      arc() {},
      measureText(text) {
        return { width: (text || '').length * 6 };
      },
      createLinearGradient() {
        return { addColorStop() {} };
      },
      createRadialGradient() {
        return { addColorStop() {} };
      },
      createPattern() {
        return {};
      },
      clip() {},
      rect() {},
      quadraticCurveTo() {},
      bezierCurveTo() {},
      // Properties
      canvas: this,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
    };
  }

  toBuffer() {
    return Buffer.alloc(0);
  }

  toDataURL() {
    return 'data:image/png;base64,';
  }
}

function createCanvas(width, height) {
  return new CanvasStub(width, height);
}

function loadImage() {
  return Promise.resolve(new CanvasStub(1, 1));
}

// Named exports that pdfjs-dist / @napi-rs/canvas consumers may reference
module.exports = {
  createCanvas,
  loadImage,
  Canvas: CanvasStub,
  // Additional named exports some versions look for
  GlobalFonts: {
    families: [],
    has() { return false; },
    register() {},
    loadFontsFromDir() {},
  },
  Path2D: class Path2D {
    constructor() {}
    addPath() {}
    moveTo() {}
    lineTo() {}
    closePath() {}
    arc() {}
    rect() {}
    quadraticCurveTo() {}
    bezierCurveTo() {}
  },
  DOMMatrix: typeof globalThis.DOMMatrix !== 'undefined'
    ? globalThis.DOMMatrix
    : class DOMMatrix {
        constructor() {
          this.a = 1; this.b = 0; this.c = 0;
          this.d = 1; this.e = 0; this.f = 0;
        }
      },
  DOMPoint: typeof globalThis.DOMPoint !== 'undefined'
    ? globalThis.DOMPoint
    : class DOMPoint {
        constructor(x, y, z, w) {
          this.x = x || 0; this.y = y || 0;
          this.z = z || 0; this.w = w || 1;
        }
      },
};
