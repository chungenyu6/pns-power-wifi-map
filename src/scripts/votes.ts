import { recentReports, submitReport, type NewReport, type Report } from '../lib/reports';

type Q = 'wifi' | 'outlets' | 'open';
type Tally = { up: number; down: number };

const WINDOW_DAYS: Record<Q, number> = { wifi: 30, outlets: 30, open: 0.25 }; // "open" only counts the last 6 hours
const REVOTE_HOURS = 12;

function voteOf(r: Report, q: Q): boolean | null {
  if (q === 'wifi') return r.wifi_works;
  if (q === 'open') return r.is_open;
  return r.outlets === null ? null : r.outlets !== 'none';
}

function toReport(slug: string, q: Q, up: boolean): NewReport {
  if (q === 'wifi') return { shop_slug: slug, wifi_works: up };
  if (q === 'open') return { shop_slug: slug, is_open: up };
  return { shop_slug: slug, outlets: up ? 'some' : 'none' };
}

const storageKey = (slug: string, q: Q) => `vote:${slug}:${q}`;

function myVote(slug: string, q: Q): 'up' | 'down' | null {
  try {
    const raw = localStorage.getItem(storageKey(slug, q));
    if (!raw) return null;
    const { v, at } = JSON.parse(raw);
    return Date.now() - at < REVOTE_HOURS * 3_600_000 ? v : null;
  } catch {
    return null;
  }
}

function remember(slug: string, q: Q, v: 'up' | 'down') {
  try {
    localStorage.setItem(storageKey(slug, q), JSON.stringify({ v, at: Date.now() }));
  } catch {}
}

export function tally(reports: Report[], now = Date.now()) {
  const out = new Map<string, Record<Q, Tally>>();
  for (const r of reports) {
    const age = (now - new Date(r.created_at).getTime()) / 86_400_000;
    for (const q of ['wifi', 'outlets', 'open'] as Q[]) {
      const v = voteOf(r, q);
      if (v === null || age > WINDOW_DAYS[q]) continue;
      if (!out.has(r.shop_slug)) out.set(r.shop_slug, { wifi: { up: 0, down: 0 }, outlets: { up: 0, down: 0 }, open: { up: 0, down: 0 } });
      out.get(r.shop_slug)![q][v ? 'up' : 'down']++;
    }
  }
  return out;
}

export async function initVotes() {
  const groups = [...document.querySelectorAll<HTMLElement>('.votes[data-slug]')];
  if (groups.length === 0) return;

  const paint = (el: HTMLElement, t: Tally | undefined, mine: 'up' | 'down' | null) => {
    for (const v of ['up', 'down'] as const) {
      const btn = el.querySelector<HTMLButtonElement>(`button[data-v="${v}"]`)!;
      btn.querySelector('b')!.textContent = String(t?.[v] ?? 0);
      btn.setAttribute('aria-pressed', String(mine === v));
    }
  };

  let tallies = new Map<string, Record<Q, Tally>>();
  try {
    tallies = tally(await recentReports(WINDOW_DAYS.wifi * 24));
  } catch {
    // Counts stay at 0; voting still works if the server comes back.
  }

  for (const group of groups) {
    const slug = group.dataset.slug!;
    for (const el of group.querySelectorAll<HTMLElement>('.vote')) {
      const q = el.dataset.q as Q;
      const t = tallies.get(slug)?.[q] ?? { up: 0, down: 0 };
      paint(el, t, myVote(slug, q));

      el.addEventListener('click', async (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-v]');
        if (!btn) return;
        const v = btn.dataset.v as 'up' | 'down';
        const prev = myVote(slug, q);
        if (prev === v) return;
        // Optimistic: move my vote, then send.
        if (prev) t[prev] = Math.max(0, t[prev] - 1);
        t[v]++;
        remember(slug, q, v);
        paint(el, t, v);
        try {
          await submitReport(toReport(slug, q, v === 'up'));
          document.dispatchEvent(new CustomEvent('vote:sent', { detail: { slug, q, v } }));
        } catch {
          t[v]--;
          if (prev) t[prev]++;
          try {
            localStorage.removeItem(storageKey(slug, q));
          } catch {}
          paint(el, t, prev);
        }
      });
    }
  }
}
