// Community reports stored in Supabase (see supabase/schema.sql). Browser-only.
// The publishable key is meant to be public; row-level security decides what visitors can do.

const SUPABASE_URL = 'https://isncpzrcsohfolpsxmgm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wy_qR1FWdTWzkFTHb50ntw_m4queuCV';
const ENDPOINT = `${SUPABASE_URL}/rest/v1/reports`;
const COLUMNS = 'id,created_at,shop_slug,is_open,wifi_works,outlets,wifi_password,comment';

export type Report = {
  id: number;
  created_at: string;
  shop_slug: string;
  is_open: boolean | null;
  wifi_works: boolean | null;
  outlets: 'plenty' | 'some' | 'none' | null;
  wifi_password: string | null;
  comment: string | null;
};

export type NewReport = Partial<Pick<Report, 'is_open' | 'wifi_works' | 'outlets' | 'wifi_password' | 'comment'>> & {
  shop_slug: string;
};

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function get(query: string): Promise<Report[]> {
  const res = await fetch(`${ENDPOINT}?select=${COLUMNS}&${query}`, { headers });
  if (!res.ok) throw new Error(`Reports unavailable (${res.status})`);
  return res.json();
}

export function reportsForShop(slug: string): Promise<Report[]> {
  return get(`shop_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=30`);
}

export function recentReports(hours = 48): Promise<Report[]> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  return get(`created_at=gte.${since}&order=created_at.desc&limit=500`);
}

export async function submitReport(report: NewReport): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(report),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message?.includes('Too many') ? body.message : 'Could not send. Try again in a moment.');
  }
}

export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/** Short status line, e.g. "Open · Wi-Fi works · Plenty of outlets". */
export function describe(r: Pick<Report, 'is_open' | 'wifi_works' | 'outlets'>): string {
  const parts: string[] = [];
  if (r.is_open !== null) parts.push(r.is_open ? 'Open' : 'Closed');
  if (r.wifi_works !== null) parts.push(r.wifi_works ? 'Wi-Fi works' : 'Wi-Fi down');
  if (r.outlets) parts.push({ plenty: 'Plenty of outlets', some: 'Some outlets', none: 'No outlets' }[r.outlets]);
  return parts.join(' · ');
}
