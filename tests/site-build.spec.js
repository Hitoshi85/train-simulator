// The two-site Pages layout (prod at the root, dev under /dev/), built from the working tree into
// _site-test/ by .github/scripts/build-site.sh before the tests start (see playwright.config.js).
// Checks both copies load and run, say which site and commit they are, and stay fresh on phones:
// versioned asset URLs, and a reload onto a newer deploy without a hard refresh.
// Dev and prod look identical in the game (Hitoshi's choice), so only version.json tells them apart.
const { test, expect } = require('@playwright/test');

const SITES = [{ env: 'prod', dir: '/_site-test/' }, { env: 'dev', dir: '/_site-test/dev/' }];

for (const site of SITES) {
  test.describe(`${site.env} site`, () => {
    test('runs, reports its version and loads versioned assets', async ({ page, request }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const version = await (await request.get(`${site.dir}version.json`)).json();
      expect(version.env).toBe(site.env);
      expect(version.sha).toMatch(/^[0-9a-f]{40}$/);
      expect(version.tag).toBe(site.env === 'prod' ? 'prod-test' : '');

      const html = await (await request.get(`${site.dir}index.html`)).text();
      const short = version.sha.slice(0, 7);
      expect(html).toContain(`game.js?v=${short}"`);
      expect(html).toContain(`style.css?v=${short}"`);
      expect(html).toContain('id="fresh-check"');

      await page.goto(`${site.dir}index.html`);
      await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2, null, { timeout: 15000 });
      await page.waitForTimeout(500); // the freshness check has answered: same build, so no reload
      expect(page.url()).toMatch(/index\.html$/);
      expect(errors).toEqual([]);
    });

    test('reloads once onto a newer deploy, without looping', async ({ page }) => {
      const newer = 'f'.repeat(40);
      let checks = 0;
      await page.route('**/version.json*', (route) => {
        checks += 1;
        route.fulfill({ contentType: 'application/json', body: JSON.stringify({ sha: newer, env: site.env, tag: '' }) });
      });
      await page.goto(`${site.dir}index.html`);
      // The page still embeds the old build, so it reloads with ?v=<new short sha> to skip caches...
      await page.waitForURL(/\?v=fffffff$/);
      await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2, null, { timeout: 15000 });
      // ...and, as this test server keeps serving the old page, it must not reload again.
      await page.waitForTimeout(800);
      expect(checks).toBe(2);
      expect(page.url()).toMatch(/\?v=fffffff$/);
    });
  });
}
