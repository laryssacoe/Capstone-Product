import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/backend/**/*.test.ts"],
    coverage: {
      enabled: Boolean(process.env.VITEST_COVERAGE),
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage/backend",
      exclude: [
        "src/generated/**",
        "lib/server/mailer.ts", // integration with SMTP; covered in higher-level e2e
        "node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
})
