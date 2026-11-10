// AI playtest: three imperfect automatic drivers play the whole line in Local and Express, so a
// reviewer can see how a change plays, not only whether it works.
//   late:  holds near the limit and brakes late and hard for the STOP mark
//   early: drives well under the limit and brakes early and gently, aiming a little short
//   noisy: a careless driver with misjudged speed and distance and random lever slips (seeded)
// Writes a per-station table (score, stop error, time margin, overruns) to the CI job summary and
// balance-report/balance.json (a CI artifact). Fails only if a station becomes impossible: every
// driver overran it or scored nothing there.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const OUT = path.join(__dirname, '..', 'balance-report');

const DRIVERS = {
  late: { decel: 0.8, margin: 2, aim: 0, noise: 0, slip: 0 },
  early: { decel: 0.3, margin: 10, aim: 3, noise: 0, slip: 0 },
  noisy: { decel: 0.45, margin: 4, aim: 0, noise: 2.5, slip: 0.06, seed: 7 },
};

// Runs inside the page. Like the smoke test's autopilot, it moves the lever one notch per step
// through act(), with a planned braking rate, a speed margin under the limit, an aim point short of
// the STOP mark, and optional noise on what it sees and random lever slips.
function drive({ mode, decel, margin, aim, noise, slip, seed = 1, dt = 0.05 }) {
  const T = window.__train;
  T.paused = true;
  let r = seed >>> 0;
  const rnd = () => { r = (r * 1664525 + 1013904223) >>> 0; return r / 4294967296; };
  const g = () => T.state;
  T.act(mode);
  T.act('enter');
  let seenV = 0, seenD = 0;
  for (let guard = 0; guard < 400000 && g().state !== 'end'; guard++) {
    const s = g();
    if (s.state === 'arrived') { T.act('enter'); continue; }
    const st = T.STATIONS[s.seg];
    // Misjudged readings change only twice a second, like a driver glancing at the gauges.
    if (guard % 10 === 0) { seenV = noise * (rnd() - 0.5) * 2; seenD = noise * (rnd() - 0.5) * 4; }
    const v = Math.max(0, s.v + seenV);
    const d = st.pos - s.pos - aim + (st.pos - s.pos > 20 ? seenD : 0);
    let vt = (T.limitAt(s.pos) - margin) / 3.6;
    for (const L of T.LIMITS) if (L.at > s.pos) vt = Math.min(vt, Math.sqrt(((L.lim - margin) / 3.6) ** 2 + 2 * decel * (L.at - s.pos)));
    vt = Math.min(vt, Math.sqrt(2 * decel * Math.max(0, d - 0.3)) + (d > 3 ? 1 : 0.3));
    let target;
    if (s.failed) target = -3;
    else if (d < 0.25) target = -3;
    else if (v > vt + 0.2) {
      const need = (v * v) / (2 * Math.max(0.3, d - 0.2));
      target = d < 150 ? -Math.min(3, Math.max(1, Math.ceil((need - 0.02) / 0.35))) : -2;
    } else if (v < vt - 1) target = 3;
    else if (v < vt - 0.3) target = 1;
    else target = 0;
    if (slip && rnd() < slip) target = s.lever + (rnd() < 0.5 ? 1 : -1); // a slip of the hand
    if (target > s.lever) T.act('power');
    else if (target < s.lever) T.act('brake');
    T.step(dt);
  }
  return { state: g().state, score: g().score, results: g().results.map((x) => ({ name: x.name, d: x.d, diff: x.diff, total: x.total, pen: x.pen, failed: x.failed })) };
}

const sign = (x, digits) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(digits);
// One table cell: points, stop error (+ short of the mark, − past it) and time margin (+ early, − late).
const cell = (r) => r.failed ? '**OVERRUN** 0' : `${r.total} · ${sign(r.d, 1)} m · ${sign(-r.diff, 0)} s`;

test('balance: three imperfect drivers can finish every station in Local and Express', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
  const report = { drivers: DRIVERS, modes: {} };
  const impossible = [];
  let md = '### AI playtest: balance per station\n\nEach cell: points · stop error (+ short, − past the mark) · time margin (+ early, − late).\n\n';
  for (const mode of ['local', 'express']) {
    const runs = {};
    for (const [name, cfg] of Object.entries(DRIVERS)) {
      await page.evaluate(() => window.__train.save.clear()); // start fresh, never resume a saved run
      await page.reload();
      await page.waitForFunction(() => window.__train && window.__train.stats.frames > 2);
      runs[name] = await page.evaluate(drive, { mode, ...cfg });
      expect(runs[name].state, `${name} driver finishes ${mode}`).toBe('end');
    }
    const names = Object.keys(DRIVERS);
    const stations = runs[names[0]].results.map((r) => r.name);
    const rows = stations.map((st, i) => {
      const per = Object.fromEntries(names.map((n) => [n, runs[n].results[i]]));
      const dead = names.every((n) => per[n].failed || per[n].total === 0);
      if (dead) impossible.push(`${mode}: ${st}`);
      return { station: st, impossible: dead, overruns: names.filter((n) => per[n].failed).length, drivers: per };
    });
    report.modes[mode] = { totals: Object.fromEntries(names.map((n) => [n, runs[n].score])), stations: rows };
    md += `**${mode === 'local' ? 'Local' : 'Express'}**\n\n| Station | ${names.join(' | ')} | Overruns |\n|---|${names.map(() => '---|').join('')}---|\n`;
    for (const row of rows) md += `| ${row.impossible ? '⚠️ ' : ''}${row.station} | ${names.map((n) => cell(row.drivers[n])).join(' | ')} | ${row.overruns} |\n`;
    md += `| **Total** | ${names.map((n) => `**${runs[n].score}**`).join(' | ')} | ${rows.reduce((a, r) => a + r.overruns, 0)} |\n\n`;
  }
  report.impossible = impossible;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'balance.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'balance.md'), md);
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  expect(impossible, 'stations no driver could complete').toEqual([]);
});
