import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
  test: {
    environment: "node",
    exclude: ["node_modules", "ui inspired temp", "**/.{idea,git,cache,output,temp}/**"],
  },
});
