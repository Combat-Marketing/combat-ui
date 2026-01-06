import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.src.json",
      outDir: "dist/types",
      insertTypesEntry: true,
    }),
  ],
  build: {
    target: "baseline-widely-available",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "combat-ui.js",
      cssFileName: "combat-ui",
    },
    rollupOptions: {
      output: {
        preserveModules: false,
      },
    },
  },
});