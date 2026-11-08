// Phone layout: with an iPhone device profile, in portrait and landscape, the whole game fits on
// one screen (no scrolling), every touch button is big enough and on screen, the keyboard help is
// hidden, and tapping the on-screen buttons drives the train.
const { test, expect, devices } = require('@playwright/test');

// The iPhone profile defaults to WebKit; keep its size, touch and mobile settings but run on Chromium.
const iPhone = { ...devices['iPhone 13'] };
delete iPhone.defaultBrowserType;

for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  test.describe(`phone ${name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ ...iPhone, viewport });

    test('canvas and touch buttons fit without scrolling', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
      const r = await page.evaluate(() => {
        const box = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, left: b.left, bottom: b.bottom, right: b.right, height: b.height }; };
        return {
          vw: innerWidth, vh: innerHeight,
          scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
          canvas: box(document.getElementById('game')),
          buttons: [...document.querySelectorAll('#touch button')].map((b) => ({ act: b.dataset.act, ...box(b) })),
          helpShown: getComputedStyle(document.querySelector('.help')).display !== 'none',
        };
      });
      expect(r.scrollH, 'no vertical scrolling').toBeLessThanOrEqual(r.vh);
      expect(r.scrollW, 'no horizontal scrolling').toBeLessThanOrEqual(r.vw);
      const inView = (b) => b.top >= 0 && b.left >= 0 && b.bottom <= r.vh && b.right <= r.vw;
      expect(inView(r.canvas), 'canvas in view').toBe(true);
      expect(r.canvas.height, 'canvas is a usable size').toBeGreaterThan(200);
      expect(r.buttons).toHaveLength(7);
      for (const b of r.buttons) {
        expect(inView(b), `${b.act} button in view`).toBe(true);
        expect(b.height, `${b.act} button at least 44 px tall`).toBeGreaterThanOrEqual(44);
      }
      expect(r.helpShown, 'keyboard help hidden on touch').toBe(false);
    });

    test('tapping Start, Power and Pause drives the game', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
      await page.tap('#touch [data-act="enter"]');
      await expect.poll(() => page.evaluate(() => window.__train.state.state)).toBe('running');
      const before = await page.evaluate(() => window.__train.state.lever);
      await page.tap('#touch [data-act="power"]');
      const after = await page.evaluate(() => window.__train.state.lever);
      expect(after).toBe(before + 1);
      // Pause button stops the run, and tapping it again resumes.
      await page.tap('#pause');
      expect(await page.evaluate(() => window.__train.state.paused)).toBe(true);
      await expect(page.locator('#pause')).toHaveText('▶ Resume');
      await page.tap('#pause');
      expect(await page.evaluate(() => window.__train.state.paused)).toBe(false);
    });
  });
}
