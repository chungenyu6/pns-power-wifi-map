// Community reports stored in Supabase (see supabase/schema.sql + migrations). Browser-only.
// The publishable key is meant to be public; row-level security decides what visitors can do.

const SUPABASE_URL = 'https://isncpzrcsohfolpsxmgm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wy_qR1FWdTWzkFTHb50ntw_m4queuCV';
const REST = `${SUPABASE_URL}/rest/v1`;
const BASE_COLUMNS = 'id,created_at,shop_slug,is_open,wifi_works,outlets,wifi_password,comment';
const VOTE_COLUMNS = 'laptop_ok,quiet';

export type Report = {
  id: number;
  created_at: string;
  shop_slug: string;
  is_open: boolean | null;
  wifi_works: boolean | null;
  outlets: 'plenty' | 'some' | 'none' | null;
  laptop_ok?: boolean | null;
  quiet?: boolean | null;
  wifi_password: string | null;
  comment: string | null;
};

export type NewReport = Partial<
  Pick<Report, 'is_open' | 'wifi_works' | 'outlets' | 'laptop_ok' | 'quiet' | 'wifi_password' | 'comment'>
> & { shop_slug: string };

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

// Until migration 002 runs, the laptop/quiet/client_token columns don't exist. Remember that and degrade.
let hasVoteColumns = true;
const missingColumn = (body: { code?: string; message?: string }) =>
  body.code === 'PGRST204' || body.code === '42703' || /column/i.test(body.message ?? '');

async function get(query: string): Promise<Report[]> {
  const run = (cols: string) => fetch(`${REST}/reports?select=${cols}&${query}`, { headers });
  // Decide per request (not from the shared flag) so parallel requests each retry correctly.
  const triedVoteColumns = hasVoteColumns;
  let res = await run(triedVoteColumns ? `${BASE_COLUMNS},${VOTE_COLUMNS}` : BASE_COLUMNS);
  if (!res.ok && triedVoteColumns && missingColumn(await res.clone().json().catch(() => ({})))) {
    hasVoteColumns = false;
    res = await run(BASE_COLUMNS);
  }
  if (!res.ok) throw new Error(`Reports unavailable (${res.status})`);
  return res.json();
}

export function reportsForShop(slug: string): Promise<Report[]> {
  return get(`shop_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=200`);
}

export function recentReports(hours = 48): Promise<Report[]> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  return get(`created_at=gte.${since}&order=created_at.desc&limit=2000`);
}

const SEND_FAILED = 'Could not send. Try again in a moment.';

// fetch() rejects with a bare "Failed to fetch" when offline; show people something readable instead.
async function post(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, method: 'POST' });
  } catch {
    throw new Error(SEND_FAILED);
  }
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.message?.includes('Too many') ? body.message : SEND_FAILED;
}

/** Tips, passwords and new-shop suggestions (reviewed before they show up). */
export async function submitReport(report: NewReport): Promise<void> {
  const res = await post(`${REST}/reports`, {
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
}

export type VoteReceipt = { id: number; token: string } | null;

/** A one-tap vote. Returns a receipt that lets this browser take the vote back later. */
export async function submitVote(report: NewReport): Promise<VoteReceipt> {
  const token = crypto.randomUUID();
  const send = (body: object) =>
    post(`${REST}/reports?select=id`, {
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
  const withToken = hasVoteColumns;
  let res = withToken ? await send({ ...report, client_token: token }) : await send(report);
  let tokenSaved = withToken;
  if (!res.ok && withToken && missingColumn(await res.clone().json().catch(() => ({})))) {
    hasVoteColumns = false;
    if ('laptop_ok' in report || 'quiet' in report) throw new Error('Not available yet');
    res = await send(report);
    tokenSaved = false;
  }
  if (!res.ok) throw new Error(await errorMessage(res));
  const [row] = (await res.json()) as { id: number }[];
  return tokenSaved && row ? { id: row.id, token } : null;
}

export async function retractVote(receipt: NonNullable<VoteReceipt>): Promise<boolean> {
  const res = await fetch(`${REST}/rpc/retract_vote`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_id: receipt.id, p_token: receipt.token }),
  });
  return res.ok && (await res.json()) === true;
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

/** Short status line, e.g. "Open · Wi-Fi works · Outlets". */
export function describe(r: Pick<Report, 'is_open' | 'wifi_works' | 'outlets'>): string {
  const parts: string[] = [];
  if (r.is_open !== null) parts.push(r.is_open ? 'Open' : 'Closed');
  if (r.wifi_works !== null) parts.push(r.wifi_works ? 'Wi-Fi works' : 'Wi-Fi down');
  if (r.outlets) parts.push({ plenty: 'Plenty of outlets', some: 'Outlets', none: 'No outlets' }[r.outlets]);
  return parts.join(' · ');
}
