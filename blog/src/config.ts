// Production identity is deliberately independent of VERCEL_URL / preview hosts.
export const site = {
  origin: 'https://blog.paryx.uk',
  name: 'paryx — Blog',
  description:
    'Notes on building things. Software, experiments, and lessons from paryx.',
};

export function absoluteUrl(path: string): string {
  return new URL(path, `${site.origin}/`).href;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function isPreview(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.VERCEL_ENV && env.VERCEL_ENV !== 'production');
}
