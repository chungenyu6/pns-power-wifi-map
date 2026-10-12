import { getCollection, type CollectionEntry } from 'astro:content';
import { freshness, type Freshness } from './meta';

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
  const hasOutlets = ['some', 'many'].includes(d.power.outlets);
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
    quiet: d.noise === 'quiet',
    freshness: freshness(d.last_verified, now),
    tone: d.wifi.available === 'yes' && hasOutlets ? 'charge' : d.wifi.available === 'yes' ? 'wifi' : 'unknown',
  };
}
