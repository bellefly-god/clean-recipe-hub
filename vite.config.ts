import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        sidepanel: path.resolve(__dirname, "src/sidepanel/index.html"),
        options: path.resolve(__dirname, "src/options/index.html"),
        "service-worker": path.resolve(__dirname, "src/background/service-worker.ts"),
        content: path.resolve(__dirname, "src/content/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "copy-extension-manifest",
      apply: "build",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "manifest.json",
          source: fs.readFileSync(path.resolve(__dirname, "manifest.json"), "utf8"),
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
