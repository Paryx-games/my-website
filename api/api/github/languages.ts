import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getTargetLanguages,
} from "../../lib/languages.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const target = req.query.target ?? req.query.repo;
  const result = await getTargetLanguages(target);

  if (result.error !== undefined) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(result.status).json({ error: result.error });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.setHeader(
    "Vercel-Cache-Tag",
    `github-languages-${result.data.repository.toLowerCase().replaceAll("/", "-")}`,
  );

  return res.status(200).json(result.data);
}
