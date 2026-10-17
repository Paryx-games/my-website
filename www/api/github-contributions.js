const QUERY = `query Contributions {
  user(login: "Paryx-games") {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date weekday contributionCount contributionLevel } }
      }
    }
  }
}`;
const LEVELS = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];

export function normalizeCalendar(calendar) {
  if (!Number.isSafeInteger(calendar?.totalContributions) || calendar.totalContributions < 0 ||
      !Array.isArray(calendar.weeks) || calendar.weeks.length < 1 || calendar.weeks.length > 54) throw new Error('Invalid contribution calendar');
  let previous = '';
  const weeks = calendar.weeks.map(week => {
    if (!Array.isArray(week.contributionDays) || week.contributionDays.length < 1 || week.contributionDays.length > 7) throw new Error('Invalid contribution week');
    return week.contributionDays.map(day => {
      const level = LEVELS.indexOf(day.contributionLevel);
      const date = new Date(`${day.date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day.date ||
          day.date <= previous || !Number.isInteger(day.weekday) || day.weekday !== date.getUTCDay() ||
          !Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0 || level < 0) throw new Error('Invalid contribution day');
      previous = day.date;
      return { date: day.date, weekday: day.weekday, count: day.contributionCount, level };
    });
  });
  return { version: 1, username: 'Paryx-games', total: calendar.totalContributions, weeks };
}

export async function fetchContributions({ token = process.env.GITHUB_TOKEN, request = fetch, now = Date.now } = {}) {
  if (!token) throw new Error('GitHub contributions are not configured');
  const response = await request('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'paryx-website' },
    body: JSON.stringify({ query: QUERY }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('GitHub contributions unavailable');
  const body = await response.json();
  if (body.errors?.length) throw new Error('GitHub contributions unavailable');
  return { ...normalizeCalendar(body.data?.user?.contributionsCollection?.contributionCalendar), fetchedAt: new Date(now()).toISOString() };
}

export function createContributionsHandler({ load = fetchContributions, configured = () => Boolean(process.env.GITHUB_TOKEN), now = Date.now } = {}) {
  let cached;
  let fetchedAt = 0;
  let pending;
  return async (req, res) => {
    const send = (status, body) => {
      res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=900, stale-while-revalidate=3600' : 'no-store');
      res.status(status).json(body);
    };
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(405, { error: 'Method not allowed' }); }
    if (!configured()) return send(503, { error: 'GitHub contributions are not configured' });
    if (cached && now() - fetchedAt < 900000) return send(200, cached);
    try {
      pending ||= load().then(data => { cached = data; fetchedAt = now(); return data; }).finally(() => { pending = null; });
      return send(200, await pending);
    } catch {
      if (cached) return send(200, { ...cached, stale: true });
      return send(502, { error: 'GitHub contributions unavailable' });
    }
  };
}

export default createContributionsHandler();
