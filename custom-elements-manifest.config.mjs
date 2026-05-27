import { staticTagNamePlugin } from "./scripts/cem-static-tagname.mjs";

export default {
  globs: ["src/components/**/*.ts"],
  exclude: ["src/components/**/index.ts"],
  outdir: "dist",
  litelement: false,
  fast: false,
  plugins: [staticTagNamePlugin()],
};