// One vocabulary for every tag on the site. Used at build time (Astro) and in the browser
// (after community votes load), so a pill always looks the same wherever it appears.

import { daysAgo, freshness, type Freshness } from './meta';

export type Attr = 'wifi' | 'outlets' | 'laptop' | 'noise';
export type Tone = 'good' | 'warn' | 'bad' | '';
export type Pill = { tone: Tone; text: string; hidden: boolean };

/** Values per attribute, as stored in shop YAML. */
export type Values = {
  wifi: 'yes' | 'no' | 'unknown';
  outlets: 'many' | 'some' | 'few' | 'none' | 'unknown';
  laptop: 'yes' | 'no' | 'unknown';
  noise: 'quiet' | 'moderate' | 'loud' | 'unknown';
};

export function pill<A extends Attr>(attr: A, value: Values[A], opts: { wifiFree?: boolean } = {}): Pill {
  const p = (tone: Tone, text: string, hidden = false): Pill => ({ tone, text, hidden });
  switch (attr) {
    case 'wifi':
      return value === 'yes' ? p('good', opts.wifiFree ? 'Free Wi-Fi' : 'Wi-Fi') : value === 'no' ? p('bad', 'Wi-Fi') : p('', 'Wi-Fi?');
    case 'outlets':
      return value === 'many'
        ? p('good', 'Plenty of outlets')
        : value === 'some'
          ? p('good', 'Outlets')
          : value === 'few'
            ? p('warn', 'Few outlets')
            : value === 'none'
              ? p('bad', 'Outlets')
              : p('', 'Outlets?');
    // Secondary attributes only show once we know something, to keep cards calm.
    case 'laptop':
      return value === 'yes' ? p('good', 'Good for working') : value === 'no' ? p('bad', 'Good for working') : p('', '', true);
    case 'noise':
      return value === 'quiet' ? p('good', 'Quiet') : value === 'loud' ? p('warn', 'Can get loud') : p('', '', true);
  }
  throw new Error(`Unknown attribute ${attr}`);
}

export type Votes = { up: number; down: number };

/** Locals agree when there are at least 2 votes and one side wins. */
export function verdict(t?: Votes): 'yes' | 'no' | null {
  if (!t) return null;
  if (t.up >= 2 && t.up > t.down) return 'yes';
  if (t.down >= 2 && t.down > t.up) return 'no';
  return null;
}

/** Our data wins when we have it; otherwise a clear community verdict fills the gap. */
export function merge<A extends Attr>(attr: A, base: Values[A], votes?: Votes): Values[A] {
  if (base !== 'unknown') return base;
  const v = verdict(votes);
  if (!v) return base;
  const map: { [K in Attr]: Record<'yes' | 'no', Values[K]> } = {
    wifi: { yes: 'yes', no: 'no' },
    outlets: { yes: 'some', no: 'none' },
    laptop: { yes: 'yes', no: 'no' },
    noise: { yes: 'quiet', no: 'loud' },
  };
  return map[attr][v] as Values[A];
}

export const FRESH_TONE: Record<Freshness, Tone> = { recent: 'good', old: 'warn', unverified: '' };

export function freshBadge(verified: Date | undefined, now = new Date()): { tone: Tone; text: string } {
  return {
    tone: FRESH_TONE[freshness(verified, now)],
    text: verified ? `Confirmed ${daysAgo(verified, now)}` : 'Not confirmed yet',
  };
}

export type MarkerTone = 'charge' | 'wifi' | 'unknown';

/** Map marker color: Wi-Fi + outlets / Wi-Fi only / not confirmed. */
export function markerTone(wifi: Values['wifi'], outlets: Values['outlets']): MarkerTone {
  if (wifi !== 'yes') return 'unknown';
  return outlets === 'some' || outlets === 'many' ? 'charge' : 'wifi';
}
