// Review community tips, Wi-Fi passwords and new-shop suggestions.
//
//   npm run reports                    list pending items + recent vote activity
//   npm run reports -- approve 12 13   publish
//   npm run reports -- reject 14       hide for good
//
// Needs SUPABASE_SECRET_KEY in .env (see .env.example). The secret key bypasses row-level security,
// so it stays on this machine and in GitHub Secrets only.

const url = process.env.SUPABASE_URL ?? 'https://isncpzrcsohfolpsxmgm.supabase.co';
const key = process.env.SUPABASE_SECRET_KEY;
if (!key) {
  console.error('Missing SUPABASE_SECRET_KEY. Copy .env.example to .env and paste the secret key.');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

type Row = {
  id: number;
  created_at: string;
  shop_slug: string;
  status: string;
  is_open: boolean | null;
  wifi_works: boolean | null;
  outlets: string | null;
  laptop_ok?: boolean | null;
  quiet?: boolean | null;
  wifi_password: string | null;
  comment: string | null;
};

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const yn = (v: boolean | null | undefined, yes: string, no: string) => (v === true ? yes : v === false ? no : null);

async function list() {
  const pending = (await api('reports?status=eq.pending&order=created_at.asc&limit=200')) as Row[];
  console.log(`\n${pending.length} pending\n`);
  for (const r of pending) {
    const extras = [
      yn(r.wifi_works, 'wifi:yes', 'wifi:no'),
      r.outlets && `outlets:${r.outlets}`,
      yn(r.is_open, 'open', 'closed'),
    ].filter(Boolean);
    console.log(`#${r.id}  ${when(r.created_at)}  [${r.shop_slug}]${extras.length ? '  ' + extras.join(' ') : ''}`);
    if (r.wifi_password) console.log(`     password: ${r.wifi_password}`);
    if (r.comment) console.log(r.comment.split('\n').map((l) => `     ${l}`).join('\n'));
    console.log();
  }

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const votes = (await api(`reports?status=eq.approved&created_at=gte.${since}&limit=5000`)) as Row[];
  const byShop = new Map<string, Record<string, [number, number]>>();
  for (const r of votes) {
    const s = byShop.get(r.shop_slug) ?? {};
    const add = (k: string, v: boolean | null | undefined) => {
      if (v === null || v === undefined) return;
      s[k] ??= [0, 0];
      s[k][v ? 0 : 1]++;
    };
    add('wifi', r.wifi_works);
    add('outlets', r.outlets === null ? null : r.outlets !== 'none');
    add('open', r.is_open);
    add('working', r.laptop_ok);
    add('quiet', r.quiet);
    byShop.set(r.shop_slug, s);
  }
  if (byShop.size) {
    console.log('Votes in the last 7 days (👍/👎):');
    for (const [slug, s] of [...byShop].sort()) {
      console.log(`  ${slug.padEnd(42)} ${Object.entries(s).map(([k, [u, d]]) => `${k} ${u}/${d}`).join('  ')}`);
    }
  }
}

async function setStatus(status: 'approved' | 'rejected', ids: string[]) {
  const nums = ids.map(Number).filter(Number.isInteger);
  if (!nums.length) throw new Error('Give one or more report ids, e.g. npm run reports -- approve 12 13');
  await api(`reports?id=in.(${nums.join(',')})`, { method: 'PATCH', body: JSON.stringify({ status }), headers: { Prefer: 'return=minimal' } });
  console.log(`${status}: ${nums.map((n) => '#' + n).join(' ')}`);
}

const [cmd, ...args] = process.argv.slice(2);
const run = cmd === 'approve' ? setStatus('approved', args) : cmd === 'reject' ? setStatus('rejected', args) : list();
run.catch((err) => {
  console.error(err.message);
  process.exit(1);
});
