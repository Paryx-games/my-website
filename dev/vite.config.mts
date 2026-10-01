import { defineConfig } from "vite";

const searchProxy = {
  "/search-index.json": { target: "https://blog.paryx.uk", changeOrigin: true },
};

export default defineConfig({
  server: {
    host: "127.0.0.1",
    proxy: searchProxy,
  },
  preview: { proxy: searchProxy },
  build: {
    sourcemap: true,
  },
});
