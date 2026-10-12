// Tiny parser for the subset of OpenStreetMap `opening_hours` syntax we store,
// e.g. "Mo-Fr 07:00-17:00; Sa 08:00-12:00,13:00-15:00; Su off" or "24/7".
// Shared by the build (schema validation, display) and the browser ("Open now").

export const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Minutes after midnight; `end` may exceed 1440 for ranges past midnight. */
export type Range = [start: number, end: number];
/** Index 0 = Monday. */
export type Week = Range[][];

const TIME = /^([01]?\d|2[0-4]):([0-5]\d)$/;

function parseTime(t: string): number {
  const m = TIME.exec(t);
  if (!m) throw new Error(`Bad time "${t}"`);
  return Number(m[1]) * 60 + Number(m[2]);
}

function parseDays(spec: string): number[] {
  const out = new Set<number>();
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-');
    const start = DAYS.indexOf(a as (typeof DAYS)[number]);
    const end = b === undefined ? start : DAYS.indexOf(b as (typeof DAYS)[number]);
    if (start < 0 || end < 0) throw new Error(`Bad day "${part}"`);
    // Ranges can wrap, e.g. "Sa-Th".
    for (let i = start; ; i = (i + 1) % 7) {
      out.add(i);
      if (i === end) break;
    }
  }
  return [...out];
}

function parseRanges(spec: string): Range[] {
  return spec.split(',').map((r) => {
    const [a, b] = r.split('-');
    if (b === undefined) throw new Error(`Bad range "${r}"`);
    const start = parseTime(a);
    let end = parseTime(b);
    if (end <= start) end += 1440;
    return [start, end];
  });
}

export function parseHours(input: string): Week {
  const week: Week = Array.from({ length: 7 }, () => []);
  const text = input.trim();
  if (text === '24/7') return week.map(() => [[0, 1440]]);

  for (const raw of text.split(';')) {
    const rule = raw.trim();
    if (!rule) continue;
    const [first, ...rest] = rule.split(/\s+/);
    let days: number[];
    let times: string;
    if (/^\d/.test(first)) {
      days = [0, 1, 2, 3, 4, 5, 6];
      times = [first, ...rest].join('');
    } else {
      days = parseDays(first);
      times = rest.join('');
    }
    if (!times) throw new Error(`Missing times in "${rule}"`);
    const ranges = times === 'off' || times === 'closed' ? [] : parseRanges(times);
    // Later rules override earlier ones for the same day, as in OSM.
    for (const d of days) week[d] = ranges;
  }
  return week;
}

export function isValidHours(input: string): boolean {
  try {
    parseHours(input);
    return true;
  } catch {
    return false;
  }
}

/** Current weekday (0 = Monday) and minute in Pensacola's time zone. */
export function nowInPensacola(date = new Date()): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
  return { day, minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function isOpenAt(week: Week, day: number, minute: number): boolean {
  if (week[day].some(([s, e]) => minute >= s && minute < e)) return true;
  // Yesterday's ranges that run past midnight.
  const prev = (day + 6) % 7;
  return week[prev].some(([, e]) => e > 1440 && minute < e - 1440);
}

function fmt(min: number): string {
  const m = min % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return mm === '00' ? `${h12}${suffix}` : `${h12}:${mm}${suffix}`;
}

/** Human-readable rows, merging consecutive days with identical hours. */
export function formatWeek(week: Week): { days: string; hours: string }[] {
  const text = week.map((ranges) =>
    ranges.length === 0
      ? 'Closed'
      : ranges[0][0] === 0 && ranges[0][1] === 1440
        ? 'Open 24 hours'
        : ranges.map(([s, e]) => `${fmt(s)} – ${fmt(e)}`).join(', '),
  );
  const rows: { days: string; hours: string }[] = [];
  let i = 0;
  while (i < 7) {
    let j = i;
    while (j + 1 < 7 && text[j + 1] === text[i]) j++;
    rows.push({ days: i === j ? DAY_LABELS[i] : `${DAY_LABELS[i]} – ${DAY_LABELS[j]}`, hours: text[i] });
    i = j + 1;
  }
  return rows;
}
