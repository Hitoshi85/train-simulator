// Post-deploy check: runs only when LIVE_URL is set (by the Pages workflow after a deploy).
// Loads the live game, checks it serves the expected commit and that the train runs.
const { test, expect, devices } = require('@playwright/test');

const LIVE_URL = process.env.LIVE_URL;
// EXPECT_SHA is the commit this site should serve (prod and dev can differ); defaults to GITHUB_SHA.
const SHA = process.env.EXPECT_SHA || process.env.GITHUB_SHA;
// EXPECT_TAG (prod only) is the release prod should report, e.g. prod-2 after a Ship or Rollback.
const TAG = process.env.EXPECT_TAG;

test.describe('live site', () => {
  test.skip(!LIVE_URL, 'LIVE_URL not set; only runs after a deploy');

  test('serves this commit and the game runs', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const bust = `?v=${(SHA || 'check').slice(0, 7)}`;
    if (SHA) {
      const res = await page.request.get(`${LIVE_URL}version.json${bust}`);
      expect(res.ok()).toBe(true);
      const version = await res.json();
      expect(version.sha).toBe(SHA);
      if (TAG) expect(version.tag).toBe(TAG);
    }
    await page.goto(`${LIVE_URL}${bust}`);
    await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2, null, { timeout: 15000 });
    const before = await page.evaluate(() => window.__train.stats.frames);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__train.stats.frames)).toBeGreaterThan(before);
    expect(errors).toEqual([]);
  });

  // The live copy is phone friendly too: on an iPhone-sized screen it fits without scrolling,
  // every touch button is on screen and at least 44 px tall. Prod can be an older release than the
  // repo, so this does not pin the button count (tests/mobile.spec.js does that for the current code).
  test.describe('on a phone', () => {
    const iPhone = { ...devices['iPhone 13'] };
    delete iPhone.defaultBrowserType;
    test.use(iPhone);

    test('fits the screen with usable touch buttons', async ({ page }) => {
      await page.goto(`${LIVE_URL}?v=${(SHA || 'check').slice(0, 7)}`);
      await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2, null, { timeout: 15000 });
      const r = await page.evaluate(() => ({
        vw: innerWidth, vh: innerHeight,
        scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
        buttons: [...document.querySelectorAll('#touch button')].map((b) => b.getBoundingClientRect().toJSON()),
      }));
      expect(r.scrollH).toBeLessThanOrEqual(r.vh);
      expect(r.scrollW).toBeLessThanOrEqual(r.vw);
      expect(r.buttons.length).toBeGreaterThanOrEqual(7);
      for (const b of r.buttons) {
        expect(b.top >= 0 && b.left >= 0 && b.bottom <= r.vh && b.right <= r.vw).toBe(true);
        expect(b.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
});
