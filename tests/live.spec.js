// Post-deploy check: runs only when LIVE_URL is set (by the Pages workflow after a deploy).
// Loads the live game, checks it serves the expected commit and that the train runs.
const { test, expect } = require('@playwright/test');

const LIVE_URL = process.env.LIVE_URL;
const SHA = process.env.GITHUB_SHA;

test.describe('live site', () => {
  test.skip(!LIVE_URL, 'LIVE_URL not set; only runs after a deploy');

  test('serves this commit and the game runs', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const bust = `?v=${(SHA || 'check').slice(0, 7)}`;
    if (SHA) {
      const res = await page.request.get(`${LIVE_URL}version.json${bust}`);
      expect(res.ok()).toBe(true);
      expect((await res.json()).sha).toBe(SHA);
    }
    await page.goto(`${LIVE_URL}${bust}`);
    await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2, null, { timeout: 15000 });
    const before = await page.evaluate(() => window.__train.stats.frames);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__train.stats.frames)).toBeGreaterThan(before);
    expect(errors).toEqual([]);
  });
});
