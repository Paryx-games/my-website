import type { VercelRequest, VercelResponse } from "@vercel/node";

type Languages = Record<string, number>;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const repo = req.query.repo;

  if (typeof repo !== "string" || !/^[^/]+\/[^/]+$/.test(repo)) {
    return res.status(400).json({
      error: "Expected ?repo=owner/repository",
    });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/languages`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "paryx-api",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          response.status === 404
            ? "Repository not found"
            : "GitHub API request failed",
      });
    }

    const languages = (await response.json()) as Languages;
    const total = Object.values(languages).reduce(
      (sum, bytes) => sum + bytes,
      0,
    );

    const result = Object.entries(languages).map(([language, bytes]) => ({
      language,
      bytes,
      percentage: total === 0 ? 0 : (bytes / total) * 100,
    }));

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );

    return res.status(200).json({
      repository: repo,
      totalBytes: total,
      languages: result,
    });
  } catch {
    return res.status(500).json({
      error: "Failed to fetch repository languages",
    });
  }
}