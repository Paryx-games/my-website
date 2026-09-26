import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getRepositoryLanguageCacheTag,
  getRepositoryLanguages,
} from "../../lib/languages.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const result = await getRepositoryLanguages(req.query.repo);

  if (result.error) {
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

  return res.status(200).json(result.data);
}
