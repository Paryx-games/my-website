import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const preview = ["preview", "development"].includes(
  process.env.VERCEL_ENV ?? "",
);

export default defineConfig({
  appType: "mpa",
  server: { host: "127.0.0.1" },
  plugins: [
    {
      name: "production-indexing",
      transformIndexHtml(html) {
        return preview
          ? html.replace(
              'name="robots" content="index, follow"',
              'name="robots" content="noindex, follow"',
            )
          : html;
      },
      generateBundle() {
        if (preview) {
          this.emitFile({
            type: "asset",
            fileName: "robots.txt",
            source: "User-agent: *\nDisallow: /\n",
          });
        }
      },
    },
  ],
  build: {
    sourcemap: true,
    rolldownOptions: {
      input: {
        home: fileURLToPath(new URL("./index.html", import.meta.url)),
        privacy: fileURLToPath(
          new URL("./privacy-policy.html", import.meta.url),
        ),
      },
    },
  },
});
