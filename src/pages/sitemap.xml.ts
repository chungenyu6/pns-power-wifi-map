// Sitemap for search engines. Submit https://chungenyu6.github.io/pns-power-wifi-map/sitemap.xml
// in Google Search Console so new shops get found.
import type { APIRoute } from 'astro';
import { getShops } from '../lib/shops';

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const paths = ['/', '/about/', '/add/', ...(await getShops()).map((s) => `/shops/${s.id}/`)];
  const urls = paths.map((p) => `  <url><loc>${new URL(base + p, site)}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
