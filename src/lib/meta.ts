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
export const STALE_DAYS = 90;

export type Freshness = 'fresh' | 'aging' | 'stale' | 'unverified';

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: 'Verified',
  aging: 'Getting old',
  stale: 'Needs a check',
  unverified: 'Unverified',
};

export function freshness(lastVerified: Date | undefined, now = new Date()): Freshness {
  if (!lastVerified) return 'unverified';
  const days = (now.getTime() - lastVerified.getTime()) / 86_400_000;
  if (days <= FRESH_DAYS) return 'fresh';
  if (days <= STALE_DAYS) return 'aging';
  return 'stale';
}

export function daysAgo(date: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} months ago`;
}

export const BOUNDS = { south: 30.27, west: -87.52, north: 30.6, east: -87.05 } as const;
