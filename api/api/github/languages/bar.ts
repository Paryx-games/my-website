import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLanguageColor } from "../../../lib/language-colors.js";
import {
  getRepositoryLanguageCacheTag,
  getTargetLanguages,
} from "../../../lib/languages.js";

const BAR_WIDTH = 600;
const BAR_HEIGHT = 16;
const SEGMENT_GAP = 2;
const DETAILS_TOP = 40;
const DETAILS_ROW_HEIGHT = 24;
const DETAILS_COLUMN_WIDTH = BAR_WIDTH / 2;

type LanguageBarOptions = {
  includeDetails: boolean;
};

type LanguageFilter = {
  include?: Set<string>;
  exclude?: Set<string>;
  limit: number;
};

function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function queryList(
  value: string | string[] | undefined,
  name: string,
): { values?: Set<string>; error?: string } {
  if (value === undefined) return {};
  const values = (Array.isArray(value) ? value : [value])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.length) return { error: `${name} must contain at least one language` };
  return { values: new Set(values) };
}

function languageFilter(req: VercelRequest): LanguageFilter | { error: string } {
  const include = queryList(req.query.include, "include");
  const exclude = queryList(req.query.exclude, "exclude");
  if (include.error) return { error: include.error };
  if (exclude.error) return { error: exclude.error };
  if (include.values && exclude.values) {
    return { error: "include and exclude cannot be used together" };
  }
  const rawLimit = queryValue(req.query.limit);
  if (rawLimit !== undefined && !/^(?:[1-9]|[1-9]\d|100)$/.test(rawLimit)) {
    return { error: "limit must be an integer between 1 and 100" };
  }
  return {
    ...(include.values ? { include: include.values } : {}),
    ...(exclude.values ? { exclude: exclude.values } : {}),
    limit: rawLimit === undefined ? 100 : Number(rawLimit),
  };
}

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
  languages: { language: string; bytes: number; percentage: number }[],
  options: LanguageBarOptions,
): string {
  const visibleLanguages = languages.filter(({ percentage }) => percentage > 0);
  const availableWidth = BAR_WIDTH - SEGMENT_GAP * (visibleLanguages.length - 1);
  let position = 0;
  const segments = visibleLanguages
    .map(({ language, percentage }, index, visibleLanguages) => {
      const width =
        index === visibleLanguages.length - 1
          ? BAR_WIDTH - position
          : (percentage / 100) * availableWidth;
      const segment = `<rect x="${position}" y="0" width="${width}" height="${BAR_HEIGHT}" fill="${getLanguageColor(language)}"><title>${escapeXml(language)}: ${percentage.toFixed(1)}%</title></rect>`;
      position += width + SEGMENT_GAP;
      return segment;
    })
    .join("");

  const detailRows = Math.ceil(languages.length / 2);
  const hasDetails = options.includeDetails && languages.length > 0;
  const details = hasDetails
    ? languages
        .map(({ language, percentage }, index) => {
          const column = index % 2;
          const row = Math.floor(index / 2);
          const x = column * DETAILS_COLUMN_WIDTH + 12;
          const y = DETAILS_TOP + row * DETAILS_ROW_HEIGHT;

          return [
            `<circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${getLanguageColor(language)}"/>`,
            `<text x="${x + 17}" y="${y}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="14"><tspan font-weight="600" fill="#f0f6fc">${escapeXml(language)}</tspan><tspan dx="6" fill="#8b949e">&#160;${percentage.toFixed(1)}%</tspan></text>`,
          ].join("");
        })
        .join("")
    : "";
  const svgHeight = hasDetails
    ? DETAILS_TOP + (detailRows - 1) * DETAILS_ROW_HEIGHT + 8
    : BAR_HEIGHT;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BAR_WIDTH}" height="${svgHeight}" viewBox="0 0 ${BAR_WIDTH} ${svgHeight}" role="img" aria-labelledby="title">`,
    `<title id="title">${escapeXml(repository)} language breakdown</title>`,
    `<defs><clipPath id="bar"><rect width="${BAR_WIDTH}" height="${BAR_HEIGHT}" rx="${BAR_HEIGHT / 2}"/></clipPath></defs>`,
    `<g clip-path="url(#bar)">${segments}</g>`,
    details,
    `</svg>`,
  ].join("");
}

function filterLanguages(
  languages: { language: string; bytes: number; percentage: number }[],
  filter: LanguageFilter,
) {
  const include = filter.include;
  const exclude = filter.exclude;
  const selected = include
    ? languages.filter(({ language }) => include.has(language))
    : exclude
      ? languages.filter(({ language }) => !exclude.has(language))
      : languages;
  const shown = selected.slice(0, filter.limit);
  const otherBytes = languages
    .filter(({ language }) => !shown.some((shownLanguage) => shownLanguage.language === language))
    .reduce((sum, language) => sum + language.bytes, 0);
  const totalBytes = languages.reduce((sum, language) => sum + language.bytes, 0);
  if (otherBytes > 0) {
    shown.push({
      language: "Other",
      bytes: otherBytes,
      percentage: totalBytes ? (otherBytes / totalBytes) * 100 : 0,
    });
  }
  return shown;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const filter = languageFilter(req);
  if ("error" in filter) {
    return res.status(400).json({ error: filter.error });
  }
  const target = queryValue(req.query.target) ?? queryValue(req.query.repo);
  const result = await getTargetLanguages(target);

  if (result.error !== undefined) {
    return res.status(result.status).json({ error: result.error });
  }

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.setHeader(
    "Vercel-Cache-Tag",
    getRepositoryLanguageCacheTag(result.data.repository),
  );
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  return res.status(200).send(
    createLanguageBar(result.data.repository, filterLanguages(result.data.languages, filter), {
      includeDetails: queryValue(req.query.details)?.toLowerCase() === "true",
    }),
  );
}
