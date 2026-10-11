import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import {
  defineConfig,
  loadEnv,
  type ViteDevServer,
  type PreviewServer,
} from "vite";

const projectsApi = (server: ViteDevServer | PreviewServer) => {
  server.middlewares.use(async (req, res, next) => {
    if (req.url?.split("?")[0] !== "/api/github-projects") return next();
    const { default: handler } = await import(
      new URL("./api/github-projects.js", import.meta.url).href
    );
    await handler(req, {
      status: (status: number) => {
        res.statusCode = status;
      },
      setHeader: res.setHeader.bind(res),
      send: (body: string) => res.end(body),
    });
  });
};

const preview = ["preview", "development"].includes(
  process.env.VERCEL_ENV ?? "",
);

const searchProxy = {
  "/search-index.json": { target: "https://blog.paryx.uk", changeOrigin: true },
};

export default defineConfig(({ mode }) => {
  process.env.GITHUB_TOKEN ||= loadEnv(
    mode,
    fileURLToPath(new URL("./", import.meta.url)),
    "GITHUB_",
  ).GITHUB_TOKEN;
  return {
    appType: "mpa",
    server: { host: "127.0.0.1", proxy: searchProxy },
    preview: { proxy: searchProxy },
    plugins: [
      {
        name: "portfolio-share-metadata",
        transformIndexHtml(html, context) {
          if (!context.filename.endsWith("portfolio.html")) return html;
          const config = JSON.parse(
            readFileSync(
              new URL("./public/portfolio.json", import.meta.url),
              "utf8",
            ),
          );
          const escape = (value: string) =>
            value.replace(
              /[&<>"']/g,
              (character) =>
                ({
                  "&": "&amp;",
                  "<": "&lt;",
                  ">": "&gt;",
                  '"': "&quot;",
                  "'": "&#39;",
                })[character]!,
            );
          if (typeof config.title === "string" && config.title.trim()) {
            const title = escape(`Paryx - ${config.title}`);
            html = html.replace(
              /<title>[^<]*<\/title>/,
              () => `<title>${title}</title>`,
            );
            for (const field of ["og:title", "twitter:title"]) {
              html = html.replace(
                new RegExp(
                  `(<meta (?:name|property)="${field}" content=")[^"]*(">)`,
                ),
                (_match, start, end) => `${start}${title}${end}`,
              );
            }
          }
          if (typeof config.description === "string") {
            const description = escape(config.description);
            for (const field of [
              "description",
              "og:description",
              "twitter:description",
            ]) {
              html = html.replace(
                new RegExp(
                  `(<meta (?:name|property)="${field}" content=")[^"]*(">)`,
                ),
                (_match, start, end) => `${start}${description}${end}`,
              );
            }
          }
          return html;
        },
      },
      {
        name: "github-projects-api",
        configureServer: projectsApi,
        configurePreviewServer: projectsApi,
      },
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
          portfolio: fileURLToPath(new URL("./portfolio.html", import.meta.url)),
          privacy: fileURLToPath(
            new URL("./privacy-policy.html", import.meta.url),
          ),
        },
      },
    },
  };
});
