import { captureApiException, withSentry } from "./sentry.js";

const CALENDAR_FIELDS = `contributionCalendar {
  totalContributions
  weeks { contributionDays { date weekday contributionCount contributionLevel } }
}`;
const YEARS_QUERY = `query ContributionYears {
  user(login: "Paryx-games") {
    contributionsCollection { contributionYears }
  }
}`;
const LEVELS = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];

export function normalizeCalendar(calendar) {
  if (!Number.isSafeInteger(calendar?.totalContributions) || calendar.totalContributions < 0 ||
      !Array.isArray(calendar.weeks) || calendar.weeks.length < 1 || calendar.weeks.length > 54) throw new Error('Invalid contribution calendar');
  let previous = '';
  let total = 0;
  const weeks = calendar.weeks.map(week => {
    if (!Array.isArray(week.contributionDays) || week.contributionDays.length < 1 || week.contributionDays.length > 7) throw new Error('Invalid contribution week');
    return week.contributionDays.map(day => {
      const level = LEVELS.indexOf(day.contributionLevel);
      const date = new Date(`${day.date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day.date ||
          day.date <= previous || !Number.isInteger(day.weekday) || day.weekday !== date.getUTCDay() ||
          !Number.isSafeInteger(day.contributionCount) || day.contributionCount < 0 || level < 0) throw new Error('Invalid contribution day');
      previous = day.date;
      total += day.contributionCount;
      if (!Number.isSafeInteger(total)) throw new Error('Invalid contribution total');
      return { date: day.date, weekday: day.weekday, count: day.contributionCount, level };
    });
  });
  if (total !== calendar.totalContributions) throw new Error('Contribution total does not match daily counts');
  return { version: 1, username: 'Paryx-games', total: calendar.totalContributions, weeks };
}

async function createGitHubQuery({ token, request, signal }) {
  return async document => {
    const response = await request('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'paryx-website' },
      body: JSON.stringify({ query: document }),
      signal,
    });
    if (!response.ok) throw new Error('GitHub contributions unavailable');
    const body = await response.json();
    if (body.errors?.length || !body.data?.user) throw new Error('GitHub contributions unavailable');
    return body.data.user;
  };
}

function validateYears(years, fetchedAt) {
  if (!Array.isArray(years) || years.length > 100 || new Set(years).size !== years.length ||
      years.some(year => !Number.isInteger(year) || year < 2008 || year > fetchedAt.getUTCFullYear())) {
    throw new Error('Invalid contribution years');
  }
  return years;
}

function annualField(year, fetchedAt) {
  const to = year === fetchedAt.getUTCFullYear() ? fetchedAt.toISOString() : `${year}-12-31T23:59:59Z`;
  return `year${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${to}") { ${CALENDAR_FIELDS} }`;
}

function recentField(fetchedAt) {
  const from = new Date(fetchedAt);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  return `recent: contributionsCollection(from: "${from.toISOString()}", to: "${fetchedAt.toISOString()}") { ${CALENDAR_FIELDS} }`;
}

function normalizeAnnual(history, year) {
  const annual = normalizeCalendar(history[`year${year}`]?.contributionCalendar);
  if (annual.weeks.flat().some(day => !day.date.startsWith(`${year}-`))) {
    throw new Error('Invalid annual contribution day');
  }
  return { year, ...annual };
}

export async function fetchContributions({ token = process.env.GITHUB_TOKEN, request = fetch, now = Date.now } = {}) {
  if (!token) throw new Error('GitHub contributions are not configured');
  const signal = AbortSignal.timeout(20000);
  const fetchedAt = new Date(now());
  const query = await createGitHubQuery({ token, request, signal });
  const user = await query(`query RecentContributions {
    user(login: "Paryx-games") {
      contributionsCollection { contributionYears }
      ${recentField(fetchedAt)}
    }
  }`);
  const collection = user.contributionsCollection;
  const calendar = normalizeCalendar(user.recent?.contributionCalendar);
  const years = validateYears(collection.contributionYears, fetchedAt);
  if (!years.length && calendar.total > 0) throw new Error('Invalid contribution years');
  return { ...calendar, years, fetchedAt: fetchedAt.toISOString() };
}

export async function fetchContributionHistory({ period, year, token = process.env.GITHUB_TOKEN, request = fetch, now = Date.now } = {}) {
  if (!token) throw new Error('GitHub contributions are not configured');
  if (period !== 'all' && period !== 'year') throw new Error('Invalid contribution period');
  const signal = AbortSignal.timeout(20000);
  const fetchedAt = new Date(now());
  const query = await createGitHubQuery({ token, request, signal });

  if (period === 'year') {
    if (!Number.isInteger(year) || year < 2008 || year > fetchedAt.getUTCFullYear()) {
      throw new Error('Invalid contribution year');
    }
    const history = await query(`query ContributionYear {
      user(login: "Paryx-games") {
        ${annualField(year, fetchedAt)}
      }
    }`);
    const annual = normalizeAnnual(history, year);
    return { ...annual, period: 'year', fetchedAt: fetchedAt.toISOString() };
  }

  const yearsUser = await query(YEARS_QUERY);
  const years = validateYears(yearsUser.contributionsCollection?.contributionYears, fetchedAt);
  if (!years.length) return { years: [], total: 0, period: 'all', fetchedAt: fetchedAt.toISOString() };
  const fields = years.map(value => annualField(value, fetchedAt)).join('\n');
  const history = await query(`query ContributionHistory { user(login: "Paryx-games") { ${fields} } }`);
  const calendars = years.map(value => normalizeAnnual(history, value));
  const total = calendars.reduce((sum, calendar) => sum + calendar.total, 0);
  if (!Number.isSafeInteger(total)) throw new Error('Invalid all-time contribution total');
  return { years: calendars, total, period: 'all', fetchedAt: fetchedAt.toISOString() };
}

export function createContributionsHandler({
  load,
  loadRecent = load || fetchContributions,
  loadHistory = fetchContributionHistory,
  configured = () => Boolean(process.env.GITHUB_TOKEN),
  now = Date.now,
} = {}) {
  const cache = new Map();
  const pending = new Map();
  return async (req, res) => {
    const send = (status, body) => {
      res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=900, stale-while-revalidate=3600' : 'no-store');
      res.status(status).json(body);
    };
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return send(405, { error: 'Method not allowed' }); }
    if (!configured()) return send(503, { error: 'GitHub contributions are not configured' });

    const period = req.query?.period || 'recent';
    const yearValue = req.query?.year;
    const year = typeof yearValue === 'string' && /^\d{4}$/.test(yearValue) ? Number(yearValue) : yearValue;
    if (period !== 'recent' && period !== 'all' && period !== 'year') return send(400, { error: 'Invalid contribution period' });
    if ((period === 'year' && !Number.isInteger(year)) || (period !== 'year' && yearValue !== undefined)) {
      return send(400, { error: 'Invalid contribution year' });
    }

    const key = period === 'year' ? `year:${year}` : period;
    const cached = cache.get(key);
    if (cached && now() - cached.fetchedAt < 900000) return send(200, cached.data);
    try {
      if (!pending.has(key)) {
        const loader = period === 'recent' ? loadRecent : loadHistory;
        const options = period === 'year' ? { period, year } : { period };
        pending.set(key, loader(options).then(data => {
          cache.set(key, { data, fetchedAt: now() });
          return data;
        }).finally(() => pending.delete(key)));
      }
      return send(200, await pending.get(key));
    } catch (error) {
      await captureApiException(error, "/api/github-contributions");
      if (cached) return send(200, { ...cached.data, stale: true });
      return send(502, { error: 'GitHub contributions unavailable' });
    }
  };
}

export default withSentry(
  createContributionsHandler(),
  "/api/github-contributions",
);
