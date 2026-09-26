import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLanguageColor } from "../../../lib/language-colors";
import { getRepositoryLanguages } from "../../../lib/languages";

const BAR_WIDTH = 600;
const BAR_HEIGHT = 16;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function createLanguageBar(
  repository: string,
  languages: { language: string; percentage: number }[],
): string {
  let position = 0;
  const segments = languages
    .filter(({ percentage }) => percentage > 0)
    .map(({ language, percentage }, index, visibleLanguages) => {
      const width =
        index === visibleLanguages.length - 1
          ? BAR_WIDTH - position
          : (percentage / 100) * BAR_WIDTH;
      const segment = `<rect x="${position}" y="0" width="${width}" height="${BAR_HEIGHT}" fill="${getLanguageColor(language)}"><title>${escapeXml(language)}: ${percentage.toFixed(1)}%</title></rect>`;
      position += width;
      return segment;
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_WIDTH}" height="${BAR_HEIGHT}" viewBox="0 0 ${BAR_WIDTH} ${BAR_HEIGHT}" preserveAspectRatio="none" role="img" aria-labelledby="title">`,
    `<title id="title">${escapeXml(repository)} language breakdown</title>`,
    `<defs><clipPath id="bar"><rect width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="${BAR_HEIGHT / 2}"/></clipPath></defs>`,
    `<g clip-path="url(#bar)">${segments}</g>`,
    `</svg>`,
  ].join("");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const result = await getRepositoryLanguages(req.query.repo);

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );

  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  return res.status(200).send(
    createLanguageBar(result.data.repository, result.data.languages),
  );
}
