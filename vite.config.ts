import { defineConfig, loadEnv } from "vite";
import { middleware } from "./server/api.ts";
import { createModel, modelConfig } from "./server/model.ts";

export default defineConfig(({ mode }) => {
  const config = modelConfig({ ...loadEnv(mode, process.cwd(), "MODEL_"), ...process.env });
  const api = middleware(config ? createModel(config) : undefined);
  return {
    base: "./",
    plugins: [{
      name: "career-exhibit-api",
      configureServer(server) { server.middlewares.use(api); },
      configurePreviewServer(server) { server.middlewares.use(api); },
    }],
    build: { chunkSizeWarningLimit: 1200 },
  };
});
