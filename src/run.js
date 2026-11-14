// The run: game state `g`, weather, departures, judging stops, and the per-step update.
import { STATIONS, useLimits, stopsAt, CAT_BONUS, limitAt, gradeAt, catsBetween } from './route.js';
import { B_MAX, EB, accel } from './physics.js';
import { save, rankOf } from './save.js';

// ---------- Game state ----------
let g;
function reset() {
  g = {
    state: 'title', // title | ready | running | arrived | end
    mode: g ? g.mode : (save.data.settings.mode === 'express' ? 'express' : 'local'), // kept when playing again
    passed: [],                 // stations passed without stopping (Express)
    pos: 0, v: 0, lever: -B_MAX,
    seg: 1,                     // index of the station we're heading to (set by setMode)
    clock: 8 * 3600,            // game clock (s)
    sched: 0,                   // scheduled arrival
    score: 0, stationScore: 0, overspeedPen: 0, overTimer: 0, cats: 0,
    results: [], msg: '', msgT: 0, timer: 0, failed: false,
    paused: false,              // player pause (P / Esc / Pause button); only while running
    wx: pickWeather(), wxSaid: 0, // this run's weather (see weatherAt)
  };
}
// ---------- Weather: rain or snow rolls in partway along the run, then may clear ----------
const WX_RAMP = 200; // metres over which it sets in and clears
function pickWeather() {
  const end = STATIONS[STATIONS.length - 1].pos, from = 1600 + Math.random() * 900;
  return { kind: Math.random() < 0.5 ? 'rain' : 'snow', from, to: Math.min(end + WX_RAMP, from + 1200 + Math.random() * 1500) };
}
// How heavy the weather is at a position: 0 = clear, 1 = full rain or snow.
function weatherAt(pos, wx = g.wx) {
  const amt = wx.kind === 'clear' ? 0 : Math.max(0, Math.min(1, (pos - wx.from) / WX_RAMP, (wx.to - pos) / WX_RAMP));
  return { kind: wx.kind, amt };
}
reset();
setMode('local');

function setMode(m) { g.mode = m; if (save.data.settings.mode !== m) save.setting('mode', m); useLimits(m); g.seg = nextStop(0); }
function nextStop(i) { do i++; while (i < STATIONS.length - 1 && !stopsAt(i, g.mode)); return i; }
function startSegment() {
  const st = STATIONS[g.seg];
  g.sched = g.clock + (g.mode === 'express' ? st.exp : st.run);
  g.overspeedPen = 0; g.failed = false; g.cats = 0;
  g.state = 'running';
  g.lever = 1; // every departure starts on P1
  flash('Depart for ' + st.name + '!');
}
function flash(m, t = 2.5) { g.msg = m; g.msgT = t; }

function judge() {
  const st = STATIONS[g.seg];
  const d = st.pos - g.pos;            // + short, - overrun
  const err = Math.abs(d);
  const diff = g.clock - g.sched;      // + late, - early
  let stopPts = g.failed ? 0 : Math.round(1000 * Math.max(0, 1 - err / 10));
  let perfect = !g.failed && err < 0.3 ? 500 : 0;
  let timePts = g.failed ? 0 : Math.round(Math.max(0, 500 - Math.abs(diff) * (diff > 0 ? 10 : 5)));
  let smooth = !g.failed && g.lever >= -2 && g.lever < 0 ? 200 : 0;
  const catPts = g.cats * CAT_BONUS;
  const total = g.failed ? 0 : Math.max(0, stopPts + perfect + timePts + smooth + catPts - g.overspeedPen);
  g.score += total;
  g.lastResult = { name: st.name, d, diff, stopPts, perfect, timePts, smooth, pen: g.overspeedPen, cats: g.cats, catPts, total, failed: g.failed };
  g.results.push(g.lastResult);
  g.state = 'arrived';
  g.timer = 0; g.msgT = 0;
  if (g.seg < STATIONS.length - 1) saveRun(); else finishRun();
}
// Remembers the run at the station just reached, so it can be resumed after the page closes.
function saveRun() {
  save.setRun({ mode: g.mode, seg: g.seg, pos: g.pos, clock: g.clock, sched: g.sched, score: g.score,
    results: g.results, passed: g.passed, wx: g.wx, wxSaid: g.wxSaid, savedAt: new Date().toISOString() });
}
function finishRun() {
  save.setRun(null);
  g.newBest = save.record(g.mode, g.score, rankOf(g.score, g.mode));
}
// Puts a saved run back: the train waits at the station it last stopped at, ready to depart.
function resumeRun() {
  const r = save.data.run;
  if (!r || !STATIONS[r.seg] || r.seg >= STATIONS.length - 1) { save.setRun(null); return false; }
  setMode(r.mode === 'express' ? 'express' : 'local');
  Object.assign(g, { seg: r.seg, pos: r.pos, v: 0, lever: -B_MAX, clock: r.clock, sched: r.sched, score: r.score,
    results: r.results || [], passed: r.passed || [], wx: r.wx || g.wx, wxSaid: r.wxSaid || 0 });
  g.lastResult = g.results[g.results.length - 1];
  g.state = 'arrived'; g.resumed = true;
  flash('Welcome back at ' + STATIONS[r.seg].name, 2.5);
  return true;
}

function update(dt) {
  if (g.msgT > 0) g.msgT -= dt;
  if (g.state !== 'running') return;
  g.clock += dt;
  const a = accel(g.lever, g.v, gradeAt(g.pos));
  g.v = Math.max(0, g.v + a * dt);
  if (g.v === 0 && g.lever <= 0) g.v = 0;
  const before = g.pos;
  g.pos += g.v * dt;
  g.cats += catsBetween(before, g.pos).length;
  const wx = weatherAt(g.pos);
  if (g.wxSaid === 0 && wx.amt > 0.05) { g.wxSaid = 1; flash(wx.kind === 'rain' ? 'Rain is moving in' : 'Snow is starting to fall', 2.5); }
  if (g.wxSaid === 1 && wx.amt === 0 && g.pos > g.wx.to) { g.wxSaid = 2; flash('The sky is clearing', 2); }
  // Passing a station without stopping (Express): no judging, just a note.
  for (let i = 1; i < g.seg; i++) {
    if (!g.passed.includes(i) && before < STATIONS[i].pos && g.pos >= STATIONS[i].pos) {
      g.passed.push(i); flash('Passing ' + STATIONS[i].name + ' · Express', 2);
    }
  }

  // Speed limit
  const kmh = g.v * 3.6, lim = limitAt(g.pos);
  if (kmh > lim + 2) {
    g.overTimer += dt;
    while (g.overTimer >= 0.1) { g.overTimer -= 0.1; g.overspeedPen += 3; }
  } else g.overTimer = 0;

  // Stopping
  const st = STATIONS[g.seg];
  const d = st.pos - g.pos;
  if (d < -30 && !g.failed) {
    g.failed = true; g.lever = EB;
    flash('OVERRUN! Emergency brake.', 3);
  }
  if (g.v < 0.01 && g.lever < 0 && d < 150) {
    if (d <= 5 || g.failed) judge();
    else if (g.msgT <= 0) flash('Stopped short: ' + d.toFixed(1) + ' m to go', 1.5);
  }
}

export { g, reset, weatherAt, setMode, nextStop, startSegment, flash, resumeRun, update };
