import { pill, merge, freshBadge, type Attr, type Values } from '../lib/status';
import { timeAgo } from '../lib/reports';
import type { Q, Tallies } from './votes';

// Which vote question feeds which tag.
const VOTE_FOR: Record<Attr, Q> = { wifi: 'wifi', outlets: 'outlets', laptop: 'laptop', noise: 'quiet' };
const OPEN_REPORT_HOURS = 6;

const ROW_TEXT: { [A in Attr]: Partial<Record<Values[A], string>> } = {
  wifi: { yes: 'Yes', no: 'No' },
  outlets: { many: 'Plenty of outlets', some: 'Some outlets', few: 'A few outlets', none: 'No outlets' },
  laptop: { yes: 'Good for working', no: 'Not great for working' },
  noise: { quiet: 'Quiet', moderate: 'Moderate noise', loud: 'Can get loud' },
};

function update(tallies: Tallies) {
  // Amenity pills: our data, filled in by a clear community verdict.
  for (const list of document.querySelectorAll<HTMLElement>('.amenities[data-slug]')) {
    const t = tallies.get(list.dataset.slug!);
    const wifiFree = list.dataset.wifiFree === 'true';
    for (const li of list.querySelectorAll<HTMLElement>('li[data-attr]')) {
      const attr = li.dataset.attr as Attr;
      const value = merge(attr, li.dataset.base as never, t?.[VOTE_FOR[attr]]);
      const p = pill(attr, value as never, { wifiFree });
      li.className = `pill ${p.tone}`.trim();
      li.hidden = p.hidden;
      li.querySelector('.pill-text')!.textContent = p.text;
    }
  }

  // Shop page detail rows say the same thing as the pills.
  for (const row of document.querySelectorAll<HTMLElement>('.row[data-attr]')) {
    const slug = row.closest<HTMLElement>('[data-shop]')?.dataset.shop;
    const attr = row.dataset.attr as Attr;
    const base = row.dataset.base as never;
    const value = merge(attr, base, slug ? tallies.get(slug)?.[VOTE_FOR[attr]] : undefined);
    if (value === base) continue;
    row.classList.remove('unknown');
    row.querySelector('.row-value')!.textContent = `${ROW_TEXT[attr][value as never]} (locals' votes)`;
  }

  // Freshness: the newer of our last check and the latest local vote.
  for (const badge of document.querySelectorAll<HTMLElement>('.fresh[data-slug]')) {
    const t = tallies.get(badge.dataset.slug!);
    const stamps = [badge.dataset.verified ? Date.parse(badge.dataset.verified) : 0];
    for (const q of ['wifi', 'outlets', 'laptop', 'quiet'] as Q[]) stamps.push(t?.[q].last ?? 0);
    const newest = Math.max(...stamps);
    const b = freshBadge(newest ? new Date(newest) : undefined);
    badge.className = `pill fresh ${b.tone}`.trim();
    badge.querySelector('.fresh-text')!.textContent = b.text;
  }

  // Open/closed: a recent local report beats posted hours.
  for (const card of document.querySelectorAll<HTMLElement>('.card[data-slug]')) {
    const open = tallies.get(card.dataset.slug!)?.open;
    const label = card.querySelector<HTMLElement>('.open-state');
    if (!label || !open?.last || Date.now() - open.last > OPEN_REPORT_HOURS * 3_600_000) {
      delete card.dataset.reported;
      continue;
    }
    card.dataset.reported = open.lastUp ? 'open' : 'closed';
    label.textContent = `Reported ${open.lastUp ? 'open' : 'closed'} · ${timeAgo(new Date(open.last).toISOString())}`;
    label.className = `open-state ${open.lastUp ? 'is-open' : 'is-closed'}`;
  }
}

export function applyCommunity() {
  document.addEventListener('votes:changed', (e) => update((e as CustomEvent<Tallies>).detail));
}
