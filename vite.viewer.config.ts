import { defineConfig } from "vite";

export default defineConfig({
  root: "viewer",
  base: "./",
  publicDir: false,
  build: {
    outDir: "../public/viewer",
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "assets/viewer.js",
        assetFileNames: "assets/viewer[extname]",
      },
    },
  },
});
