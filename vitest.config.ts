import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: { environment: "node", setupFiles: ["./vitest.setup.ts"], include: ["**/__tests__/**/*.test.ts"], exclude: ["node_modules/**"] },
});
