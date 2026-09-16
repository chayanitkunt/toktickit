import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
    // The default 5000ms per-test timeout is tight for tests that drive
    // several sequential userEvent.type()/click() calls plus multiple
    // waitFor/findBy round-trips (e.g. Login's "busy state" test). On a
    // loaded machine — especially running vitest and playwright back to
    // back — that flow alone can approach 5s even though it's behaving
    // correctly, causing an intermittent false failure. 10s gives real
    // headroom without hiding a genuine hang.
    testTimeout: 10000,
  },
});
