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
function autopilot({ overrunAt = -1, dt = 0.05, mode = 'local' } = {}) {
  const T = window.__train;
  T.paused = true;
  const g = () => T.state;
  const DECEL = 0.45; // planned braking (m/s²), comfortably under B3
  T.act(mode);    // pick Local or Express on the title screen
  T.act('enter'); // title -> running
  for (let guard = 0; guard < 400000 && g().state !== 'end'; guard++) {
    const s = g();
    if (s.state === 'arrived') { T.render(); T.act('enter'); continue; }
    const st = T.STATIONS[s.seg];
    const d = st.pos - s.pos;
    let target;
    if (s.seg === overrunAt) {
      target = s.failed ? s.lever : 3; // floor it straight through the station
    } else {
      let vt = (T.limitAt(s.pos) - 4) / 3.6;
      for (const L of T.LIMITS) if (L.at > s.pos) vt = Math.min(vt, Math.sqrt(((L.lim - 4) / 3.6) ** 2 + 2 * DECEL * (L.at - s.pos)));
      vt = Math.min(vt, Math.sqrt(2 * DECEL * Math.max(0, d - 0.3)) + (d > 3 ? 1 : 0.3));
      if (d < 0.25) target = -3;
      else if (s.v > vt + 0.2) {
        const need = (s.v * s.v) / (2 * Math.max(0.3, d - 0.2));
        target = d < 150 ? -Math.min(3, Math.max(1, Math.ceil((need - 0.02) / 0.35))) : -2;
      } else if (s.v < vt - 1) target = 3;
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
      p5: T.accel(3, 0), p1: T.accel(1, 0), n: T.accel(0, 20), b1: T.accel(-1, 10), b8: T.accel(-3, 10), eb: T.accel(-4, 10),
      lim0: T.limitAt(0), lim150: T.limitAt(150), limEnd: T.limitAt(99999),
    };
  });
  expect(r.p5).toBeGreaterThan(r.p1);
  expect(r.p1).toBeGreaterThan(0);
  expect(r.n).toBeLessThan(0);           // coasting slows down
  expect(r.b8).toBeLessThan(r.b1);       // more brake, more decel
  expect(r.eb).toBeLessThan(r.b8);       // EB is strongest
  expect(r.lim0).toBe(60);
  expect(r.lim150).toBe(110);
  expect(r.limEnd).toBe(90);
});

test('quick legs: the schedule is about half what it was', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train, S = T.STATIONS;
    // Accelerate from a stop on P3 for 30 s on level track.
    let v = 0; for (let i = 0; i < 600; i++) v += T.accel(3, v, 0) * 0.05;
    return {
      local: S.reduce((t, s) => t + (s.run || 0), 0),
      express: S.reduce((t, s) => t + (s.exp || 0), 0),
      after30s: v * 3.6,
    };
  });
  expect(r.local).toBeLessThanOrEqual(505);   // was 835 s of driving before legs were halved
  expect(r.express).toBeLessThanOrEqual(330); // was 605 s
  expect(r.after30s).toBeGreaterThan(70);     // stronger motors reach the higher limits in time
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
  expect(await lever()).toBe(1); // departs on P1
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowUp');
  expect(await lever()).toBe(3); // P3 is the top power notch
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowDown');
  expect(await lever()).toBe(-3); // B3 is the top service brake
  await page.keyboard.press('KeyN');
  expect(await lever()).toBe(0);
  await page.keyboard.press('Space');
  expect(await lever()).toBe(-4); // EB
  await page.keyboard.press('ArrowUp');
  expect(await lever()).toBe(-3); // releasing EB goes to B3
});

test('every departure starts on P1 and the train rolls off', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    const first = T.state.lever;
    for (let i = 0; i < 40; i++) T.step(0.05);
    const v = T.state.v;
    // jump to the next station's stop mark and stop there to depart again
    T.state.pos = T.STATIONS[T.state.seg].pos; T.state.v = 0; T.act('brake'); T.act('brake'); T.step(0.05);
    const arrived = T.state.state;
    T.act('enter');
    return { first, v, arrived, second: T.state.lever };
  });
  expect(r.first).toBe(1);
  expect(r.v).toBeGreaterThan(0);
  expect(r.arrived).toBe('arrived');
  expect(r.second).toBe(1);
});

test('no dark pillar down the middle of the cab view', async ({ page }) => {
  const dark = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true; T.act('enter'); T.render();
    const c = document.getElementById('game').getContext('2d');
    let n = 0;
    for (let y = 30; y < 160; y += 10) { const [r, g, b] = c.getImageData(480, y, 1, 1).data; if (r + g + b < 120) n++; }
    return n;
  });
  expect(dark).toBe(0);
});

test('front and rear cameras show the same landscape as the cab, sides matching', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true; T.act('enter');
    T.state.pos = 2500;
    T.scene.cur = 'seaside'; T.scene.prev = 'seaside'; T.scene.blend = 1;
    const c = document.getElementById('game').getContext('2d');
    // which half of a row is bluer (sea / open sky) than green (hills / meadow)
    const blueSide = (y) => {
      const row = c.getImageData(0, y, 960, 1).data;
      let L = 0, R = 0;
      for (let x = 20; x < 940; x++) { const k = x * 4, d = row[k + 2] - row[k + 1]; if (x < 480) L += d; else R += d; }
      return L > R ? 'left' : 'right';
    };
    const out = {};
    for (const id of ['cab', 'front', 'rear']) {
      T.renderCam(id);
      out[id] = { sky: blueSide(150), ground: blueSide(200) };
    }
    return out;
  });
  expect(r.cab).toEqual({ sky: 'right', ground: 'right' }); // sea on the right going forward
  for (const id of ['front', 'rear']) {
    expect(r[id].sky, `${id} cam backdrop on the sea side`).toBe(r[id].ground);
    expect(r[id].ground, `${id} cam looks back, so the sea is on its left`).toBe('left');
  }
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

test('scenery follows the real towns along the line', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    const at = (pos) => { T.state.pos = pos; for (let i = 0; i < 40; i++) T.step(0.05); T.state.pos = pos; return [T.scene.cur, T.scene.name]; };
    return { start: at(100), coast: at(2200), temples: at(3500), end: at(4250) };
  });
  expect(r.start).toEqual(['town', 'Fujisawa']);
  expect(r.coast).toEqual(['seaside', 'Shichirigahama coast']);
  expect(r.temples[0]).toBe('temple');
  expect(r.end).toEqual(['town', 'Kamakura']);
});

test('stations are real towns, and landmarks sit where they are on the map in every camera', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    const seen = (view) => { T.stats.landmarks = {}; T.drawView(view); return Object.keys(T.stats.landmarks).sort(); };
    const names = T.STATIONS.map((s) => s.name);
    T.state.pos = 800; for (let i = 0; i < 40; i++) T.step(0.05); T.state.pos = 800;
    const approach = seen({ pos: 800, dir: 1, x: 0, h: 3 }); // heading for the sea: the island ahead
    T.state.pos = 2200; for (let i = 0; i < 40; i++) T.step(0.05); T.state.pos = 2200;
    const ahead = seen({ pos: 2200, dir: 1, x: 0, h: 3 });   // along the coast to the east
    const behind = seen({ pos: 2160, dir: -1, x: 0, h: 3 }); // rear camera, looking west
    return { names, approach, ahead, behind };
  });
  expect(r.names[0]).toBe('Fujisawa');
  expect(r.names).toContain('Enoshima');
  expect(r.names[r.names.length - 1]).toBe('Kamakura');
  expect(r.approach).toContain('enoshima');
  expect(r.ahead).toEqual(['cape']);
  expect(r.behind).toEqual(['enoshima', 'fuji']);
});

test('stations are about half a kilometre apart', async ({ page }) => {
  const st = await page.evaluate(() => window.__train.STATIONS.map((s) => s.pos));
  expect(st).toHaveLength(9);
  for (let i = 1; i < st.length; i++) {
    expect(st[i] - st[i - 1]).toBeGreaterThanOrEqual(400);
    expect(st[i] - st[i - 1]).toBeLessThanOrEqual(700);
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

test('P / Esc pause the run, freezing the train and clock; hiding the tab pauses too', async ({ page }) => {
  const read = () => page.evaluate(() => { const s = window.__train.state; return { paused: s.paused, pos: s.pos, clock: s.clock, lever: s.lever }; });
  await page.evaluate(() => { const T = window.__train; T.paused = true; T.act('enter'); for (let i = 0; i < 13; i++) T.act('power'); T.step(1); });
  await page.keyboard.press('KeyP');
  const a = await read();
  expect(a.paused).toBe(true);
  await page.evaluate(() => { const T = window.__train; T.act('brake'); T.step(1); T.step(1); T.render(); });
  const b = await read();
  expect(b).toEqual(a); // nothing moves and the lever is locked while paused
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__train.step(1));
  const c = await read();
  expect(c.paused).toBe(false);
  expect(c.pos).toBeGreaterThan(a.pos);
  expect(c.clock).toBeGreaterThan(a.clock);
  // Switching away from the tab pauses automatically.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect((await read()).paused).toBe(true);
});

test('Express mode passes about half the stops with a tighter timetable and higher limits', async ({ page }) => {
  // The mode is picked on the title screen with the keyboard (▲/▼ toggle, L/E pick).
  const mode = () => page.evaluate(() => window.__train.state.mode);
  expect(await mode()).toBe('local');
  await page.keyboard.press('ArrowUp');
  expect(await mode()).toBe('express');
  await page.keyboard.press('KeyL');
  expect(await mode()).toBe('local');
  await page.keyboard.press('KeyE');
  expect(await mode()).toBe('express');
  // ...and by touch, with the on-screen ▼ button.
  await page.locator('#touch button[data-act="brake"]').click();
  expect(await mode()).toBe('local');
  await page.locator('#touch button[data-act="power"]').click();
  expect(await mode()).toBe('express');

  const lim = await page.evaluate(() => ({ express: window.__train.limitAt(150), passed: window.__train.STATIONS.filter((_, i) => i > 0 && !window.__train.stopsAt(i, 'express')).map((s) => s.name) }));
  expect(lim.express).toBe(125); // 110 on Local
  expect(lim.passed).toEqual(['Kugenuma', 'Koshigoe', 'Shichirigahama', 'Hase']);

  // Passed stations show a PASS board instead of a STOP mark.
  const pass = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    const before = T.stats.passDrawn;
    T.state.pos = T.STATIONS[1].pos - 120;
    T.render();
    T.state.pos = 0;
    return T.stats.passDrawn - before;
  });
  expect(pass).toBeGreaterThan(0);

  const run = await page.evaluate(autopilot, { mode: 'express' });
  expect(run.state).toBe('end');
  expect(run.results.map((r) => r.name)).toEqual(['Enoshima', 'Kamakura-Kokomae', 'Inamuragasaki', 'Kamakura']);
  for (const r of run.results) {
    expect(r.failed, `${r.name} overrun`).toBe(false);
    expect(Math.abs(r.d), `${r.name} stop error (m)`).toBeLessThan(5);
    expect(r.total, `${r.name} total`).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => window.__train.state.passed.length)).toBe(4);
  // The end screen names the mode.
  await page.evaluate(() => window.__train.render());
  // Tighter timetable: each Express run is much shorter than the Local runs it replaces
  // (including their station dwells), yet the autopilot still arrives on time.
  const tt = await page.evaluate(() => {
    const S = window.__train.STATIONS, out = [];
    let prev = 0;
    S.forEach((s, i) => { if (i > 0 && s.exp !== undefined) { let local = 0; for (let k = prev + 1; k <= i; k++) local += S[k].run + (k < i ? 30 : 0); out.push([s.exp, local]); prev = i; } });
    return out;
  });
  for (const [exp, local] of tt) expect(exp).toBeLessThan(local * 0.75);
  for (const r of run.results) expect(r.timePts, `${r.name} on time`).toBeGreaterThan(0);
});

test('painted scenes with light that shifts from morning through evening to night', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    T.setWeather('clear');
    const sky = () => { const d = document.getElementById('game').getContext('2d').getImageData(300, 40, 1, 1).data; return [d[0], d[1], d[2]]; };
    const end = T.STATIONS[T.STATIONS.length - 1].pos;
    T.state.pos = 0; T.render(); const morning = sky();
    T.state.pos = end * 0.76; T.render(); const evening = sky();
    T.state.pos = end; const g0 = T.stats.glows; T.render(); const night = sky();
    return { morning, evening, night, glows: T.stats.glows - g0, phases: [0, end / 2, end * 0.76, end].map((p) => T.lightAt(p).phase), scene: T.scene.cur };
  });
  expect(['town', 'pines', 'seaside', 'temple']).toContain(r.scene);
  expect(r.phases).toEqual(['morning', 'midday', 'evening', 'night']);
  expect(r.evening[0] - r.evening[2]).toBeGreaterThan(r.morning[0] - r.morning[2]); // warmer sky in the evening
  expect(r.night.reduce((a, b) => a + b)).toBeLessThan(r.morning.reduce((a, b) => a + b) / 2); // dark night sky
  expect(r.glows, 'windows, lamps and headlights shine at night').toBeGreaterThan(0);
});

test('rain or snow rolls in partway along the run, in the cab and every camera', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    const wx = T.state.wx, end = T.STATIONS[T.STATIONS.length - 1].pos;
    const picked = { kind: wx.kind, from: wx.from, startClear: T.weatherAt(0).amt, peak: T.weatherAt(wx.from + 500).amt };
    const pixel = (x, y) => [...document.getElementById('game').getContext('2d').getImageData(x, y, 1, 1).data].slice(0, 3);
    const look = (kind) => {
      T.setWeather(kind, 500, end);
      T.state.pos = 1000; T.state.seg = 3;
      const p0 = T.stats.precip; T.render();
      return { precip: T.stats.precip - p0, sky: pixel(300, 40), ground: pixel(200, 420), label: T.weatherAt(1000).amt };
    };
    const clear = look('clear'), rain = look('rain'), snow = look('snow');
    T.state.state = 'running'; T.setWeather('rain', 1050, end); T.state.v = 20; T.state.lever = 0;
    for (let i = 0; i < 200; i++) T.step(0.05);
    return { picked, clear, rain, snow, msg: T.state.msg, insets: T.stats.lastInsets.length };
  });
  expect(['rain', 'snow']).toContain(r.picked.kind);
  expect(r.picked.from).toBeGreaterThan(1500); // starts partway, never at the first stations
  expect(r.picked.startClear).toBe(0);
  expect(r.picked.peak).toBe(1);
  expect(r.clear.precip).toBe(0);
  expect(r.rain.precip).toBeGreaterThan(170); // cab view plus the camera insets
  expect(r.snow.precip).toBeGreaterThan(170);
  const sum = (c) => c[0] + c[1] + c[2], sat = (c) => Math.max(...c) - Math.min(...c);
  expect(sat(r.rain.sky)).toBeLessThan(sat(r.clear.sky)); // grey overcast sky
  expect(sum(r.snow.ground)).toBeGreaterThan(sum(r.clear.ground) + 60); // snow settles on the ground
  expect(r.msg).toBe('Rain is moving in');
});

test('living world: trees, birds and evening fireflies are drawn', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.__train;
    T.paused = true;
    T.act('enter');
    const s0 = { ...T.stats };
    T.state.pos = 8400; // evening, near the last station
    for (let i = 0; i < 5; i++) T.render();
    return { trees: T.stats.trees - s0.trees, birds: T.stats.birds - s0.birds, fireflies: T.stats.fireflies - s0.fireflies };
  });
  expect(r.trees).toBeGreaterThan(0);
  expect(r.birds).toBeGreaterThan(0);
  expect(r.fireflies).toBeGreaterThan(0);
});

test('power and brake sounds: soft inverter whine follows speed, air hiss only on heavy braking', async ({ page }) => {
  const m = await page.evaluate(() => {
    const s = window.__train.sound, kmh = (k) => k / 3.6;
    return {
      p1slow: s.mix(kmh(10), 1, 'running'), p3slow: s.mix(kmh(10), 3, 'running'), p3fast: s.mix(kmh(80), 3, 'running'),
      coast: s.mix(kmh(60), 0, 'running'), b2fast: s.mix(kmh(60), -2, 'running'), b2crawl: s.mix(kmh(3), -2, 'running'),
      b3: s.mix(kmh(40), -3, 'running'), eb: s.mix(kmh(40), -4, 'running'), stopped: s.mix(0, -3, 'arrived'),
    };
  });
  expect(m.p3fast.whineHz).toBeGreaterThan(m.p3slow.whineHz);  // pitch rises with speed
  expect(m.p3slow.whine).toBeGreaterThan(m.p1slow.whine);      // more power, a little louder
  expect(m.p3fast.whine).toBeLessThan(0.05);                   // but always soft
  expect(m.coast.whine).toBe(0);                               // silent when coasting
  expect(m.b2fast.whine).toBeGreaterThan(0);                   // regenerative braking whines...
  expect(m.b2crawl.whine).toBe(0);                             // ...and fades out near a stop
  expect(m.b2fast.hiss).toBe(0);                               // no hiss on light braking
  expect(m.b3.hiss).toBeGreaterThan(0);
  expect(m.eb.hiss).toBeGreaterThan(m.b3.hiss);
  expect(m.stopped.whine + m.stopped.hiss).toBe(0);
});
