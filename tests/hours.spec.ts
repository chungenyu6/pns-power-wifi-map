import { expect, test } from '@playwright/test';
import { formatWeek, isOpenAt, isValidHours, parseHours } from '../src/lib/hours';

// Pure unit tests for the opening-hours parser.
test.describe('hours parser', () => {

  test('parses day ranges, wraps, overrides and "off"', () => {
    const w = parseHours('Sa-Th 05:30-20:00; Fr 05:00-20:00; Su off');
    expect(w[4]).toEqual([[300, 1200]]); // Fri
    expect(w[0]).toEqual([[330, 1200]]); // Mon
    expect(w[6]).toEqual([]); // Sun overridden to off
  });

  test('handles split ranges and past-midnight hours', () => {
    const w = parseHours('Mo-Fr 07:00-11:00,12:00-17:00; Sa 18:00-02:00');
    expect(isOpenAt(w, 0, 11 * 60 + 30)).toBe(false);
    expect(isOpenAt(w, 0, 12 * 60)).toBe(true);
    expect(isOpenAt(w, 5, 23 * 60)).toBe(true); // Sat 11pm
    expect(isOpenAt(w, 6, 60)).toBe(true); // Sun 1am, carried over
    expect(isOpenAt(w, 6, 3 * 60)).toBe(false);
  });

  test('bare times mean every day; 24/7 works', () => {
    expect(parseHours('05:00-20:00').every((d) => d.length === 1)).toBe(true);
    expect(isOpenAt(parseHours('24/7'), 3, 3 * 60)).toBe(true);
  });

  test('rejects junk', () => {
    expect(isValidHours('sometimes')).toBe(false);
    expect(isValidHours('Mo-Fr 7am-5pm')).toBe(false);
  });

  test('formats merged rows', () => {
    expect(formatWeek(parseHours('Mo-Fr 07:00-17:00; Sa-Su off'))).toEqual([
      { days: 'Mon – Fri', hours: '7am – 5pm' },
      { days: 'Sat – Sun', hours: 'Closed' },
    ]);
  });
});
