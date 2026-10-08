import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Every page uses react-toastify; keep toasts out of jsdom and spy-friendly.
vi.mock("react-toastify", () => ({
  ToastContainer: () => null,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    update: vi.fn(),
  },
}));

// ── jsdom polyfills the MUI stack needs ─────────────────────────────────────
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}

if (!window.scrollTo) {
  window.scrollTo = () => {};
}

// Export flows build a Blob and turn it into a download URL. jsdom/Node ship
// an implementation that rejects DOM Blobs, so always install a spy instead.
URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
URL.revokeObjectURL = vi.fn();

// xlsx / file-saver style UAs occasionally inspect navigator props
if (!window.navigator.userAgent) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: "jsdom",
    configurable: true,
  });
}

// React 18 + jsdom: guard against act() warnings from microtask-heavy flows
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Keep fetch stubs from bleeding between tests
beforeEach(() => {
  // MUI DataGrid emits resize calls via ResizeObserver async callbacks
  vi.clearAllMocks();
});