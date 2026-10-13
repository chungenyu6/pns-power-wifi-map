import { describe, recentReports, timeAgo } from '../lib/reports';

// Puts the latest community report (last 48h) on each shop card, e.g. "Open · Wi-Fi works · 2h ago".
export async function showLiveReports() {
  let reports;
  try {
    reports = await recentReports(48);
  } catch {
    return; // Reports are a bonus; the map works without them.
  }
  const latest = new Map<string, (typeof reports)[number]>();
  for (const r of reports) {
    if (!describe(r)) continue;
    if (!latest.has(r.shop_slug)) latest.set(r.shop_slug, r);
  }
  for (const [slug, r] of latest) {
    const line = document.querySelector<HTMLElement>(`.card[data-slug="${slug}"] .live`);
    if (!line) continue;
    line.textContent = `Local report: ${describe(r)} · ${timeAgo(r.created_at)}`;
    line.classList.toggle('is-open', r.is_open === true);
    line.hidden = false;
  }
}
