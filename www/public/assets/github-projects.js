const valid = (data) =>
  data?.version === 1 &&
  ["pinned", "games", "labs"].every((key) => Array.isArray(data[key]));

export function createProjectsClient({
  request = (url) => fetch(url),
  storage = () => localStorage,
  now = Date.now,
} = {}) {
  let pending;
  return () => {
    pending ||= (async () => {
      try {
        const cached = JSON.parse(storage().getItem("github-projects:v1"));
        if (valid(cached?.data) && now() - cached.time < 900000)
          return cached.data;
      } catch {
        /* Browser storage is optional. */
      }
      const response = await request("/api/github-projects");
      if (!response.ok) throw new Error("GitHub project data unavailable");
      const data = await response.json();
      if (!valid(data)) throw new Error("Invalid GitHub project response");
      if (!Object.keys(data.errors || {}).length) {
        try {
          storage().setItem(
            "github-projects:v1",
            JSON.stringify({ time: now(), data }),
          );
        } catch {}
      }
      return data;
    })();
    return pending;
  };
}

export const getGitHubProjects = createProjectsClient();
