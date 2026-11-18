import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { defineConfig } from "vite";
import { portablePage } from "./tools/portable-page.js";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: join(root, "src"),
  base: "./",
  publicDir: false,
  server: { host: "0.0.0.0", allowedHosts: true, fs: { allow: [root] } },
  preview: { host: "0.0.0.0", allowedHosts: true },
  build: {
    outDir: join(root, "dist"),
    emptyOutDir: true,
    // Library mode inlines binary assets, including URLs in imported CSS.
    lib: {
      entry: join(root, "src/main.js"),
      name: "Aetheria",
      formats: ["iife"],
    },
    cssCodeSplit: false,
    target: "es2020",
  },
  plugins: [portablePage(root)],
});
