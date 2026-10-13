// Shared enums and labels for shop data. Keep in sync with docs/PLAN.md §6.

export const AREAS = {
  downtown: 'Downtown',
  'east-hill': 'East Hill',
  'north-hill': 'North Hill',
  midtown: 'Midtown & Cordova',
  university: 'University & Nine Mile',
  northwest: 'Northwest & Pine Forest',
  westside: 'Westside & Warrington',
  'perdido-key': 'Perdido Key',
  'pensacola-beach': 'Pensacola Beach',
  'gulf-breeze': 'Gulf Breeze',
} as const;
export type Area = keyof typeof AREAS;

export const WIFI_PASSWORD = {
  none: 'No password',
  'ask-staff': 'Ask staff for password',
  'on-receipt': 'Password on receipt',
  posted: 'Password posted in store',
  unknown: 'Password unknown',
} as const;

export const OUTLETS = {
  many: 'Plenty of outlets',
  some: 'Some outlets',
  few: 'A few outlets',
  none: 'No outlets',
  unknown: 'Outlets unknown',
} as const;

export const NOISE = {
  quiet: 'Quiet',
  moderate: 'Moderate noise',
  loud: 'Can get loud',
  unknown: 'Noise unknown',
} as const;

export const SOURCE_TYPES = {
  osm: 'OpenStreetMap',
  'official-site': 'Shop website',
  web: 'Web listing / reviews',
  'facebook-group': 'Local Facebook group',
  'site-report': 'Report on this site',
  visit: 'In-person visit',
} as const;

export const FRESH_DAYS = 30;

/** recent: a local confirmed it in the last 30 days · old: confirmed, but longer ago · unverified: never. */
export type Freshness = 'recent' | 'old' | 'unverified';

// Dates in our YAML are calendar days (parsed as UTC midnight). Compare them with today's
// calendar day in Pensacola so "2026-10-12" reads as "today" all day on Oct 12, Central Time.
const DAY = 86_400_000;
const pensacolaToday = (now: Date) =>
  Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(now));

export function calendarDaysSince(date: Date, now = new Date()): number {
  return Math.round((pensacolaToday(now) - Date.parse(date.toISOString().slice(0, 10))) / DAY);
}

export function freshness(lastVerified: Date | undefined, now = new Date()): Freshness {
  if (!lastVerified) return 'unverified';
  return calendarDaysSince(lastVerified, now) <= FRESH_DAYS ? 'recent' : 'old';
}

export function daysAgo(date: Date, now = new Date()): string {
  const days = calendarDaysSince(date, now);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  return `${Math.round(days / 30)} months ago`;
}

export const BOUNDS = { south: 30.27, west: -87.52, north: 30.6, east: -87.05 } as const;
