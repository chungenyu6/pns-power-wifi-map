import { isOpenAt, nowInPensacola, parseHours, type Week } from '../lib/hours';
import type { MapApi } from './map';
import { localsSayYes, type Tallies } from './votes';

type Filter = 'wifi' | 'outlets' | 'open' | 'laptop' | 'quiet';

export function initFilters(map: MapApi) {
  const cards = [...document.querySelectorAll<HTMLElement>('.card')];
  const search = document.querySelector<HTMLInputElement>('#q')!;
  const area = document.querySelector<HTMLSelectElement>('#area')!;
  const count = document.querySelector('#count')!;
  const empty = document.querySelector<HTMLElement>('#empty')!;
  const active = new Set<Filter>();

  const weeks = new Map<HTMLElement, Week | null>(
    cards.map((c) => [c, c.dataset.hours ? parseHours(c.dataset.hours) : null]),
  );
  const openNow = new Map<HTMLElement, boolean>();

  function refreshOpenState() {
    const { day, minute } = nowInPensacola();
    for (const card of cards) {
      const week = weeks.get(card);
      const label = card.querySelector('.open-state')!;
      const open = week ? isOpenAt(week, day, minute) : false;
      openNow.set(card, open);
      if (card.dataset.reported) continue; // a fresh local report owns the label
      label.textContent = week ? (open ? 'Open now' : 'Closed') : '';
      label.className = `open-state ${week ? (open ? 'is-open' : 'is-closed') : ''}`;
    }
  }

  // Filters count both our data and what locals vote.
  const voted = new Map<HTMLElement, { wifi: boolean; outlets: boolean; laptop: boolean; quiet: boolean }>();
  document.addEventListener('votes:changed', (e) => {
    const tallies = (e as CustomEvent<Tallies>).detail;
    for (const card of cards) {
      const t = tallies.get(card.dataset.slug!);
      voted.set(card, {
        wifi: localsSayYes(t?.wifi),
        outlets: localsSayYes(t?.outlets),
        laptop: localsSayYes(t?.laptop),
        quiet: localsSayYes(t?.quiet),
      });
    }
    if (active.size > 0) apply();
  });

  const tests: Record<Filter, (c: HTMLElement) => boolean> = {
    wifi: (c) => c.dataset.wifi === 'yes' || !!voted.get(c)?.wifi,
    outlets: (c) => ['some', 'many', 'few'].includes(c.dataset.outlets!) || !!voted.get(c)?.outlets,
    open: (c) => (c.dataset.reported ? c.dataset.reported === 'open' : openNow.get(c) === true),
    laptop: (c) => c.dataset.laptop === 'yes' || !!voted.get(c)?.laptop,
    quiet: (c) => c.dataset.quiet === 'true' || !!voted.get(c)?.quiet,
  };

  function apply() {
    const q = search.value.trim().toLowerCase();
    const visible = new Set<string>();
    for (const card of cards) {
      const show =
        (!q || card.dataset.name!.includes(q)) &&
        (!area.value || card.dataset.area === area.value) &&
        [...active].every((f) => tests[f](card));
      card.hidden = !show;
      if (show) visible.add(card.dataset.slug!);
    }
    count.textContent = String(visible.size);
    empty.hidden = visible.size > 0;
    map.show(visible);
  }

  document.querySelectorAll<HTMLButtonElement>('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter as Filter;
      const on = !active.has(f);
      on ? active.add(f) : active.delete(f);
      chip.setAttribute('aria-pressed', String(on));
      apply();
    });
  });
  search.addEventListener('input', apply);
  area.addEventListener('change', apply);

  for (const card of cards) {
    card.querySelector('.locate')!.addEventListener('click', () => map.focus(card.dataset.slug!));
  }

  refreshOpenState();
  setInterval(() => {
    refreshOpenState();
    if (active.has('open')) apply();
  }, 60_000);
}
