import { expect, test } from '@playwright/test';

test.describe('map page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('lists shops and puts one marker on the map per shop', async ({ page }) => {
    const cards = page.locator('.card');
    expect(await cards.count()).toBeGreaterThanOrEqual(25);
    await expect(page.locator('#map canvas')).toBeAttached();
    await expect(page.locator('.marker-wrap')).toHaveCount(await cards.count());
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
    await expect(page.locator('.marker-wrap:not([hidden])')).toHaveCount(n);
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
