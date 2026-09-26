/// <reference types="vitest/config" />
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

function copyWasm(): Plugin {
  const from = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
  const to = resolve(root, "public/wasm");
  const copy = () => {
    if (!existsSync(from)) return;
    mkdirSync(to, { recursive: true });
    cpSync(from, to, { recursive: true });
  };
  return {
    name: "copy-mediapipe-wasm",
    buildStart: copy,
    configureServer: copy,
  };
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === "1" ? "/uchikomi/" : "/",
  plugins: [copyWasm()],
  optimizeDeps: {
    exclude: ["@mediapipe/tasks-vision"],
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
