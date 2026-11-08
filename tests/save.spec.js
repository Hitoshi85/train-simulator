// Saved progress: settings, best scores and a run in progress live in one versioned
// localStorage record and survive a page reload.
const { test, expect } = require('@playwright/test');

let errors;
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
});
test.afterEach(() => { expect(errors, 'page errors').toEqual([]); });

// Drives to the next stop and stops near the mark (simple, not scored well).
function driveToNextStop() {
  const T = window.__train, s = T.state;
  T.paused = true;
  if (s.state === 'title' || s.state === 'arrived') T.act('enter');
  for (let i = 0; i < 200000 && T.state.state === 'running'; i++) {
    const g = T.state, d = T.STATIONS[g.seg].pos - g.pos;
    const vt = Math.min((T.limitAt(g.pos) - 6) / 3.6, Math.sqrt(2 * 0.4 * Math.max(0, d - 0.3)) + 0.3);
    const target = d < 0.3 ? -3 : g.v > vt + 0.2 ? -3 : g.v < vt - 0.5 ? 2 : 0;
    if (target > g.lever) T.act('power'); else if (target < g.lever) T.act('brake');
    T.step(0.05);
  }
  return { state: T.state.state, seg: T.state.seg, score: T.state.score };
}

test('a run resumes from the last station after a reload', async ({ page }) => {
  await page.evaluate(() => window.__train.act('express'));
  const first = await page.evaluate(driveToNextStop);
  expect(first.state).toBe('arrived');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('aozora.save')));
  expect(saved.v).toBe(1);
  expect(saved.settings.mode).toBe('express');
  expect(saved.run).toMatchObject({ mode: 'express', seg: first.seg, score: first.score });

  await page.reload();
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
  const title = await page.evaluate(() => ({ state: window.__train.state.state, run: !!window.__train.save.data.run }));
  expect(title).toEqual({ state: 'title', run: true });
  const resumed = await page.evaluate(() => { const T = window.__train; T.paused = true; T.act('enter'); return { state: T.state.state, seg: T.state.seg, score: T.state.score, mode: T.state.mode }; });
  expect(resumed).toEqual({ state: 'arrived', seg: first.seg, score: first.score, mode: 'express' });
  const next = await page.evaluate(driveToNextStop);
  expect(next.state).toBe('arrived');
  expect(next.seg).toBeGreaterThan(first.seg);
  expect(next.score).toBeGreaterThanOrEqual(first.score);
});

test('N on the welcome-back screen starts a new run', async ({ page }) => {
  await page.evaluate(driveToNextStop);
  await page.reload();
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
  const r = await page.evaluate(() => {
    const T = window.__train; T.act('neutral');
    return { run: T.save.data.run, stored: JSON.parse(localStorage.getItem('aozora.save')).run, state: T.state.state };
  });
  expect(r).toEqual({ run: null, stored: null, state: 'title' });
});

test('best score per mode is kept, and sound setting persists', async ({ page }) => {
  const r = await page.evaluate(() => {
    const S = window.__train.save;
    return [S.record('local', 5000, 'B'), S.record('local', 4000, 'C'), S.record('local', 6000, 'A'), S.record('express', 3000, 'C')];
  });
  expect(r).toEqual([true, false, true, true]);
  await page.evaluate(() => window.__train.sound.toggle());
  await page.reload();
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
  const d = await page.evaluate(() => ({ best: window.__train.save.data.best, muted: window.__train.sound.muted }));
  expect(d.best.local).toMatchObject({ score: 6000, rank: 'A' });
  expect(d.best.express).toMatchObject({ score: 3000, rank: 'C' });
  expect(d.muted).toBe(true);
});

test('a corrupt or older save is ignored', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('aozora.save', '{not json'));
  await page.reload();
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
  const d = await page.evaluate(() => ({ state: window.__train.state.state, run: window.__train.save.data.run }));
  expect(d).toEqual({ state: 'title', run: null });
});

test('finishing the line records the best score and clears the saved run', async ({ page }) => {
  const r = await page.evaluate((src) => {
    const drive = new Function('return ' + src)();
    const T = window.__train;
    for (let i = 0; i < 20 && T.state.state !== 'end'; i++) {
      if (T.state.state === 'arrived' && T.state.seg >= T.STATIONS.length - 1) T.act('enter');
      else drive();
    }
    return { state: T.state.state, score: T.state.score, best: T.save.data.best.local, run: T.save.data.run };
  }, driveToNextStop.toString());
  expect(r.state).toBe('end');
  expect(r.run).toBeNull();
  expect(r.best.score).toBe(r.score);
});
