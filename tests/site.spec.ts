import { expect, test } from '@playwright/test';

test.describe('map page', () => {
  test.beforeEach(async ({ page }) => {
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

  test.beforeEach(async ({ page }) => {
    // Never touch the real database from tests.
    await page.route('**/rest/v1/reports**', async (route) => {
      if (route.request().method() === 'POST') return route.fulfill({ status: 201, body: '' });
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

  test('quick-tap report goes live', async ({ page }) => {
    await page.goto('./shops/foxtail-coffee-west-jackson');
    let posted: Record<string, unknown> | undefined;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/rest/v1/reports')) posted = r.postDataJSON();
    });
    await page.getByText('Open', { exact: true }).click();
    await page.getByText('Works', { exact: true }).click();
    await page.getByRole('button', { name: 'Send report' }).click();
    await expect(page.locator('.form-msg')).toHaveText('Thanks! Your report is live.');
    expect(posted).toEqual({ shop_slug: 'foxtail-coffee-west-jackson', is_open: true, wifi_works: true });
  });

  test('comments are queued for review; empty reports are refused', async ({ page }) => {
    await page.goto('./shops/foxtail-coffee-west-jackson');
    await page.getByRole('button', { name: 'Send report' }).click();
    await expect(page.locator('.form-msg')).toHaveText('Pick at least one answer or write a note.');
    await page.getByLabel('Anything else?').fill('Quiet in the mornings');
    await page.getByRole('button', { name: 'Send report' }).click();
    await expect(page.locator('.form-msg')).toContainText('after a quick review');
  });

  test('map cards show the latest local report', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.card[data-slug="foxtail-coffee-west-jackson"] .live')).toContainText('Open · Wi-Fi works');
  });
});
