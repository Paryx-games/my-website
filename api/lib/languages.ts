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

type GithubRepository = {
  full_name?: unknown;
  fork?: unknown;
  archived?: unknown;
};

type RepositoryLanguagesResult =
  | { data: RepositoryLanguages; error?: never; status: 200 }
  | { data?: never; error: string; status: number };

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "paryx-api",
  "X-GitHub-Api-Version": "2022-11-28",
};

function githubRequestHeaders(): HeadersInit {
  return process.env.GITHUB_TOKEN
    ? { ...githubHeaders, Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : githubHeaders;
}

function languageResult(
  name: string,
  languageMaps: Record<string, number>[],
): RepositoryLanguages {
  const totals = new Map<string, number>();
  for (const languages of languageMaps) {
    for (const [language, bytes] of Object.entries(languages)) {
      if (Number.isSafeInteger(bytes) && bytes > 0) {
        totals.set(language, (totals.get(language) || 0) + bytes);
      }
    }
  }
  const totalBytes = [...totals.values()].reduce((sum, bytes) => sum + bytes, 0);
  return {
    repository: name,
    totalBytes,
    languages: [...totals].map(([language, bytes]) => ({
      language,
      bytes,
      percentage: totalBytes === 0 ? 0 : (bytes / totalBytes) * 100,
    })),
  };
}

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
        headers: githubRequestHeaders(),
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
    return {
      data: languageResult(repository, [languages]),
      status: 200,
    };
  } catch {
    return {
      error: "Failed to fetch repository languages",
      status: 500,
    };
  }
}

export async function getUserLanguages(
  user: unknown,
): Promise<RepositoryLanguagesResult> {
  if (typeof user !== "string" || !/^[a-zA-Z0-9-]+$/.test(user)) {
    return {
      error: "Expected ?user=github-username",
      status: 400,
    };
  }

  try {
    return await getOwnerLanguages(user);
  } catch {
    return { error: "Failed to fetch user languages", status: 500 };
  }
}

export async function getOwnerLanguages(
  owner: unknown,
): Promise<RepositoryLanguagesResult> {
  if (typeof owner !== "string" || !/^[a-zA-Z0-9-]+$/.test(owner)) {
    return {
      error: "Expected ?user=github-username",
      status: 400,
    };
  }
  try {
    const languageMaps: Record<string, number>[] = [];
    for (let page = 1; ; page += 1) {
      let repositoriesResponse = await fetch(
        `https://api.github.com/users/${owner}/repos?type=owner&per_page=100&page=${page}`,
        { headers: githubRequestHeaders() },
      );
      if (repositoriesResponse.status === 404) {
        repositoriesResponse = await fetch(
          `https://api.github.com/orgs/${owner}/repos?type=all&per_page=100&page=${page}`,
          { headers: githubRequestHeaders() },
        );
      }
      if (!repositoriesResponse.ok) {
        return {
          error:
            repositoriesResponse.status === 404
              ? "GitHub user or organization not found"
              : "GitHub API request failed",
          status: repositoriesResponse.status,
        };
      }
      const repositories = (await repositoriesResponse.json()) as unknown;
      if (!Array.isArray(repositories)) {
        return { error: "Invalid GitHub repository response", status: 502 };
      }
      for (const repository of repositories as GithubRepository[]) {
        if (
          repository.fork === true ||
          repository.archived === true ||
          typeof repository.full_name !== "string"
        ) {
          continue;
        }
        const languageResponse = await fetch(
          `https://api.github.com/repos/${repository.full_name}/languages`,
          { headers: githubRequestHeaders() },
        );
        if (!languageResponse.ok) continue;
        const languages = (await languageResponse.json()) as unknown;
        if (
          languages &&
          typeof languages === "object" &&
          !Array.isArray(languages)
        ) {
          languageMaps.push(languages as Record<string, number>);
        }
      }
      if (repositories.length < 100) break;
    }
    return { data: languageResult(owner, languageMaps), status: 200 };
  } catch {
    return { error: "Failed to fetch owner languages", status: 500 };
  }
}

export async function getTargetLanguages(
  target: unknown,
): Promise<RepositoryLanguagesResult> {
  if (typeof target !== "string" || !target) {
    return {
      error: "Expected ?target=username or ?target=owner/repository",
      status: 400,
    };
  }
  return target.includes("/")
    ? getRepositoryLanguages(target)
    : getUserLanguages(target);
}
