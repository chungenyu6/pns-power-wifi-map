import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { ShopView, SpotView } from '../lib/shops';

export type MapApi = {
  show(slugs: Set<string>): void;
  focus(slug: string): void;
};

// One light basemap for both themes; dark mode inverts the canvas with a CSS filter (see global.css).
const STYLE = 'https://tiles.openfreemap.org/styles/positron';

// Warm the basemap so it sits on the paper-colored page.
function tint(map: maplibregl.Map) {
  const set = (layer: string, prop: 'background-color' | 'fill-color', value: string) => {
    if (map.getLayer(layer)) map.setPaintProperty(layer, prop, value);
  };
  set('background', 'background-color', '#f3f1ea');
  set('water', 'fill-color', '#d3dfe4');
  set('park', 'fill-color', '#e2eadb');
  set('landcover_wood', 'fill-color', '#e2eadb');
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function popupHtml(shop: ShopView, base: string): string {
  const wifi = shop.wifi === 'yes' ? (shop.wifiFree ? 'Free Wi-Fi' : 'Wi-Fi') : shop.wifi === 'no' ? 'No Wi-Fi' : 'Wi-Fi unconfirmed';
  const outlets =
    { many: 'Plenty of outlets', some: 'Outlets', few: 'A few outlets', none: 'No outlets', unknown: 'Outlets unconfirmed' }[
      shop.outlets
    ];
  return `<a class="popup-title" href="${base}/shops/${shop.slug}">${escape(shop.name)}</a>
    <div class="popup-meta">${wifi} · ${outlets}</div>
    <div class="popup-addr">${escape(shop.address.split(',')[0])}</div>`;
}

// Bundlers can't discover MapLibre's worker on their own; point it at the emitted file.
maplibregl.setWorkerUrl(workerUrl);

export function initMap({ base, shops, spots = [] }: { base: string; shops: ShopView[]; spots?: SpotView[] }): MapApi {
  const map = new maplibregl.Map({
    container: 'map',
    style: STYLE,
    center: [-87.217, 30.44],
    zoom: 11,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');
  map.on('style.load', () => tint(map));
  // Start with the attribution collapsed to its (i) button; it takes half the map on phones.
  map.once('load', () => {
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
  });

  const bounds = new maplibregl.LngLatBounds();
  shops.forEach((s) => bounds.extend([s.lng, s.lat]));
  map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });

  const markers = new Map<string, maplibregl.Marker>();
  for (const shop of shops) {
    // MapLibre positions the outer element with `transform`, so hover/active scaling goes on the inner dot.
    const el = document.createElement('div');
    el.className = 'marker-wrap';
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `marker ${shop.tone}`;
    dot.setAttribute('aria-label', shop.name);
    el.append(dot);
    const popup = new maplibregl.Popup({ offset: 12, closeButton: false, maxWidth: '260px' }).setHTML(popupHtml(shop, base));
    const marker = new maplibregl.Marker({ element: el }).setLngLat([shop.lng, shop.lat]).setPopup(popup).addTo(map);
    dot.addEventListener('click', () => highlight(shop.slug, true));
    markers.set(shop.slug, marker);
  }

  for (const spot of spots) {
    if (new Date(spot.expires) < new Date()) continue;
    const el = document.createElement('div');
    el.className = 'marker-wrap';
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'marker spot';
    dot.setAttribute('aria-label', `${spot.host ?? spot.name} (relief spot)`);
    el.append(dot);
    const html = `<div class="popup-title">${escape(spot.host ?? spot.name)}</div>
      <div class="popup-meta spot-meta">${escape(spot.name)}</div>
      ${spot.details ? `<div class="popup-addr">${escape(spot.details)}</div>` : ''}
      <div class="popup-addr">${escape(spot.address.split(',')[0])}</div>`;
    const popup = new maplibregl.Popup({ offset: 12, closeButton: false, maxWidth: '260px' }).setHTML(html);
    markers.set(spot.slug, new maplibregl.Marker({ element: el }).setLngLat([spot.lng, spot.lat]).setPopup(popup).addTo(map));
  }

  function highlight(slug: string, scrollList: boolean) {
    document.querySelectorAll('.card.active').forEach((c) => c.classList.remove('active'));
    document.querySelectorAll('.marker.active').forEach((m) => m.classList.remove('active'));
    const card = document.querySelector<HTMLElement>(`.card[data-slug="${slug}"]`);
    card?.classList.add('active');
    markers.get(slug)?.getElement().querySelector('.marker')?.classList.add('active');
    if (scrollList) card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return {
    show(slugs) {
      for (const [slug, marker] of markers) {
        if (slug.startsWith('spot-')) continue;
        marker.getElement().hidden = !slugs.has(slug);
        if (!slugs.has(slug)) marker.getPopup()?.remove();
      }
    },
    focus(slug) {
      const marker = markers.get(slug);
      if (!marker) return;
      markers.forEach((m) => m.getPopup()?.remove());
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 14), duration: 600 });
      marker.togglePopup();
      highlight(slug, false);
    },
  };
}
