// Automatic phone and speed checks that run on every PR.
// 1. Phone screenshots: portrait and landscape, on the title screen and mid-run, saved to
//    phone-screenshots/ (CI uploads them as an artifact so each PR can be eyeballed on phone size).
// 2. Frame-rate budget: drawing one frame at phone size must stay under 16 ms (60 fps), measured as
//    the median over many frames while the train runs. Timings go to the CI job summary.
const fs = require('fs');
const path = require('path');
const { test, expect, devices } = require('@playwright/test');

const iPhone = { ...devices['iPhone 13'] };
delete iPhone.defaultBrowserType; // keep size, touch and mobile settings but run on Chromium

const FRAME_BUDGET_MS = 16; // one frame at 60 fps is 16.7 ms
const SHOTS = path.join(__dirname, '..', 'phone-screenshots');

// Starts a Local run and drives a little way down the line so the scene has scenery, signs and speed.
async function startRun(page) {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
  await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('local');
    T.act('enter');
    for (let i = 0; i < 4; i++) T.act('power');
    for (let i = 0; i < 600; i++) T.step(0.05);
    T.render();
  });
}

for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  test.describe(`phone ${name}`, () => {
    test.use({ ...iPhone, viewport });

    test('screenshots of title and a run', async ({ page }) => {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.goto('/index.html');
      await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
      await page.screenshot({ path: path.join(SHOTS, `${name}-title.png`) });
      await startRun(page);
      await page.screenshot({ path: path.join(SHOTS, `${name}-running.png`) });
      expect(fs.statSync(path.join(SHOTS, `${name}-running.png`)).size).toBeGreaterThan(10000);
    });

    for (const wx of [null, 'snow', 'rain']) test(`frame draw time stays under ${FRAME_BUDGET_MS} ms${wx ? ` at night in ${wx}, near a station` : ''}`, async ({ page }) => {
      await startRun(page);
      const t = await page.evaluate((wx) => {
        const T = window.__train;
        if (wx) { T.setWeather(wx); T.state.pos = 4125; T.state.seg = T.STATIONS.length - 1; } // night, three cameras
        const times = [];
        for (let i = 0; i < 200; i++) {
          T.step(1 / 30);
          const t0 = performance.now();
          T.render();
          if (i >= 20) times.push(performance.now() - t0); // skip warm-up frames
        }
        times.sort((a, b) => a - b);
        const at = (q) => times[Math.min(times.length - 1, Math.floor(q * times.length))];
        return { median: at(0.5), p95: at(0.95) };
      }, wx);
      const line = `| ${name}${wx ? ', night ' + wx : ''} | ${t.median.toFixed(1)} ms | ${t.p95.toFixed(1)} ms | ${FRAME_BUDGET_MS} ms |\n`;
      console.log(`frame time ${name}${wx ? ' night ' + wx : ''}: median ${t.median.toFixed(1)} ms, p95 ${t.p95.toFixed(1)} ms`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        const head = fs.existsSync(process.env.GITHUB_STEP_SUMMARY) && fs.readFileSync(process.env.GITHUB_STEP_SUMMARY, 'utf8').includes('Frame draw time')
          ? '' : '### Frame draw time (phone size)\n\n| Phone | Median | 95th pct | Budget |\n|---|---|---|---|\n';
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, head + line);
      }
      expect(t.median, `median frame draw time in ${name}${wx ? ' at night in ' + wx : ''}`).toBeLessThanOrEqual(FRAME_BUDGET_MS);
    });
  });
}
