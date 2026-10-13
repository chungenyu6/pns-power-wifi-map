import { getCollection, type CollectionEntry } from 'astro:content';
import { freshness, type Freshness } from './meta';
import { markerTone } from './status';

export type Shop = CollectionEntry<'shops'>;

export type ShopView = {
  slug: string;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  summary?: string;
  hours?: string;
  wifi: 'yes' | 'no' | 'unknown';
  wifiFree: boolean;
  outlets: 'many' | 'some' | 'few' | 'none' | 'unknown';
  laptop: 'yes' | 'no' | 'unknown';
  noise: 'quiet' | 'moderate' | 'loud' | 'unknown';
  quiet: boolean;
  freshness: Freshness;
  /** Marker tone: has both Wi-Fi and outlets / Wi-Fi only / unknown. */
  tone: 'charge' | 'wifi' | 'unknown';
};

export async function getShops(): Promise<Shop[]> {
  const shops = await getCollection('shops', (s) => s.data.status === 'open');
  // Most useful first: confirmed Wi-Fi + outlets, then Wi-Fi, then the rest; A–Z within.
  return shops.sort((a, b) => score(b) - score(a) || a.data.name.localeCompare(b.data.name));
}

function score(s: Shop): number {
  const d = s.data;
  return (
    (d.wifi.available === 'yes' ? 4 : 0) +
    (['some', 'many'].includes(d.power.outlets) ? 3 : d.power.outlets === 'few' ? 1 : 0) +
    (d.laptop_friendly === 'yes' ? 1 : 0) +
    (d.last_verified ? 1 : 0)
  );
}

export function toView(s: Shop, now = new Date()): ShopView {
  const d = s.data;
  return {
    slug: s.id,
    name: d.name,
    area: d.area,
    address: d.address,
    lat: d.lat,
    lng: d.lng,
    summary: d.summary,
    hours: d.hours,
    wifi: d.wifi.available,
    wifiFree: d.wifi.available === 'yes' && d.wifi.password === 'none',
    outlets: d.power.outlets,
    laptop: d.laptop_friendly,
    noise: d.noise,
    quiet: d.noise === 'quiet',
    freshness: freshness(d.last_verified, now),
    tone: markerTone(d.wifi.available, d.power.outlets),
  };
}

export type SpotView = {
  slug: string;
  name: string;
  host?: string;
  address: string;
  lat: number;
  lng: number;
  details?: string;
  kind: string[];
  posted: string;
  expires: string;
  source: { name: string; url?: string };
};

const SPOT_DEFAULT_DAYS = 3;

/** Temporary relief spots that haven't expired yet. */
export async function getActiveSpots(now = new Date()): Promise<SpotView[]> {
  const spots = await getCollection('spots');
  return spots
    .map((s) => {
      const d = s.data;
      const expires = d.until ?? new Date(d.posted.getTime() + SPOT_DEFAULT_DAYS * 86_400_000);
      return {
        slug: `spot-${s.id}`,
        name: d.name,
        host: d.host,
        address: d.address,
        lat: d.lat,
        lng: d.lng,
        details: d.details,
        kind: d.kind,
        posted: d.posted.toISOString(),
        expires: expires.toISOString(),
        source: d.source,
      };
    })
    .filter((s) => new Date(s.expires) > now)
    .sort((a, b) => b.posted.localeCompare(a.posted));
}
