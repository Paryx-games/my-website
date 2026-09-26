export type RepositoryLanguage = {
  language: string;
  bytes: number;
  percentage: number;
};

export type RepositoryLanguages = {
  repository: string;
  totalBytes: number;
  languages: RepositoryLanguage[];
};

type RepositoryLanguagesResult =
  | { data: RepositoryLanguages; error?: never; status: 200 }
  | { data?: never; error: string; status: number };

export function getRepositoryLanguageCacheTag(repository: string): string {
  return `github-languages-${repository.toLowerCase().replace("/", "-")}`;
}

export async function getRepositoryLanguages(
  repository: unknown,
): Promise<RepositoryLanguagesResult> {
  if (
    typeof repository !== "string" ||
    !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)
  ) {
    return {
      error: "Expected ?repo=owner/repository",
      status: 400,
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repository}/languages`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "paryx-api",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!response.ok) {
      return {
        error:
          response.status === 404
            ? "Repository not found"
            : "GitHub API request failed",
        status: response.status,
      };
    }

    const languages = (await response.json()) as Record<string, number>;
    const totalBytes = Object.values(languages).reduce(
      (sum, bytes) => sum + bytes,
      0,
    );

    return {
      data: {
        repository,
        totalBytes,
        languages: Object.entries(languages).map(([language, bytes]) => ({
          language,
          bytes,
          percentage: totalBytes === 0 ? 0 : (bytes / totalBytes) * 100,
        })),
      },
      status: 200,
    };
  } catch {
    return {
      error: "Failed to fetch repository languages",
      status: 500,
    };
  }
}
