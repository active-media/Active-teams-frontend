import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Component tests only. The pure-logic tests under tests/*.test.js keep using
// `node --test` (npm run test:unit) — vitest is scoped to JSX page tests so the
// two runners never double-run the same file.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/components/**/*.test.jsx"],
    setupFiles: ["./tests/components/setup.js"],
    css: false,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 15000,
  },
});