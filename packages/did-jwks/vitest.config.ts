import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    setupFiles: ["../test-utils/setup.ts"],
    passWithNoTests: true,
    watch: false
  }
})
