// Smoke tests: load the game in a headless browser, drive the train along the whole line,
// and check that nothing throws, scoring works, and cats are rendered.
const { test, expect } = require('@playwright/test');

// Fail any test that logs a console error or throws in the page.
let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto('/index.html');
  // If the game crashes on load its frame loop stops, so fail fast and show why.
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2, null, { timeout: 5000 })
    .catch((e) => { throw new Error(errors.length ? errors.join('\n') : e.message); });
});
test.afterEach(() => {
  expect(errors, 'page errors').toEqual([]);
});

// Runs inside the page. A simple automatic driver: holds a bit under the line speed, slows for
// lower limits ahead, and brakes on a curve that ends on the STOP mark. Moves the lever one notch
// per step through act(), like a player would. Returns per-station results.
function autopilot({ overrunAt = -1, dt = 0.05 } = {}) {
  const T = window.__train;
  T.paused = true;
  const g = () => T.state;
  const DECEL = 0.45; // planned braking (m/s²), comfortably under B8
  T.act('enter'); // title -> running
  for (let guard = 0; guard < 400000 && g().state !== 'end'; guard++) {
    const s = g();
    if (s.state === 'arrived') { T.render(); T.act('enter'); continue; }
    const st = T.STATIONS[s.seg];
    const d = st.pos - s.pos;
    let target;
    if (s.seg === overrunAt) {
      target = s.failed ? s.lever : 5; // floor it straight through the station
    } else {
      let vt = (T.limitAt(s.pos) - 4) / 3.6;
      for (const L of T.LIMITS) if (L.at > s.pos) vt = Math.min(vt, Math.sqrt(((L.lim - 4) / 3.6) ** 2 + 2 * DECEL * (L.at - s.pos)));
      vt = Math.min(vt, Math.sqrt(2 * DECEL * Math.max(0, d - 0.3)) + (d > 3 ? 1 : 0.3));
      if (d < 0.25) target = -8;
      else if (s.v > vt + 0.2) {
        const need = (s.v * s.v) / (2 * Math.max(0.3, d - 0.2));
        target = d < 150 ? -Math.min(8, Math.max(1, Math.ceil((need - 0.02) / 0.13))) : -4;
      } else if (s.v < vt - 1) target = 4;
      else if (s.v < vt - 0.3) target = 1;
      else target = 0;
    }
    if (target > s.lever) T.act('power');
    else if (target < s.lever) T.act('brake');
    T.step(dt);
  }
  return { state: g().state, score: g().score, results: g().results.map((r) => ({ ...r })) };
}

test('title screen renders without errors', async ({ page }) => {
  const st = await page.evaluate(() => window.__train.state.state);
  expect(st).toBe('title');
  // The canvas is not blank: sample pixels across the frame and expect many distinct colours.
  const colours = await page.evaluate(() => {
    const c = document.getElementById('game').getContext('2d');
    const seen = new Set();
    for (let y = 5; y < 600; y += 37) for (let x = 5; x < 960; x += 41) seen.add(c.getImageData(x, y, 1, 1).data.join(','));
    return seen.size;
  });
  expect(colours).toBeGreaterThan(20);
});

test('train physics and speed limits behave', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    return {
      p5: T.accel(5, 0), p1: T.accel(1, 0), n: T.accel(0, 20), b1: T.accel(-1, 10), b8: T.accel(-8, 10), eb: T.accel(-9, 10),
      lim0: T.limitAt(0), lim300: T.limitAt(300), limEnd: T.limitAt(99999),
    };
  });
  expect(r.p5).toBeGreaterThan(r.p1);
  expect(r.p1).toBeGreaterThan(0);
  expect(r.n).toBeLessThan(0);           // coasting slows down
  expect(r.b8).toBeLessThan(r.b1);       // more brake, more decel
  expect(r.eb).toBeLessThan(r.b8);       // EB is strongest
  expect(r.lim0).toBe(45);
  expect(r.lim300).toBe(85);
  expect(r.limEnd).toBe(70);
});

test('gradients: coasting is slower uphill and faster downhill; stations are level', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    // Coast in neutral for 20 s from 60 km/h on a constant gradient.
    const coast = (pm) => { let v = 60 / 3.6; for (let i = 0; i < 400; i++) v = Math.max(0, v + T.accel(0, v, pm) * 0.05); return v; };
    return {
      flat: coast(0), up: coast(25), down: coast(-25),
      hasUp: T.GRADES.some((x) => x.pm > 0), hasDown: T.GRADES.some((x) => x.pm < 0),
      stationGrades: T.STATIONS.map((s) => [T.gradeAt(s.pos - 200), T.gradeAt(s.pos), T.gradeAt(s.pos + 30)]),
      gUp: T.accel(0, 10, 0) - T.accel(0, 10, 10),
    };
  });
  expect(r.up).toBeLessThan(r.flat);
  expect(r.down).toBeGreaterThan(r.flat);
  expect(r.gUp).toBeCloseTo(0.098, 3); // about g × ‰ / 1000
  expect(r.hasUp && r.hasDown).toBe(true);
  for (const g of r.stationGrades) expect(g).toEqual([0, 0, 0]);
});

test('gradient posts and the dashboard gradient render', async ({ page }) => {
  const shown = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    const post = T.GRADES.find((x) => x.pm > 0);
    T.state.pos = post.at - 100; // the post marking the climb is 100 m ahead
    const before = T.stats.gradePostsDrawn;
    T.render();
    return { posts: T.stats.gradePostsDrawn - before, here: T.gradeAt(post.at + 1) };
  });
  expect(shown.posts).toBeGreaterThan(0);
  expect(shown.here).toBeGreaterThan(0);
});

test('keyboard controls move the lever', async ({ page }) => {
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__train.state.state)).toBe('running');
  const lever = () => page.evaluate(() => window.__train.state.lever);
  expect(await lever()).toBe(-8);
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowUp');
  expect(await lever()).toBe(2);
  await page.keyboard.press('KeyN');
  expect(await lever()).toBe(0);
  await page.keyboard.press('Space');
  expect(await lever()).toBe(-9);
});

test('autopilot drives the whole line and scores every stop', async ({ page }) => {
  const run = await page.evaluate(autopilot);
  expect(run.state).toBe('end');
  expect(run.results).toHaveLength(8);
  for (const r of run.results) {
    expect(r.failed, `${r.name} overrun`).toBe(false);
    expect(Math.abs(r.d), `${r.name} stop error (m)`).toBeLessThan(5);
    expect(r.stopPts, `${r.name} stop points`).toBeGreaterThan(500);
    expect(r.total, `${r.name} total`).toBeGreaterThan(0);
    expect(r.total).toBe(Math.max(0, r.stopPts + r.perfect + r.timePts + r.smooth + r.catPts - r.pen));
  }
  expect(run.score).toBe(run.results.reduce((a, r) => a + r.total, 0));
  expect(run.results.reduce((a, r) => a + r.cats, 0), 'cats spotted on the line').toBeGreaterThan(0);
  // End screen renders.
  await page.evaluate(() => window.__train.render());
});

test('overrunning the platform fails the stop with no points', async ({ page }) => {
  const run = await page.evaluate(autopilot, { overrunAt: 1 });
  const first = run.results[0];
  expect(first.failed).toBe(true);
  expect(first.total).toBe(0);
  expect(run.state).toBe('end');
});

test('cats render beside the track and on platforms', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    T.state.pos = T.STATIONS[1].pos - 120; // on the approach to the first platform
    const before = T.stats.catsDrawn;
    T.render();
    return { drawn: T.stats.catsDrawn - before, ahead: T.catsBetween(T.state.pos, T.state.pos + 120).length };
  });
  expect(r.ahead).toBeGreaterThan(0);
  expect(r.drawn).toBeGreaterThan(0);
});

test('scenery changes every 10 seconds', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    const first = T.scene.cur;
    for (let i = 0; i < 210; i++) T.step(0.05);
    T.render();
    return { first, now: T.scene.cur };
  });
  expect(r.now).not.toBe(r.first);
});

test('stations are about 1 km apart', async ({ page }) => {
  const st = await page.evaluate(() => window.__train.STATIONS.map((s) => s.pos));
  expect(st).toHaveLength(9);
  for (let i = 1; i < st.length; i++) {
    expect(st[i] - st[i - 1]).toBeGreaterThanOrEqual(800);
    expect(st[i] - st[i - 1]).toBeLessThanOrEqual(1400);
  }
});

test('front and rear camera insets are always on; platform camera appears near a station', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    const at = (d) => {
      T.state.pos = T.STATIONS[1].pos - d;
      const before = T.stats.trainDrawn;
      T.render();
      return { insets: [...T.stats.lastInsets], train: T.stats.trainDrawn - before };
    };
    return { far: at(800), near: at(200), stopped: at(0.3) };
  });
  expect(r.far.insets).toEqual(['front', 'rear']);
  expect(r.far.train).toBe(1);          // the front camera shows our train
  expect(r.near.insets).toEqual(['front', 'rear', 'platform']);
  expect(r.near.train).toBe(2);         // ...and so does the platform camera
  expect(r.stopped.insets).toContain('platform');
});

test('M key and Sound button toggle mute, remembered across reloads', async ({ page }) => {
  const muted = () => page.evaluate(() => window.__train.sound.muted);
  expect(await muted()).toBe(false);
  await page.keyboard.press('KeyM');
  expect(await muted()).toBe(true);
  expect(await page.evaluate(() => window.__train.sound.started)).toBe(true); // audio starts on first input
  await expect(page.locator('#mute')).toHaveText(/off/);
  await page.reload();
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
  expect(await muted()).toBe(true);
  await page.locator('#mute').click();
  expect(await muted()).toBe(false);
  await expect(page.locator('#mute')).toHaveText(/on/);
  // Let the audio run for a moment while driving: no errors.
  await page.keyboard.press('Enter');
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(1500);
});
