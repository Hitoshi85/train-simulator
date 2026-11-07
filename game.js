// Aozora Line – a tiny original train-driving game.
// Drive between fictional stations, respect speed limits, stop on the mark on time.
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const VIEW_H = 440;          // height of the 3D view; the dashboard is below
  const HORIZON = 170;
  const CAM_H = 3;             // camera height (m)
  const FOCAL = 600;           // projection focal length (px)

  // ---------- Route (all fictional) ----------
  const STATIONS = [
    { name: 'Hinata',     pos: 0 },
    { name: 'Kawabe',     pos: 1800, run: 150 },
    { name: 'Momijidai',  pos: 4200, run: 175 },
    { name: 'Shiokaze',   pos: 6000, run: 145 },
    { name: 'Tsukimino',  pos: 8600, run: 190 },
  ];
  const LIMITS = [
    { at: 0, lim: 45 }, { at: 250, lim: 85 }, { at: 1450, lim: 70 },
    { at: 1900, lim: 85 }, { at: 3000, lim: 55 }, { at: 3600, lim: 85 },
    { at: 4350, lim: 75 }, { at: 5300, lim: 60 }, { at: 6150, lim: 90 },
    { at: 7900, lim: 70 },
  ];
  const DWELL = 30;
  const CAT_BONUS = 2; // points per cat spotted on the way // scheduled seconds at each station

  const limitAt = (p) => { let l = LIMITS[0].lim; for (const s of LIMITS) if (p >= s.at) l = s.lim; return l; };
  const curvature = (p) => 0.0007 * Math.sin(p / 520) * Math.sin(p / 1300 + 1);

  // ---------- Train physics ----------
  // lever: -9 = EB, -8..-1 = B8..B1, 0 = N, 1..5 = P1..P5
  const leverName = (l) => l === -9 ? 'EB' : l < 0 ? 'B' + (-l) : l === 0 ? 'N' : 'P' + l;
  function accel(lever, v) {
    const kmh = v * 3.6;
    let a = 0;
    if (lever > 0) a = lever * 0.17 * (kmh < 40 ? 1 : 40 / kmh);
    else if (lever === -9) a = -1.4;
    else if (lever < 0) a = lever * 0.13;
    a -= 0.02 + 0.00003 * v * v; // rolling + air resistance
    return a;
  }

  // ---------- Game state ----------
  let g;
  function reset() {
    g = {
      state: 'title', // title | ready | running | arrived | end
      pos: 0, v: 0, lever: -8,
      seg: 1,                     // index of the station we're heading to
      clock: 8 * 3600,            // game clock (s)
      sched: 0,                   // scheduled arrival
      score: 0, stationScore: 0, overspeedPen: 0, overTimer: 0, cats: 0,
      results: [], msg: '', msgT: 0, timer: 0, failed: false,
    };
  }
  reset();

  function startSegment() {
    const st = STATIONS[g.seg];
    g.sched = g.clock + st.run;
    g.overspeedPen = 0; g.failed = false; g.cats = 0;
    g.state = 'running';
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
    let smooth = !g.failed && g.lever >= -3 && g.lever < 0 ? 200 : 0;
    const catPts = g.cats * CAT_BONUS;
    const total = Math.max(0, stopPts + perfect + timePts + smooth + catPts - g.overspeedPen);
    g.score += total;
    g.lastResult = { name: st.name, d, diff, stopPts, perfect, timePts, smooth, pen: g.overspeedPen, cats: g.cats, catPts, total, failed: g.failed };
    g.results.push(g.lastResult);
    g.state = 'arrived';
    g.timer = 0; g.msgT = 0;
  }

  function update(dt) {
    if (g.msgT > 0) g.msgT -= dt;
    if (g.state !== 'running') return;
    g.clock += dt;
    const a = accel(g.lever, g.v);
    g.v = Math.max(0, g.v + a * dt);
    if (g.v === 0 && g.lever <= 0) g.v = 0;
    const before = g.pos;
    g.pos += g.v * dt;
    g.cats += catsBetween(before, g.pos).length;

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
      g.failed = true; g.lever = -9;
      flash('OVERRUN! Emergency brake.', 3);
    }
    if (g.v < 0.01 && g.lever < 0 && d < 150) {
      if (d <= 5 || g.failed) judge();
      else if (g.msgT <= 0) flash('Stopped short: ' + d.toFixed(1) + ' m to go', 1.5);
    }
  }

  // ---------- Input ----------
  function act(a) {
    if (a === 'enter') {
      if (g.state === 'title') { g.state = 'ready'; g.lever = -8; flash('Doors closed. Release brake and power up!', 3); startSegment(); }
      else if (g.state === 'arrived') {
        if (g.seg >= STATIONS.length - 1) { g.state = 'end'; }
        else {
          g.clock = Math.max(g.clock + 15, g.sched + DWELL);
          g.seg++; g.lever = -8; startSegment();
        }
      } else if (g.state === 'end') reset();
      return;
    }
    if (g.state !== 'running') return;
    if (a === 'power') g.lever = Math.min(5, g.lever === -9 ? -8 : g.lever + 1);
    else if (a === 'brake') g.lever = Math.max(-8, g.lever === -9 ? -9 : g.lever - 1);
    else if (a === 'neutral') g.lever = 0;
    else if (a === 'eb') g.lever = -9;
  }
  const KEYS = { ArrowUp: 'power', KeyW: 'power', ArrowDown: 'brake', KeyS: 'brake', KeyN: 'neutral', Space: 'eb', Enter: 'enter', NumpadEnter: 'enter' };
  addEventListener('keydown', (e) => { const a = KEYS[e.code]; if (a) { e.preventDefault(); if (!e.repeat || a !== 'enter') act(a); } });
  document.querySelectorAll('#touch button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); act(b.dataset.act); }));
  canvas.addEventListener('pointerdown', () => { if (g.state !== 'running') act('enter'); });

  // ---------- Rendering ----------
  // Lateral offset of the track at distance z ahead (approximate curve integration)
  const offCache = [];
  function project(x, y, z) {
    const zi = Math.min(offCache.length - 1, Math.max(0, Math.round(z / 5)));
    const off = offCache[zi];
    return { x: W / 2 + (x - off) * FOCAL / z, y: HORIZON + (CAM_H - y) * FOCAL / z, s: FOCAL / z };
  }
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  // ---------- Scenery: three scenes, a random new one every 10 s, faded ----------
  const SCENES = ['peaks', 'canyon', 'coast'];
  const SCENE_NAMES = { peaks: 'Snowy Peaks', canyon: 'Red-Rock Canyon', coast: 'Coastal Cliffs' };
  const scene = { cur: 'peaks', prev: 'peaks', blend: 1, t: 0 };
  function updateScene(dt) {
    scene.t += dt;
    if (scene.blend < 1) scene.blend = Math.min(1, scene.blend + dt / 1.5);
    if (scene.t >= 10) {
      scene.t = 0;
      const others = SCENES.filter((n) => n !== scene.cur);
      scene.prev = scene.cur; scene.cur = others[Math.floor(Math.random() * others.length)];
      scene.blend = 0;
      if (g.state === 'running') flash('Now entering: ' + SCENE_NAMES[scene.cur], 2);
    }
  }
  const SKY = {
    peaks: ['#3f7fd0', '#dbeaf7'], canyon: ['#e07a3c', '#f6d29a'], coast: ['#2b8bd6', '#bfe7f5'],
  };
  const GROUND = { peaks: ['#a9c3a0', '#3e6b3a'], canyon: ['#d89a62', '#9c4f2c'], coast: ['#9fc46a', '#4d8a35'] };
  function drawBackground(name, alpha, pan) {
    const now = performance.now() / 1000;
    let grd = ctx.createLinearGradient(0, 0, 0, HORIZON);
    grd.addColorStop(0, SKY[name][0]); grd.addColorStop(1, SKY[name][1]);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, HORIZON);
    if (name === 'peaks') {
      // far range then near jagged snowy peaks
      for (const [col, base, amp, f, ph] of [['#8fa3bd', 70, 50, 70, 0], ['#5d6f86', 40, 90, 110, 3]]) {
        const pts = [];
        for (let x = -60; x <= W + 60; x += 15) {
          const wx = x + pan * (base > 50 ? 0.5 : 1);
          const n = Math.abs(Math.sin(wx / f + ph)) * amp + Math.abs(Math.sin(wx / (f * 0.37) + ph * 2)) * amp * 0.35;
          pts.push([x, HORIZON - base * 0.3 - n]);
        }
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-60, HORIZON);
        pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(W + 60, HORIZON); ctx.fill();
        // snow caps: clip to the mountain, fill the top band white
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#f4f8fc';
        ctx.beginPath(); ctx.moveTo(-60, HORIZON - base * 0.3 - amp * 0.75);
        pts.forEach(([x, y]) => ctx.lineTo(x, Math.min(y + 18, HORIZON - base * 0.3 - amp * 0.55 + 8 * Math.sin(x / 13))));
        ctx.lineTo(W + 60, -10); ctx.lineTo(-60, -10); ctx.fill();
        ctx.restore();
      }
    } else if (name === 'canyon') {
      // sun
      ctx.fillStyle = 'rgba(255,240,180,.9)'; ctx.beginPath(); ctx.arc(760 + pan * 0.1 % 200, 60, 26, 0, 7); ctx.fill();
      // mesas and buttes with rock bands
      for (const [col, band, y0, spacing, seed] of [['#b5643a', '#9a4e2b', 70, 260, 1], ['#8e3f22', '#73311a', 45, 200, 7]]) {
        for (let i = -2; i < 8; i++) {
          const k = i + Math.floor(-pan / spacing);
          const cx = k * spacing + pan + (hash(k + seed) * 80);
          const w = 70 + hash(k + seed + 3) * 120, h = y0 + hash(k + seed + 5) * 40;
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(cx - w / 2 - 25, HORIZON); ctx.lineTo(cx - w / 2, HORIZON - h); ctx.lineTo(cx + w / 2, HORIZON - h);
          ctx.lineTo(cx + w / 2 + 25, HORIZON); ctx.fill();
          ctx.fillStyle = band;
          for (let b = 1; b < 4; b++) ctx.fillRect(cx - w / 2 - 6 * b, HORIZON - h + b * h / 4, w + 12 * b, 3);
        }
      }
    } else if (name === 'coast') {
      // headland cliffs on the left, open sea on the right
      ctx.fillStyle = '#1d5f9a'; ctx.fillRect(0, HORIZON - 4, W, 4);
      ctx.fillStyle = '#6b6f5a';
      ctx.beginPath(); ctx.moveTo(0, HORIZON);
      for (let x = 0; x <= W * 0.45; x += 15) ctx.lineTo(x, HORIZON - 55 + x * 0.1 + 10 * Math.sin((x + pan) / 40));
      ctx.lineTo(W * 0.45 + 20, HORIZON); ctx.fill();
      ctx.fillStyle = '#5c8d3a'; ctx.fillRect(0, HORIZON - 60, W * 0.42, 6);
    }
    // ground
    grd = ctx.createLinearGradient(0, HORIZON, 0, VIEW_H);
    grd.addColorStop(0, GROUND[name][0]); grd.addColorStop(1, GROUND[name][1]);
    ctx.fillStyle = grd; ctx.fillRect(0, HORIZON, W, VIEW_H - HORIZON);
    if (name === 'coast') {
      // the land ends in a cliff edge at x = 11 m; beyond it, the open sea with waves rolling in
      const ZMIN = 7, ZMAX = 600;
      ctx.save();
      ctx.fillStyle = '#1f6fb0';
      ctx.beginPath();
      for (let z = ZMIN; z <= ZMAX; z *= 1.08) { const p = project(11, 0, z); ctx.lineTo(p.x, p.y); }
      ctx.lineTo(W, HORIZON); ctx.lineTo(W, VIEW_H); ctx.fill();
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      for (let row = 0; row < 14; row++) {
        const xw = 13 + ((row * 9 - now * 4) % 126 + 126) % 126;
        for (let s = Math.ceil(g.pos / 18) * 18; s < g.pos + 300; s += 18) {
          const z = s - g.pos + (hash(s + row) * 9); if (z < ZMIN) continue;
          const a = project(xw, 0, z), b = project(xw, 0, z + 7);
          ctx.lineWidth = Math.max(1, 0.2 * a.s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.restore();
      // rocky cliff edge
      ctx.fillStyle = '#7a6a55';
      ctx.beginPath();
      for (let z = ZMIN; z <= ZMAX; z *= 1.08) { const p = project(10.2, 0, z); ctx.lineTo(p.x, p.y); }
      for (let z = ZMAX; z >= ZMIN; z /= 1.08) { const p = project(11, 0, z); ctx.lineTo(p.x, p.y); }
      ctx.fill();
      // spray where the waves crash
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let s = Math.ceil(g.pos / 6) * 6; s < g.pos + 200; s += 6) {
        const z = s - g.pos; if (z < ZMIN) continue;
        const burst = Math.max(0, Math.sin(now * 2.2 + hash(s) * 6.3));
        const p = project(11.6, burst * 2.5, z);
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, (0.3 + 0.6 * burst) * p.s), 0, 7); ctx.fill();
      }
    }
  }
  function drawProp(name, b, k) {
    const s = b.s;
    if (name === 'peaks') { // pine tree
      ctx.fillStyle = '#4a3220'; ctx.fillRect(b.x - 0.25 * s, b.y - 1.5 * s, 0.5 * s, 1.5 * s);
      ctx.fillStyle = k < 0.2 ? '#1f4d2b' : '#2c6a3a';
      for (let i = 0; i < 3; i++) {
        const y = b.y - (1.2 + i * 1.8) * s, w = (2.4 - i * 0.6) * s;
        ctx.beginPath(); ctx.moveTo(b.x - w, y); ctx.lineTo(b.x + w, y); ctx.lineTo(b.x, y - 3 * s); ctx.fill();
      }
      ctx.fillStyle = '#f4f8fc'; ctx.beginPath(); ctx.moveTo(b.x - 0.6 * s, b.y - 6.6 * s); ctx.lineTo(b.x + 0.6 * s, b.y - 6.6 * s); ctx.lineTo(b.x, b.y - 7.8 * s); ctx.fill();
    } else if (name === 'canyon') {
      if (k < 0.3) { // red boulder
        ctx.fillStyle = '#9c4a28'; ctx.beginPath(); ctx.ellipse(b.x, b.y - 1 * s, 2.2 * s, 1.3 * s, 0, 0, 7); ctx.fill();
      } else { // saguaro cactus
        ctx.fillStyle = '#3f7d3a';
        ctx.fillRect(b.x - 0.35 * s, b.y - 5 * s, 0.7 * s, 5 * s);
        ctx.fillRect(b.x - 1.4 * s, b.y - 3.2 * s, 0.5 * s, 1.6 * s); ctx.fillRect(b.x - 1.4 * s, b.y - 1.9 * s, 1.1 * s, 0.45 * s);
        ctx.fillRect(b.x + 0.9 * s, b.y - 4 * s, 0.5 * s, 1.6 * s); ctx.fillRect(b.x + 0.3 * s, b.y - 2.6 * s, 1.1 * s, 0.45 * s);
      }
    } else { // coast: windswept palm
      ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = Math.max(1, 0.4 * s);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x + 1 * s, b.y - 3 * s, b.x + 0.4 * s, b.y - 6 * s); ctx.stroke();
      ctx.strokeStyle = '#2f8a3c'; ctx.lineWidth = Math.max(1, 0.35 * s);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55;
        ctx.beginPath(); ctx.moveTo(b.x + 0.4 * s, b.y - 6 * s);
        ctx.quadraticCurveTo(b.x + 0.4 * s + Math.cos(a) * 2 * s, b.y - 6 * s + Math.sin(a) * 2 * s - 0.5 * s, b.x + 0.4 * s + Math.cos(a) * 3 * s, b.y - 6 * s + Math.sin(a) * 1.5 * s + 1.2 * s);
        ctx.stroke();
      }
    }
  }

  // ---------- Cats (lots of them) ----------
  const CAT_COLORS = [
    ['#e8913a', '#c46d1e'], ['#2a2a2e', '#111'], ['#f2f0ea', '#cfcac0'], ['#8d8f96', '#6b6d73'], ['#f2f0ea', '#e8913a'], ['#7a5236', '#4f3322'],
  ];
  const CAT_STEP = 2.5;
  function catAt(s) {
    const h = hash(s * 1.37 + 0.21);
    if (h > 0.7) return null;
    const side = h < 0.35 ? -1 : 1;
    let x = side * (2.4 + hash(s + 9.1) * 6), y = 0;
    const onPlatform = STATIONS.some((S) => s > S.pos - 160 && s < S.pos + 30);
    if (onPlatform && x < 0) { if (x > -3.3) x = -3.3 - hash(s + 2) * 4; y = 1.1; }
    return { s, x, y, col: CAT_COLORS[Math.floor(hash(s + 5.3) * CAT_COLORS.length)], walk: hash(s + 7.7) < 0.35, face: hash(s + 3.3) < 0.5 ? -1 : 1, ph: hash(s + 1.1) * 6 };
  }
  function catsBetween(a, b) {
    const out = [];
    for (let s = Math.ceil(a / CAT_STEP) * CAT_STEP; s < b; s += CAT_STEP) { const c = catAt(s); if (c) out.push(c); }
    return out;
  }
  function drawCat(c, p) {
    const s = p.s * 1.4; // cats drawn a bit larger than life so you can spot them
    if (s < 1.2) return;
    const t = performance.now() / 1000 + c.ph;
    const [body, accent] = c.col, f = c.face;
    const bob = c.walk ? Math.abs(Math.sin(t * 6)) * 0.04 * s : 0;
    const x = p.x, y = p.y - bob;
    ctx.fillStyle = body;
    if (c.walk) {
      // walking: long body, legs swinging
      ctx.fillRect(x - 0.3 * s, y - 0.28 * s, 0.6 * s, 0.18 * s);
      ctx.strokeStyle = body; ctx.lineWidth = Math.max(1, 0.06 * s);
      for (const [lx, ph] of [[-0.25, 0], [0.22, Math.PI]]) {
        const sw = Math.sin(t * 6 + ph) * 0.06 * s;
        ctx.beginPath(); ctx.moveTo(x + lx * s, y - 0.12 * s); ctx.lineTo(x + lx * s + sw, y); ctx.stroke();
      }
      const hx = x + f * 0.36 * s, hy = y - 0.33 * s;
      ctx.beginPath(); ctx.arc(hx, hy, 0.13 * s, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - 0.11 * s, hy - 0.06 * s); ctx.lineTo(hx - 0.06 * s, hy - 0.22 * s); ctx.lineTo(hx, hy - 0.1 * s);
      ctx.moveTo(hx + 0.11 * s, hy - 0.06 * s); ctx.lineTo(hx + 0.06 * s, hy - 0.22 * s); ctx.lineTo(hx, hy - 0.1 * s); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1, 0.05 * s);
      ctx.beginPath(); ctx.moveTo(x - f * 0.3 * s, y - 0.24 * s); ctx.quadraticCurveTo(x - f * 0.5 * s, y - 0.3 * s, x - f * 0.45 * s, y - (0.5 + 0.06 * Math.sin(t * 3)) * s); ctx.stroke();
    } else {
      // sitting: pear body, head, ears, curled tail that sways
      ctx.beginPath(); ctx.ellipse(x, y - 0.17 * s, 0.17 * s, 0.19 * s, 0, 0, 7); ctx.fill();
      const hy = y - 0.42 * s;
      ctx.beginPath(); ctx.arc(x, hy, 0.12 * s, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 0.11 * s, hy - 0.04 * s); ctx.lineTo(x - 0.08 * s, hy - 0.2 * s); ctx.lineTo(x - 0.01 * s, hy - 0.1 * s);
      ctx.moveTo(x + 0.11 * s, hy - 0.04 * s); ctx.lineTo(x + 0.08 * s, hy - 0.2 * s); ctx.lineTo(x + 0.01 * s, hy - 0.1 * s); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = Math.max(1, 0.05 * s);
      const sway = Math.sin(t * 2) * 0.08 * s;
      ctx.beginPath(); ctx.moveTo(x + f * 0.14 * s, y - 0.03 * s); ctx.quadraticCurveTo(x + f * 0.35 * s, y, x + f * 0.3 * s + sway, y - 0.25 * s); ctx.stroke();
      if (s > 25) { // eyes when close
        ctx.fillStyle = '#9be36a';
        ctx.beginPath(); ctx.arc(x - 0.045 * s, hy, 0.022 * s, 0, 7); ctx.arc(x + 0.045 * s, hy, 0.022 * s, 0, 7); ctx.fill();
      }
    }
  }

  function drawWorld() {
    offCache.length = 0;
    { let off = 0, slope = 0; for (let z = 0; z <= 600; z += 5) { offCache.push(off); slope += curvature(g.pos + z) * 5; off += slope * 5; } }

    const pan = -offCache[offCache.length - 1] * 0.15 - g.pos * 0.002;
    drawBackground(scene.prev, 1, pan);
    if (scene.blend < 1) { ctx.globalAlpha = scene.blend; drawBackground(scene.cur, scene.blend, pan); ctx.globalAlpha = 1; }
    else drawBackground(scene.cur, 1, pan);

    const ZMIN = CAM_H * FOCAL / (VIEW_H - HORIZON) * 0.9, ZMAX = 600;
    // ballast
    ctx.fillStyle = '#8a8178';
    ctx.beginPath();
    for (let z = ZMIN; z <= ZMAX; z *= 1.08) { const p = project(-1.8, 0, z); ctx.lineTo(p.x, p.y); }
    for (let z = ZMAX; z >= ZMIN; z /= 1.08) { const p = project(1.8, 0, z); ctx.lineTo(p.x, p.y); }
    ctx.fill();
    // sleepers
    ctx.fillStyle = '#5a4634';
    const first = Math.ceil(g.pos / 1.5) * 1.5;
    for (let s = first + 150; s >= first; s -= 1.5) {
      const z = s - g.pos; if (z < ZMIN) continue;
      const a = project(-1.2, 0, z), b = project(1.2, 0, z);
      ctx.fillRect(a.x, a.y - Math.max(1, 0.12 * a.s) / 2, b.x - a.x, Math.max(1, 0.15 * a.s));
    }
    // rails
    ctx.strokeStyle = '#d6d6d6';
    for (const rx of [-0.75, 0.75]) {
      ctx.beginPath();
      for (let z = ZMIN; z <= ZMAX; z *= 1.05) { const p = project(rx, 0.1, z); ctx.lineTo(p.x, p.y); }
      ctx.lineWidth = 2; ctx.stroke();
    }

    // collect billboard objects, draw far-to-near
    const objs = [];
    // poles + trees
    for (let s = Math.ceil(g.pos / 50) * 50; s < g.pos + ZMAX; s += 50) objs.push({ z: s - g.pos, t: 'pole' });
    for (let s = Math.ceil(g.pos / 23) * 23; s < g.pos + 400; s += 23) {
      const h = hash(s);
      if (h < 0.6) {
        const x = (h < 0.3 ? -1 : 1) * (7 + h * 30);
        if (scene.blend < 1) objs.push({ z: s - g.pos, t: 'prop', x, k: h, sc: scene.prev, a: 1 - scene.blend });
        objs.push({ z: s - g.pos, t: 'prop', x, k: h, sc: scene.cur, a: scene.blend });
      }
    }
    for (const c of catsBetween(g.pos + ZMIN, g.pos + 120)) objs.push({ z: c.s - g.pos, t: 'cat', c });
    for (const L of LIMITS) { const z = L.at - 150 - g.pos; if (z > 0 && z < ZMAX) objs.push({ z, t: 'limit', lim: L.lim }); }
    for (let i = 0; i < STATIONS.length; i++) {
      const S = STATIONS[i];
      const z0 = S.pos - 160 - g.pos, z1 = S.pos + 30 - g.pos;
      if (z1 > ZMIN && z0 < ZMAX) objs.push({ z: Math.max(z0, ZMIN), z1, t: 'platform', S });
      const zs = S.pos - g.pos; if (zs > ZMIN && zs < ZMAX) objs.push({ z: zs, t: 'stop' });
      const zn = S.pos - 70 - g.pos; if (zn > ZMIN && zn < ZMAX) objs.push({ z: zn, t: 'name', S });
    }
    objs.sort((a, b) => b.z - a.z);
    for (const o of objs) {
      if (o.z < ZMIN) continue;
      if (o.t === 'pole') {
        const b = project(3, 0, o.z), t = project(3, 6.5, o.z), arm = project(-0.2, 6.2, o.z);
        ctx.strokeStyle = '#555'; ctx.lineWidth = Math.max(1, 0.25 * b.s);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.lineTo(arm.x, arm.y); ctx.stroke();
      } else if (o.t === 'prop') {
        if (o.a <= 0.01 || (o.sc === 'coast' && o.x > 9)) continue;
        ctx.globalAlpha = o.a; drawProp(o.sc, project(o.x, 0, o.z), o.k); ctx.globalAlpha = 1;
      } else if (o.t === 'cat') {
        drawCat(o.c, project(o.c.x, o.c.y, o.z));
      } else if (o.t === 'limit') {
        const b = project(2.4, 0, o.z), t = project(2.4, 3, o.z), s = b.s;
        ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, 0.1 * s);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d22'; ctx.lineWidth = Math.max(1, 0.12 * s);
        ctx.beginPath(); ctx.arc(t.x, t.y, 0.6 * s, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#111'; ctx.font = `bold ${Math.max(6, 0.6 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.lim, t.x, t.y);
      } else if (o.t === 'platform') {
        const zs = [o.z, Math.min(o.z1, ZMAX)];
        const p = (x, y, z) => project(x, y, z);
        const a1 = p(-2.1, 1.1, zs[0]), a2 = p(-2.1, 1.1, zs[1]), b1 = p(-9, 1.1, zs[0]), b2 = p(-9, 1.1, zs[1]);
        const c1 = p(-2.1, 0, zs[0]), c2 = p(-2.1, 0, zs[1]);
        ctx.fillStyle = '#9a9a92';
        ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(a1.x, a1.y); ctx.fill();
        ctx.fillStyle = '#c9c4b8';
        ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b1.x, b1.y); ctx.fill();
        // yellow safety line
        const y1 = p(-2.7, 1.1, zs[0]), y2 = p(-2.7, 1.1, zs[1]), y3 = p(-3.0, 1.1, zs[1]), y4 = p(-3.0, 1.1, zs[0]);
        ctx.fillStyle = '#e8c400';
        ctx.beginPath(); ctx.moveTo(y1.x, y1.y); ctx.lineTo(y2.x, y2.y); ctx.lineTo(y3.x, y3.y); ctx.lineTo(y4.x, y4.y); ctx.fill();
        // roof
        const r1 = p(-3.5, 4, zs[0]), r2 = p(-3.5, 4, zs[1]), r3 = p(-9, 4.6, zs[1]), r4 = p(-9, 4.6, zs[0]);
        ctx.fillStyle = '#3f5560';
        ctx.beginPath(); ctx.moveTo(r1.x, r1.y); ctx.lineTo(r2.x, r2.y); ctx.lineTo(r3.x, r3.y); ctx.lineTo(r4.x, r4.y); ctx.fill();
      } else if (o.t === 'stop') {
        const b = project(-2.6, 1.1, o.z), t = project(-2.6, 2.8, o.z), s = b.s;
        ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, 0.08 * s);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        ctx.fillStyle = '#f2c200'; ctx.fillRect(t.x - 0.5 * s, t.y - 0.4 * s, 1 * s, 0.8 * s);
        ctx.fillStyle = '#111'; ctx.font = `bold ${Math.max(5, 0.35 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('STOP', t.x, t.y);
        // mark on the ballast
        const m1 = project(-1.8, 0.02, o.z), m2 = project(1.8, 0.02, o.z);
        ctx.strokeStyle = '#f2c200'; ctx.lineWidth = Math.max(1, 0.2 * s);
        ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke();
      } else if (o.t === 'name') {
        const t = project(-5, 3.2, o.z), s = t.s;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1f6fb2'; ctx.lineWidth = Math.max(1, 0.1 * s);
        ctx.fillRect(t.x - 2 * s, t.y - 0.5 * s, 4 * s, 1 * s); ctx.strokeRect(t.x - 2 * s, t.y - 0.5 * s, 4 * s, 1 * s);
        ctx.fillStyle = '#123'; ctx.font = `bold ${Math.max(5, 0.5 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.S.name, t.x, t.y);
      }
    }
    // overhead wire
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.beginPath();
    for (let z = ZMIN; z <= ZMAX; z *= 1.05) { const p = project(0, 5.8, z); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    // cab window frame
    ctx.fillStyle = '#1b1f24';
    ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, 0, 14, VIEW_H); ctx.fillRect(W - 14, 0, 14, VIEW_H);
    ctx.fillRect(W / 2 - 4, 0, 8, VIEW_H);
  }

  const fmtClock = (t) => { t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };

  function drawDash() {
    const y0 = VIEW_H;
    ctx.fillStyle = '#23272e'; ctx.fillRect(0, y0, W, H - y0);
    ctx.textBaseline = 'alphabetic';
    // speedometer
    const cx = 110, cy = y0 + 82, r = 64, kmh = g.v * 3.6, lim = limitAt(g.pos);
    const ang = (k) => Math.PI * 0.75 + (Math.min(k, 120) / 120) * Math.PI * 1.5;
    ctx.fillStyle = '#0f1115'; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d33'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, ang(lim), ang(120)); ctx.stroke();
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
    ctx.fillStyle = '#ccc'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let k = 0; k <= 120; k += 20) {
      const a = ang(k);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10)); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
      ctx.fillText(k, cx + Math.cos(a) * (r - 22), cy + Math.sin(a) * (r - 22));
    }
    const na = ang(kmh);
    ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * (r - 6), cy + Math.sin(na) * (r - 6)); ctx.stroke();
    ctx.fillStyle = kmh > lim + 2 ? '#ff5050' : '#fff'; ctx.font = 'bold 22px monospace';
    ctx.fillText(kmh.toFixed(0), cx, cy + 34);
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#999'; ctx.fillText('km/h', cx, cy + 50);

    // lever
    const lx = 220, ly = y0 + 14, notches = [5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7, -8, -9];
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
    notches.forEach((n, i) => {
      const y = ly + i * 9.3;
      const on = n === g.lever;
      ctx.fillStyle = on ? (n > 0 ? '#3fb950' : n < 0 ? (n === -9 ? '#ff3030' : '#f0883e') : '#ddd') : '#444';
      ctx.fillRect(lx, y, 34, 8);
      ctx.fillStyle = on ? '#000' : '#aaa'; ctx.fillText(leverName(n), lx + 4, y + 7);
    });
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.fillText(leverName(g.lever), lx + 42, ly + 70);

    // info
    const st = STATIONS[g.seg];
    const d = st.pos - g.pos;
    const ix = 320;
    ctx.textAlign = 'left'; ctx.fillStyle = '#9da7b3'; ctx.font = '13px sans-serif';
    ctx.fillText('NEXT STOP', ix, y0 + 24);
    ctx.fillText('SPEED LIMIT', ix, y0 + 70);
    ctx.fillText('NEXT LIMIT', ix, y0 + 116);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(st.name, ix, y0 + 48);
    ctx.fillText(lim + ' km/h', ix, y0 + 94);
    const nl = LIMITS.find((L) => L.at > g.pos);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(nl ? `${nl.lim} km/h in ${Math.max(0, nl.at - g.pos).toFixed(0)} m` : '—', ix, y0 + 138);

    const jx = 560;
    ctx.fillStyle = '#9da7b3'; ctx.font = '13px sans-serif';
    ctx.fillText('DISTANCE TO MARK', jx, y0 + 24);
    ctx.fillText('CLOCK / DUE', jx, y0 + 70);
    ctx.fillText('SCORE', jx, y0 + 116);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = d < -1 ? '#ff5050' : d < 100 ? '#ffd33d' : '#fff';
    ctx.fillText(Math.abs(d) < 100 ? (d >= 0 ? '' : '-') + Math.abs(d).toFixed(2) + ' m' : d.toFixed(0) + ' m', jx, y0 + 48);
    const late = g.clock - g.sched;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
    ctx.fillText(fmtClock(g.clock), jx, y0 + 94);
    ctx.fillStyle = late > 0 ? '#ff7b72' : '#7ee787';
    ctx.fillText(fmtClock(g.sched), jx + 105, y0 + 94);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
    ctx.fillText(String(g.score), jx, y0 + 140);
    if (g.overspeedPen > 0) { ctx.fillStyle = '#ff7b72'; ctx.font = '13px sans-serif'; ctx.fillText(`overspeed -${g.overspeedPen}`, jx + 100, y0 + 138); }

    // approach bar (last 100 m)
    const bx = 800, bw = 140, by = y0 + 20, bh = 120;
    ctx.fillStyle = '#0f1115'; ctx.fillRect(bx, by, bw, bh);
    const scale = bh / 60; // shows -10 .. +50 m
    const markY = by + 10 * scale;
    ctx.strokeStyle = '#f2c200'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, markY); ctx.lineTo(bx + bw, markY); ctx.stroke();
    ctx.fillStyle = '#f2c200'; ctx.font = '10px sans-serif'; ctx.fillText('STOP', bx + 4, markY - 3);
    const ty = markY + Math.max(-10, Math.min(50, d)) * scale;
    ctx.fillStyle = '#58a6ff'; ctx.fillRect(bx + bw / 2 - 12, ty - 3, 24, 6);
    ctx.fillStyle = '#9da7b3'; ctx.fillText('approach (50 m)', bx + 4, by + bh + 12);

    // overspeed warning in view
    if (kmh > lim + 2 && g.state === 'running') {
      ctx.fillStyle = 'rgba(200,0,0,.75)'; ctx.fillRect(W / 2 - 110, 24, 220, 34);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('OVER SPEED LIMIT', W / 2, 41);
    }
  }

  function panel(lines, title) {
    const pw = 520, ph = 60 + lines.length * 26, px = (W - pw) / 2, py = (VIEW_H - ph) / 2;
    ctx.fillStyle = 'rgba(10,14,20,.88)'; ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#58a6ff'; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(title, W / 2, py + 38);
    ctx.font = '16px sans-serif';
    lines.forEach((l, i) => { ctx.fillStyle = l.c || '#c9d1d9'; ctx.fillText(l.t ?? l, W / 2, py + 70 + i * 26); });
  }

  function drawOverlay() {
    // cat counter + scene name
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(24, 22, 190, 46);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2b8d0'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('Cats spotted: ' + g.cats, 34, 37);
    ctx.fillStyle = '#ddd'; ctx.font = '12px sans-serif'; ctx.fillText(SCENE_NAMES[scene.blend < 0.5 ? scene.prev : scene.cur], 34, 57);
    if (g.msgT > 0 && g.msg) {
      ctx.globalAlpha = Math.min(1, g.msgT);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 230, 64, 460, 36);
      ctx.fillStyle = '#ffd33d'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(g.msg, W / 2, 82); ctx.globalAlpha = 1;
    }
    if (g.state === 'title') {
      panel([
        'Drive the Aozora Line through ' + (STATIONS.length - 1) + ' stations.',
        'Obey speed limits, stop on the yellow STOP mark, arrive on time.',
        '↑/W: more power   ↓/S: more brake   N: neutral   Space: EB',
        'Tip: brake early, then ease off to B1–B3 for a smooth stop.',
        { t: 'Press Enter (or tap) to start', c: '#ffd33d' },
      ], 'AOZORA LINE · Train Driver');
    } else if (g.state === 'arrived') {
      const r = g.lastResult;
      const lines = r.failed ? [{ t: 'Overran the platform – no points for this stop.', c: '#ff7b72' }] : [
        `Stop: ${r.d >= 0 ? r.d.toFixed(2) + ' m short' : (-r.d).toFixed(2) + ' m over'}  → ${r.stopPts}` + (r.perfect ? `  PERFECT +${r.perfect}` : ''),
        `Time: ${Math.abs(r.diff).toFixed(1)} s ${r.diff > 0 ? 'late' : 'early'}  → ${r.timePts}`,
        r.smooth ? `Smooth stop bonus +${r.smooth}` : 'Tip: stop on B1–B3 for a smooth-stop bonus',
        r.pen ? { t: `Overspeed penalty -${r.pen}`, c: '#ff7b72' } : 'No overspeed. Nice!',
        { t: `Cats spotted: ${r.cats}  → +${r.catPts}`, c: '#f2b8d0' },
      ];
      lines.push({ t: `Stop total: ${r.total}   ·   Score: ${g.score}`, c: '#7ee787' });
      lines.push({ t: g.seg >= STATIONS.length - 1 ? 'Press Enter for final results' : 'Press Enter to depart', c: '#ffd33d' });
      panel(lines, 'Arrived at ' + r.name);
    } else if (g.state === 'end') {
      const max = (STATIONS.length - 1) * 2200;
      const pct = g.score / max;
      const rank = pct > 0.85 ? 'S' : pct > 0.7 ? 'A' : pct > 0.5 ? 'B' : pct > 0.3 ? 'C' : 'D';
      const lines = g.results.map((r) => `${r.name}: ${r.failed ? 'overrun' : r.total + ' pts'}`);
      lines.push({ t: `Total ${g.score}  ·  Rank ${rank}`, c: '#7ee787' });
      lines.push({ t: 'Press Enter to play again', c: '#ffd33d' });
      panel(lines, 'End of the line!');
    }
  }

  // ---------- Main loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); updateScene(dt);
    drawWorld(); drawDash(); drawOverlay();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Exposed for automated testing
  window.__train = { get state() { return g; }, scene, act, STATIONS, LIMITS, accel, limitAt };
})();
