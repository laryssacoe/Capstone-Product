import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    include: ["tests/frontend/**/*.test.ts", "tests/frontend/**/*.test.tsx"],
    css: false,
    coverage: {
      enabled: Boolean(process.env.VITEST_COVERAGE),
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage/frontend",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
})
