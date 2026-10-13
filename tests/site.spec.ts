import { expect, test } from '@playwright/test';

test.describe('map page', () => {
  test.beforeEach(async ({ page }) => {
    // Keep map tests independent of real votes in the database.
    await page.route('**/rest/v1/reports**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('./');
  });

  test('lists shops and puts one marker on the map per shop', async ({ page }) => {
    const cards = page.locator('.card');
    expect(await cards.count()).toBeGreaterThanOrEqual(25);
    await expect(page.locator('#map canvas')).toBeAttached();
    const spots = await page.locator('li.spot').count();
    await expect(page.locator('.marker-wrap')).toHaveCount((await cards.count()) + spots);
    await expect(page.locator('#count')).toHaveText(String(await cards.count()));
  });

  test('Wi-Fi filter keeps only shops with Wi-Fi, in the list and on the map', async ({ page }) => {
    const total = await page.locator('.card').count();
    await page.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Wi-Fi', exact: true })).toHaveAttribute('aria-pressed', 'true');

    const visible = page.locator('.card:not([hidden])');
    const n = await visible.count();
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(total);
    for (const wifi of await visible.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.wifi))) {
      expect(wifi).toBe('yes');
    }
    const spots = await page.locator('li.spot').count();
    await expect(page.locator('.marker-wrap:not([hidden])')).toHaveCount(n + spots);
    await expect(page.locator('#count')).toHaveText(String(n));
  });

  test('search narrows the list', async ({ page }) => {
    await page.getByPlaceholder('Search by name or street').fill('foxtail');
    await expect(page.locator('.card:not([hidden])')).toHaveCount(1);
    await expect(page.locator('.card:not([hidden]) h2')).toHaveText('Foxtail Coffee');
  });

  test('impossible filter combo shows the empty state', async ({ page }) => {
    await page.getByPlaceholder('Search by name or street').fill('zzzz-no-such-shop');
    await expect(page.locator('#empty')).toBeVisible();
  });

  test('area filter only shows that area', async ({ page }) => {
    await page.locator('#area').selectOption('downtown');
    const areas = await page.locator('.card:not([hidden])').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.area));
    expect(areas.length).toBeGreaterThan(0);
    expect(new Set(areas)).toEqual(new Set(['downtown']));
  });

  test('page does not scroll sideways', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test('every shop page renders', async ({ page }) => {
  await page.goto('./');
  const links = await page.locator('.card h2 a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  for (const href of links) {
    const res = await page.goto(href);
    expect(res?.status(), href).toBe(200);
    await expect(page.locator('h1')).not.toBeEmpty();
    await expect(page.getByRole('heading', { name: 'Where this info comes from' })).toBeVisible();
  }
});

test('about page explains the freshness badges', async ({ page }) => {
  await page.goto('./about');
  await expect(page.getByRole('heading', { name: 'How fresh is it?' })).toBeVisible();
});

test('dark mode toggle persists across pages', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./about');
  await page.getByRole('button', { name: 'Toggle dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test.describe('community reports', () => {
  const fake = [
    { id: 2, created_at: new Date(Date.now() - 2 * 3600_000).toISOString(), shop_slug: 'foxtail-coffee-west-jackson', is_open: true, wifi_works: true, outlets: 'plenty', wifi_password: 'latte123', comment: 'Outlets along the back wall' },
  ];

  let retracted: unknown[] = [];

  test.beforeEach(async ({ page }) => {
    retracted = [];
    // Never touch the real database from tests.
    await page.route('**/rest/v1/rpc/retract_vote', (route) => {
      retracted.push(route.request().postDataJSON());
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
    });
    await page.route('**/rest/v1/reports**', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 99 }]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fake) });
    });
  });

  test('shop page shows approved reports, including the Wi-Fi password', async ({ page }) => {
    await page.goto('./shops/foxtail-coffee-west-jackson');
    const feed = page.locator('.feed-list');
    await expect(feed).toContainText('Open · Wi-Fi works · Plenty of outlets');
    await expect(feed).toContainText('latte123');
    await expect(feed).toContainText('Outlets along the back wall');
  });

  test('one-tap vote on a map card is sent and counted', async ({ page }) => {
    await page.goto('./');
    const vote = page.locator('.card[data-slug="foxtail-coffee-west-jackson"] .vote[data-q="wifi"]');
    await expect(vote.locator('[data-v="up"] b')).toHaveText('1'); // from the fake report
    const posted = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/rest/v1/reports'));
    await vote.locator('[data-v="down"]').click();
    expect((await posted).postDataJSON()).toMatchObject({ shop_slug: 'foxtail-coffee-west-jackson', wifi_works: false });
    await expect(vote.locator('[data-v="down"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(vote.locator('[data-v="down"] b')).toHaveText('1');

    // Remembered after reload.
    await page.reload();
    const again = page.locator('.card[data-slug="foxtail-coffee-west-jackson"] .vote[data-q="wifi"]');
    await expect(again.locator('[data-v="down"]')).toHaveAttribute('aria-pressed', 'true');

    // Tapping the same button again takes the vote back on the server.
    await again.locator('[data-v="down"]').click();
    await expect(again.locator('[data-v="down"]')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => retracted.length).toBe(1);
    expect(retracted[0]).toMatchObject({ p_id: 99 });
  });

  test('switching from 👎 to 👍 withdraws the old vote', async ({ page }) => {
    await page.goto('./shops/foxtail-coffee-west-jackson');
    const vote = page.locator('.report .vote[data-q="quiet"]');
    await vote.locator('[data-v="down"]').click();
    await expect(vote.locator('[data-v="down"]')).toHaveAttribute('aria-pressed', 'true');
    await vote.locator('[data-v="up"]').click();
    await expect(vote.locator('[data-v="up"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(vote.locator('[data-v="down"] b')).toHaveText('0');
    await expect.poll(() => retracted.length).toBe(1);
  });

  test('add-a-shop form sends a pending suggestion', async ({ page }) => {
    await page.goto('./add');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('.form-msg')).toHaveText('Add the shop name and where it is.');
    await page.getByLabel('Shop name').fill('Test Beans');
    await page.getByLabel('Address or cross streets').fill('9th Ave & Bayou');
    await page.locator('label:has(input[name="wifi"][value="yes"])').click();
    const posted = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/rest/v1/reports'));
    await page.getByRole('button', { name: 'Send' }).click();
    expect((await posted).postDataJSON()).toEqual({
      shop_slug: 'new-shop',
      comment: 'NEW SHOP: Test Beans\nWhere: 9th Ave & Bayou',
      wifi_works: true,
    });
    await expect(page.locator('.form-msg')).toContainText("We'll check it out");
  });

  test('shop page has an "open right now" vote; outlets vote maps to some/none', async ({ page }) => {
    await page.goto('./shops/foxtail-coffee-west-jackson');
    await expect(page.locator('.report .vote[data-q="open"]')).toBeVisible();
    const posted = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/rest/v1/reports'));
    await page.locator('.report .vote[data-q="outlets"] [data-v="up"]').click();
    expect((await posted).postDataJSON()).toMatchObject({ shop_slug: 'foxtail-coffee-west-jackson', outlets: 'some' });
  });

  test('tips are queued for review; empty tips are refused', async ({ page }) => {
    await page.goto('./shops/foxtail-coffee-west-jackson');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('.form-msg')).toHaveText('Add a password or a tip first.');
    await page.getByLabel('Anything else?').fill('Quiet in the mornings');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('.form-msg')).toContainText('after a quick review');
  });

  test('a recent open report shows in the card\'s open/closed spot', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.card[data-slug="foxtail-coffee-west-jackson"] .open-state')).toHaveText('Reported open · 2h ago');
  });
});

test('before migration 002, parallel requests still fall back and show counts', async ({ page }) => {
  const row = { id: 1, created_at: new Date().toISOString(), shop_slug: 'echo-coffee', is_open: null, wifi_works: true, outlets: null, wifi_password: null, comment: null };
  await page.route('**/rest/v1/reports**', (route) =>
    route.request().url().includes('laptop_ok')
      ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: '42703', message: 'column reports.laptop_ok does not exist' }) })
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([row]) }),
  );
  await page.goto('./shops/echo-coffee');
  await expect(page.locator('.report .vote[data-q="wifi"] [data-v="up"] b')).toHaveText('1');
  await expect(page.locator('.feed-list')).toContainText('No tips yet');
});

test('votes upgrade unknown tags and refresh the freshness badge, everywhere', async ({ page }) => {
  const now = Date.now();
  const vote = (id: number, extra: object) => ({
    id, created_at: new Date(now - id * 60_000).toISOString(), shop_slug: 'bodacious-brew',
    is_open: null, wifi_works: null, outlets: null, laptop_ok: null, quiet: null, wifi_password: null, comment: null, ...extra,
  });
  const rows = [vote(1, { wifi_works: true }), vote(2, { wifi_works: true }), vote(3, { outlets: 'none' })];
  await page.route('**/rest/v1/reports**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }),
  );

  await page.goto('./');
  const card = page.locator('.card[data-slug="bodacious-brew"]');
  await expect(card.locator('li[data-attr="wifi"]')).toHaveText('Wi-Fi');
  await expect(card.locator('li[data-attr="wifi"]')).toHaveClass(/good/);
  await expect(card.locator('li[data-attr="outlets"]')).toHaveText('Outlets?'); // one 👎 isn't a verdict
  await expect(card.locator('.fresh')).toHaveText('Confirmed today');
  await expect(card.locator('.fresh')).toHaveClass(/good/);

  await page.goto('./shops/bodacious-brew');
  await expect(page.locator('.row[data-attr="wifi"] .row-value')).toHaveText("Yes (locals' votes)");
  await expect(page.locator('.head-meta li[data-attr="wifi"]')).toHaveText('Wi-Fi');
  await expect(page.locator('.facts .fresh')).toHaveText('Confirmed today');
});

test('list, filters and votes still work when the map library fails to load', async ({ page }) => {
  await page.route('**/_astro/map.*.js', (route) => route.abort());
  const rows = [
    { id: 1, created_at: new Date().toISOString(), shop_slug: 'echo-coffee', is_open: null, wifi_works: true, outlets: null, laptop_ok: null, quiet: null, wifi_password: null, comment: null },
  ];
  await page.route('**/rest/v1/reports**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) }));
  await page.goto('./');
  await expect(page.locator('.card[data-slug="echo-coffee"] .vote[data-q="wifi"] [data-v="up"] b')).toHaveText('1');
  await page.getByPlaceholder('Search by name or street').fill('echo');
  await expect(page.locator('.card:not([hidden])')).toHaveCount(1);
});
