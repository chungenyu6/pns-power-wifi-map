import { recentReports, retractVote, submitVote, type NewReport, type Report, type VoteReceipt } from '../lib/reports';
import { verdict } from '../lib/status';

export type Q = 'wifi' | 'outlets' | 'open' | 'laptop' | 'quiet';
/** `last`: time of the newest vote (ms); `lastUp`: what that newest vote said. */
export type Tally = { up: number; down: number; last?: number; lastUp?: boolean };
export type Tallies = Map<string, Record<Q, Tally>>;
type Mine = { v: 'up' | 'down'; at: number; receipt: VoteReceipt };

const QUESTIONS: Q[] = ['wifi', 'outlets', 'open', 'laptop', 'quiet'];
// How far back each question counts. "Open right now" only means anything for a few hours.
const WINDOW_DAYS: Record<Q, number> = { wifi: 30, outlets: 30, laptop: 30, quiet: 30, open: 0.25 };
const REMEMBER_HOURS = 12;

function voteOf(r: Report, q: Q): boolean | null {
  switch (q) {
    case 'wifi':
      return r.wifi_works;
    case 'open':
      return r.is_open;
    case 'outlets':
      return r.outlets === null ? null : r.outlets !== 'none';
    case 'laptop':
      return r.laptop_ok ?? null;
    case 'quiet':
      return r.quiet ?? null;
  }
}

function toReport(slug: string, q: Q, up: boolean): NewReport {
  switch (q) {
    case 'wifi':
      return { shop_slug: slug, wifi_works: up };
    case 'open':
      return { shop_slug: slug, is_open: up };
    case 'outlets':
      return { shop_slug: slug, outlets: up ? 'some' : 'none' };
    case 'laptop':
      return { shop_slug: slug, laptop_ok: up };
    case 'quiet':
      return { shop_slug: slug, quiet: up };
  }
}

const key = (slug: string, q: Q) => `vote:${slug}:${q}`;

function loadMine(slug: string, q: Q): Mine | null {
  try {
    const raw = localStorage.getItem(key(slug, q));
    if (!raw) return null;
    const mine = JSON.parse(raw) as Mine;
    return Date.now() - mine.at < REMEMBER_HOURS * 3_600_000 ? mine : null;
  } catch {
    return null;
  }
}

function saveMine(slug: string, q: Q, mine: Mine | null) {
  try {
    if (mine) localStorage.setItem(key(slug, q), JSON.stringify(mine));
    else localStorage.removeItem(key(slug, q));
  } catch {}
}

const empty = (): Record<Q, Tally> =>
  Object.fromEntries(QUESTIONS.map((q) => [q, { up: 0, down: 0 }])) as Record<Q, Tally>;

export function tally(reports: Report[], now = Date.now()): Tallies {
  const out: Tallies = new Map();
  for (const r of reports) {
    const ageDays = (now - new Date(r.created_at).getTime()) / 86_400_000;
    for (const q of QUESTIONS) {
      const v = voteOf(r, q);
      if (v === null || ageDays > WINDOW_DAYS[q]) continue;
      if (!out.has(r.shop_slug)) out.set(r.shop_slug, empty());
      const t = out.get(r.shop_slug)![q];
      t[v ? 'up' : 'down']++;
      const at = new Date(r.created_at).getTime();
      if (!t.last || at > t.last) {
        t.last = at;
        t.lastUp = v;
      }
    }
  }
  return out;
}

/** Locals agree: at least 2 votes and more yes than no. */
export const localsSayYes = (t?: Tally) => verdict(t) === 'yes';

/** Latest tallies, for code that loads after votes (e.g. the map). */
export let latestTallies: Tallies | null = null;
document.addEventListener('votes:changed', (e) => {
  latestTallies = (e as CustomEvent<Tallies>).detail;
});

export async function initVotes(): Promise<Tallies> {
  const groups = [...document.querySelectorAll<HTMLElement>('.votes[data-slug]')];
  let tallies: Tallies = new Map();
  try {
    tallies = tally(await recentReports(30 * 24));
  } catch {
    // Counts stay at 0; voting still works if the server comes back.
  }

  for (const group of groups) {
    const slug = group.dataset.slug!;
    if (!tallies.has(slug)) tallies.set(slug, empty());
    const counts = tallies.get(slug)!;

    for (const el of group.querySelectorAll<HTMLElement>('.vote')) {
      const q = el.dataset.q as Q;
      const t = counts[q];
      const paint = (mine: Mine | null) => {
        for (const v of ['up', 'down'] as const) {
          const btn = el.querySelector<HTMLButtonElement>(`button[data-v="${v}"]`)!;
          btn.querySelector('b')!.textContent = String(t[v]);
          btn.setAttribute('aria-pressed', String(mine?.v === v));
        }
      };
      paint(loadMine(slug, q));

      let busy = false;
      el.addEventListener('click', async (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-v]');
        if (!btn || busy) return;
        busy = true;
        const v = btn.dataset.v as 'up' | 'down';
        const prev = loadMine(slug, q);
        const cancelling = prev?.v === v;
        const before = { last: t.last, lastUp: t.lastUp };

        // Optimistic update first, so the tap feels instant.
        if (prev) t[prev.v] = Math.max(0, t[prev.v] - 1);
        if (!cancelling) {
          t[v]++;
          t.last = Date.now();
          t.lastUp = v === 'up';
        }
        paint(cancelling ? null : { v, at: Date.now(), receipt: null });

        try {
          if (prev?.receipt) await retractVote(prev.receipt);
          if (cancelling) {
            saveMine(slug, q, null);
          } else {
            const receipt = await submitVote(toReport(slug, q, v === 'up'));
            saveMine(slug, q, { v, at: Date.now(), receipt });
          }
        } catch {
          // Put things back the way they were.
          if (!cancelling) t[v] = Math.max(0, t[v] - 1);
          if (prev) t[prev.v]++;
          Object.assign(t, before);
          paint(prev);
          el.classList.add('failed');
          setTimeout(() => el.classList.remove('failed'), 4000);
        } finally {
          busy = false;
          document.dispatchEvent(new CustomEvent('votes:changed', { detail: tallies }));
        }
      });
    }
  }

  document.dispatchEvent(new CustomEvent('votes:changed', { detail: tallies }));
  return tallies;
}
