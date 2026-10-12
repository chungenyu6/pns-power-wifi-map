// Seeds data/shops/*.yaml from OpenStreetMap coffee shops in the Pensacola area.
// Never overwrites an existing file: hand-edited data always wins.
// Usage: npm run fetch-osm [-- --dry-run]

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { isValidHours } from '../src/lib/hours.ts';
import { BOUNDS, type Area } from '../src/lib/meta.ts';

const DATA_DIR = 'data/shops';
const EXCLUDE_FILE = 'scripts/osm-exclude.txt';
const dryRun = process.argv.includes('--dry-run');
const today = new Date().toISOString().slice(0, 10);

const CHAINS = /starbucks|dunkin|dutch bros|seven brew|7 brew|scooter's|panera|bad ass coffee|biggby/i;

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
};

function areaFor(lat: number, lng: number): Area {
  if (lat < 30.34 && lng < -87.36) return 'perdido-key';
  if (lat < 30.345 && lng > -87.25) return 'pensacola-beach';
  if (lat < 30.4 && lng > -87.19) return 'gulf-breeze';
  if (lat >= 30.4 && lat < 30.422 && lng > -87.235 && lng < -87.195) return 'downtown';
  if (lat >= 30.422 && lat < 30.45 && lng >= -87.21 && lng < -87.17) return 'east-hill';
  if (lat >= 30.422 && lat < 30.44 && lng > -87.235 && lng < -87.21) return 'north-hill';
  if (lat >= 30.49) return lng > -87.26 ? 'university' : 'northwest';
  if (lat >= 30.44 && lng > -87.25) return 'midtown';
  return 'westside';
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeHours(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const h = raw
    .replace(/,\s*(?=(Mo|Tu|We|Th|Fr|Sa|Su)\b)/g, '; ')
    .replace(/\bclosed\b/g, 'off')
    .trim();
  return isValidHours(h) ? h : undefined;
}

function url(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const withScheme = /^https?:\/\//.test(v) ? v : `https://${v}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return undefined;
  }
}

function socialUrl(v: string | undefined, host: string): string | undefined {
  if (!v) return undefined;
  if (/^https?:\/\//.test(v) || v.includes('.com')) return url(v);
  return `https://www.${host}/${v.replace(/^@/, '')}`;
}

function address(t: Record<string, string>): string | undefined {
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
  if (!street) return undefined;
  return `${street}, ${t['addr:city'] ?? 'Pensacola'}, FL${t['addr:postcode'] ? ` ${t['addr:postcode']}` : ''}`;
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Public Overpass servers are often busy; try each mirror a couple of times.
async function overpass(query: string): Promise<{ elements: OsmElement[] }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': '850-sip-charge-map (github.com/chungenyu6/pns-power-wifi-map)' },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(90_000),
        });
        if (res.ok) return await res.json();
        lastError = new Error(`${endpoint} → HTTP ${res.status}`);
      } catch (err) {
        lastError = err;
      }
      console.warn(`Overpass attempt failed: ${String(lastError)}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw lastError;
}

async function main() {
  const { south, west, north, east } = BOUNDS;
  const bbox = `${south},${west},${north},${east}`;
  const query = `[out:json][timeout:60];(nwr["amenity"="cafe"](${bbox});nwr["shop"="coffee"](${bbox}););out tags center;`;
  const { elements } = await overpass(query);

  const excluded = new Set(
    existsSync(EXCLUDE_FILE)
      ? readFileSync(EXCLUDE_FILE, 'utf8')
          .split('\n')
          .map((l) => l.replace(/#.*/, '').trim())
          .filter(Boolean)
      : [],
  );

  const counts = { created: 0, existing: 0, excluded: 0, skipped: 0 };
  const usedSlugs = new Set<string>();

  for (const el of elements) {
    const t = el.tags;
    const osmId = `${el.type}/${el.id}`;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (excluded.has(osmId)) {
      counts.excluded++;
      continue;
    }
    if (!t.name || lat === undefined || lng === undefined || t.disused === 'yes') {
      counts.skipped++;
      continue;
    }

    const street = t['addr:street'];
    let slug = slugify(t.name);
    if (CHAINS.test(t.name) || usedSlugs.has(slug)) {
      slug = slugify(`${t.name} ${street ?? areaFor(lat, lng)}`);
    }
    if (usedSlugs.has(slug)) slug = slugify(`${slug} ${t['addr:housenumber'] ?? el.id}`);
    usedSlugs.add(slug);
    const file = join(DATA_DIR, `${slug}.yaml`);
    if (existsSync(file)) {
      counts.existing++;
      continue;
    }

    const wifi = t.internet_access;
    const shop = {
      name: t.name,
      chain: CHAINS.test(t.name) || undefined,
      area: areaFor(lat, lng),
      address: address(t) ?? `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      wifi:
        wifi === 'wlan' || wifi === 'yes'
          ? { available: 'yes', password: t['internet_access:fee'] === 'no' ? 'none' : 'unknown' }
          : wifi === 'no'
            ? { available: 'no' }
            : undefined,
      hours: normalizeHours(t.opening_hours),
      links: {
        website: url(t.website ?? t['contact:website']),
        instagram: socialUrl(t['contact:instagram'], 'instagram.com'),
        facebook: socialUrl(t['contact:facebook'], 'facebook.com'),
      },
      sources: [{ type: 'osm', date: today, url: `https://www.openstreetmap.org/${osmId}` }],
    };

    const yaml = stringify(JSON.parse(JSON.stringify(shop)), { lineWidth: 0 });
    console.log(`${dryRun ? '[dry-run] ' : ''}+ ${file}  (${osmId})`);
    if (!dryRun) writeFileSync(file, `# Seeded from OpenStreetMap ${osmId}\n${yaml}`);
    counts.created++;
  }

  console.log(`\n${elements.length} OSM elements →`, counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
