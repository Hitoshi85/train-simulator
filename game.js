// Aozora Line – a tiny original train-driving game.
// Drive between fictional stations, respect speed limits, stop on the mark on time.
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const mainCtx = canvas.getContext('2d');
  let ctx = mainCtx;           // swapped to an offscreen context while drawing camera insets
  const W = canvas.width, H = canvas.height;
  const VIEW_H = 440;          // height of the 3D view; the dashboard is below
  const HORIZON = 170;
  const CAM_H = 3;             // camera height (m)
  const FOCAL = 600;           // projection focal length (px)

  // ---------- Route (all fictional) ----------
  const STATIONS = [
    { name: 'Hinata',     pos: 0 },
    { name: 'Kozakura',   pos: 900,  run: 95 },
    { name: 'Kawabe',     pos: 1800, run: 90 },
    { name: 'Nanohana',   pos: 3000, run: 115 },
    { name: 'Momijidai',  pos: 4200, run: 110 },
    { name: 'Hotarubashi', pos: 5100, run: 95 },
    { name: 'Shiokaze',   pos: 6000, run: 90 },
    { name: 'Yuzuhara',   pos: 7300, run: 120 },
    { name: 'Tsukimino',  pos: 8600, run: 120 },
  ];
  const LIMITS = [
    { at: 0, lim: 45 }, { at: 250, lim: 85 }, { at: 1450, lim: 70 },
    { at: 1900, lim: 85 }, { at: 3000, lim: 55 }, { at: 3600, lim: 85 },
    { at: 4350, lim: 75 }, { at: 5300, lim: 60 }, { at: 6150, lim: 90 },
    { at: 7900, lim: 70 },
  ];
  const TRAIN_LEN = 80;      // 4 cars of 20 m
  const DWELL = 30;          // scheduled seconds at each station
  const CAT_BONUS = 2; // points per cat spotted on the way

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

  // ---------- Sound (all generated with Web Audio: no audio files, original tunes) ----------
  const sound = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    const KEY = 'aozora.muted';
    let muted = false;
    try { muted = localStorage.getItem(KEY) === '1'; } catch { /* storage blocked */ }
    let ac = null, master, sfx, music, noise, motor, motorGain, motorFilter, roll, hiss;
    let prevState = '', prevLever = 0, joint = 0, beepT = 0, nextNote = 0, stepN = 0;
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

    function tone(freq, t, dur, type, vol, dest = sfx) {
      const o = ac.createOscillator(), e = ac.createGain();
      o.type = type; o.frequency.value = freq;
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(e).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    }
    function burst(t, dur, freq, vol, q = 1) {
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
      src.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(e).connect(sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    }
    function loopNoise(type, freq, dest) {
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
      src.buffer = noise; src.loop = true; f.type = type; f.frequency.value = freq; e.gain.value = 0;
      src.connect(f).connect(e).connect(dest); src.start();
      return e;
    }

    function start() {
      if (ac || !AC) return;
      try {
        ac = new AC();
        master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
        sfx = ac.createGain(); sfx.gain.value = 1; sfx.connect(master);
        music = ac.createGain(); music.gain.value = 0.22; music.connect(master);
        noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const ch = noise.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        // motor: a soft buzzy hum whose pitch follows speed
        motor = [ac.createOscillator(), ac.createOscillator()];
        motorFilter = ac.createBiquadFilter(); motorFilter.type = 'lowpass'; motorFilter.frequency.value = 700;
        motorGain = ac.createGain(); motorGain.gain.value = 0;
        motor[0].type = 'sawtooth'; motor[1].type = 'triangle';
        motor.forEach((o) => { o.frequency.value = 60; o.connect(motorFilter); o.start(); });
        motorFilter.connect(motorGain).connect(sfx);
        roll = loopNoise('lowpass', 350, sfx);
        hiss = loopNoise('highpass', 3500, sfx);
        nextNote = ac.currentTime + 0.1;
      } catch { ac = null; }
    }

    // Original background tune: C - Am - F - G, eighth notes at 104 bpm (null = rest).
    const MELODY = [
      76, null, 79, null, 81, 79, 76, null, 72, null, 76, null, 74, 72, 69, null,
      77, null, 81, null, 84, 81, 79, 77, 79, null, null, 74, 76, null, 74, null,
      76, null, 79, null, 81, 79, 76, 79, 72, null, 76, 77, 76, 74, 72, null,
      77, null, 81, null, 84, null, 81, 79, 74, 76, 79, null, 84, null, null, null,
    ];
    const CHORDS = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]];
    function scheduleMusic() {
      const eighth = 60 / 104 / 2;
      while (nextNote < ac.currentTime + 0.3) {
        const i = stepN % MELODY.length, bar = Math.floor(i / 8) % 4, chord = CHORDS[bar];
        if (MELODY[i]) tone(mtof(MELODY[i]), nextNote, eighth * 1.6, 'triangle', 0.18, music);
        if (i % 4 === 0) tone(mtof(chord[0] - 12 + (i % 8 ? 7 : 0)), nextNote, eighth * 3, 'sine', 0.3, music);
        if (i % 8 === 0) chord.forEach((m) => tone(mtof(m + 12), nextNote, eighth * 7.5, 'sine', 0.05, music));
        nextNote += eighth; stepN++;
      }
    }

    function update(dt) {
      if (!ac) return;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      const t = ac.currentTime, kmh = g.v * 3.6, running = g.state === 'running';
      scheduleMusic();
      // continuous sounds
      const powered = running && g.lever > 0;
      motor[0].frequency.setTargetAtTime(45 + kmh * 7, t, 0.1);
      motor[1].frequency.setTargetAtTime(90 + kmh * 14, t, 0.1);
      motorGain.gain.setTargetAtTime(powered ? 0.05 + 0.012 * g.lever : (g.v > 0.5 ? 0.012 : 0), t, 0.15);
      roll.gain.setTargetAtTime(Math.min(1, g.v / 25) * 0.25, t, 0.2);
      hiss.gain.setTargetAtTime(g.lever < 0 && g.v > 0.3 ? 0.012 + 0.003 * -g.lever : 0, t, 0.1);
      // rail joints every 25 m: a clack for each pair of wheels
      const j = Math.floor(g.pos / 25);
      if (j !== joint && g.v > 1) {
        const gap = Math.min(0.4, 2.5 / g.v);
        burst(t, 0.06, 1100, 0.5, 2); burst(t + gap, 0.06, 1000, 0.45, 2);
      }
      joint = j;
      // lever clicks and a puff of air when braking harder
      if (g.lever !== prevLever) {
        tone(1800, t, 0.03, 'square', 0.05);
        if (g.lever < prevLever && g.lever < 0) burst(t, 0.25, 4000, 0.15, 0.7);
      }
      prevLever = g.lever;
      // overspeed warning beep
      beepT -= dt;
      if (running && kmh > limitAt(g.pos) + 2 && beepT <= 0) { tone(1320, t, 0.12, 'square', 0.07); beepT = 0.5; }
      // door chime on departure, original arrival melody at each stop
      if (g.state !== prevState) {
        if (g.state === 'running') [988, 784].forEach((f, k) => tone(f, t + k * 0.35, 0.6, 'sine', 0.2));
        if (g.state === 'arrived') [72, 76, 79, 84, 81, 84].forEach((m, k) => tone(mtof(m), t + 0.2 + k * 0.16, 0.5, 'triangle', 0.18));
        if (g.state === 'end') [72, 79, 84, 88].forEach((m, k) => tone(mtof(m), t + k * 0.22, 0.9, 'triangle', 0.18));
      }
      prevState = g.state;
    }

    function toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* storage blocked */ }
      if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.05);
      syncButton();
    }
    function syncButton() {
      const b = document.getElementById('mute');
      if (b) b.textContent = muted ? '🔇 Sound off' : '🔊 Sound on';
    }
    syncButton();
    return { start, update, toggle, get muted() { return muted; }, get started() { return !!ac; } };
  })();

  // ---------- Input ----------
  function act(a) {
    if (a === 'mute') { sound.toggle(); return; }
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
  const KEYS = { ArrowUp: 'power', KeyW: 'power', ArrowDown: 'brake', KeyS: 'brake', KeyN: 'neutral', Space: 'eb', Enter: 'enter', NumpadEnter: 'enter', KeyM: 'mute' };
  // Browsers only allow audio after a user gesture, so start it on the first key or tap.
  addEventListener('keydown', () => sound.start());
  addEventListener('pointerdown', () => sound.start());
  addEventListener('keydown', (e) => { const a = KEYS[e.code]; if (a) { e.preventDefault(); if (!e.repeat || a !== 'enter') act(a); } });
  document.querySelectorAll('#touch button').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); act(b.dataset.act); }));
  canvas.addEventListener('pointerdown', () => { if (g.state !== 'running') act('enter'); });

  // ---------- Rendering ----------
  // Lateral offset of the track at distance z ahead (approximate curve integration)
  // A camera sits at track position `pos`, looks along the track (dir 1 = forward, -1 = back),
  // and is offset `x` m sideways at height `h` m. The cab view is { pos: g.pos, dir: 1, x: 0 }.
  const offCache = [];
  let cam = { pos: 0, dir: 1, x: 0, h: CAM_H };
  const zOf = (s) => (s - cam.pos) * cam.dir;           // distance ahead of the camera
  const span = (len) => cam.dir > 0 ? [cam.pos, cam.pos + len] : [cam.pos - len, cam.pos];
  function project(x, y, z) {
    const zi = Math.min(offCache.length - 1, Math.max(0, Math.round(z / 5)));
    const off = offCache[zi];
    return { x: W / 2 + (cam.dir * (x - cam.x) - off) * FOCAL / z, y: HORIZON + (cam.h - y) * FOCAL / z, s: FOCAL / z };
  }
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  // ---------- Painted scenery: watercolour skies, layered hills, lush greenery (all original) ----------
  // Three pastoral scenes, a random new one every 10 s with a fade. The light follows the run:
  // morning at the first station, bright midday mid-line, a golden evening by the last stops.
  const SCENES = ['paddies', 'forest', 'seaside'];
  const SCENE_NAMES = { paddies: 'Rice Paddy Valley', forest: 'Forest Hills', seaside: 'Seaside Town' };
  const scene = { cur: 'paddies', prev: 'paddies', blend: 1, t: 0 };
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

  // Colour helpers: colours are [r, g, b] arrays so they can be blended with the light.
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const LINE_LEN = STATIONS[STATIONS.length - 1].pos;
  const LIGHT = [ // keyframes along the line, 0 = first station, 1 = last
    { at: 0, top: '#7fa9dc', mid: '#c4d8ee', low: '#fbdcc4', sun: '#fff0d4', haze: '#dde3ec', tint: '#ffd2bc', sunX: 0.2, sunY: 0.66, sunR: 30, tintA: 0.08, warm: 0.4 },
    { at: 0.4, top: '#3b82d6', mid: '#86bdea', low: '#e6f3f8', sun: '#fffbea', haze: '#d2e5f1', tint: '#ffffff', sunX: 0.42, sunY: 0.14, sunR: 24, tintA: 0, warm: 0 },
    { at: 0.62, top: '#3b82d6', mid: '#86bdea', low: '#e6f3f8', sun: '#fffbea', haze: '#d2e5f1', tint: '#ffffff', sunX: 0.58, sunY: 0.16, sunR: 24, tintA: 0, warm: 0 },
    { at: 1, top: '#4d5a9a', mid: '#e3958c', low: '#ffcf86', sun: '#ffb055', haze: '#efbfa0', tint: '#ff9447', sunX: 0.8, sunY: 0.74, sunR: 40, tintA: 0.15, warm: 1 },
  ];
  function lightAt(pos) {
    const u = Math.max(0, Math.min(1, pos / LINE_LEN));
    let i = 0;
    while (i < LIGHT.length - 2 && u > LIGHT[i + 1].at) i++;
    const A = LIGHT[i], B = LIGHT[i + 1], t = (u - A.at) / (B.at - A.at);
    const L = { u, phase: u < 0.25 ? 'morning' : u < 0.72 ? 'midday' : 'evening' };
    for (const k of ['top', 'mid', 'low', 'sun', 'haze', 'tint']) L[k] = mix(hex(A[k]), hex(B[k]), t);
    for (const k of ['sunX', 'sunY', 'sunR', 'tintA', 'warm']) L[k] = A[k] + (B[k] - A[k]) * t;
    return L;
  }
  let light = lightAt(0);
  const lit = (c, k = 1) => mix(mix(hex(c), light.tint, light.tintA * 0.7 * k), light.sun, 0.08 * light.warm * k);

  const CLOUDS = Array.from({ length: 7 }, (_, i) => ({
    x: hash(i + 40) * 1400, y: 30 + hash(i + 41) * 60, r: 13 + hash(i + 42) * 20,
    n: 6 + Math.floor(hash(i + 43) * 5), tall: hash(i + 44) < 0.4, sp: 2 + hash(i + 45) * 4,
  }));
  function drawSky(L, pan, now) {
    const grd = ctx.createLinearGradient(0, 0, 0, HORIZON);
    grd.addColorStop(0, rgb(L.top)); grd.addColorStop(0.55, rgb(L.mid)); grd.addColorStop(1, rgb(L.low));
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, HORIZON + 2);
    // sun and its soft glow
    const sx = W * L.sunX, sy = HORIZON * L.sunY, R = L.sunR;
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 5);
    glow.addColorStop(0, rgb(L.sun, 0.85)); glow.addColorStop(0.25, rgb(L.sun, 0.3)); glow.addColorStop(1, rgb(L.sun, 0));
    ctx.fillStyle = glow; ctx.fillRect(sx - R * 5, sy - R * 5, R * 10, R * 10);
    ctx.fillStyle = rgb(mix(L.sun, [255, 255, 255], 0.4)); ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.fill();
    // towering summer clouds: a shadowed mass, then sunlit puffs leaning toward the sun
    const shade = mix(mix(L.mid, [150, 150, 185], 0.35), L.low, 0.25);
    const bright = mix([255, 255, 255], L.sun, 0.25 + 0.45 * L.warm);
    const lean = L.sunX < 0.5 ? -1 : 1;
    for (const c of CLOUDS) {
      const x = ((c.x + now * c.sp + pan * 0.3) % 1400 + 1400) % 1400 - 220, r = c.r;
      const puffs = [];
      for (let k = 0; k < c.n; k++) {
        const t = k / (c.n - 1) - 0.5, hk = hash(k + c.x);
        const h = (1 - Math.abs(t) * 2) * r * (c.tall ? 2.4 : 0.9) * (0.6 + 0.4 * hk);
        puffs.push([x + t * r * 5 + (hk - 0.5) * r, c.y - h, r * (0.75 + 0.5 * hk) * (1 - Math.abs(t) * 0.6)]);
      }
      ctx.fillStyle = rgb(shade, 0.9); ctx.beginPath();
      for (const [px, py, pr] of puffs) { ctx.moveTo(px + pr, py + r * 0.2); ctx.arc(px, py + r * 0.2, pr, 0, 7); }
      ctx.fill();
      ctx.fillStyle = rgb(bright, 0.95); ctx.beginPath();
      for (const [px, py, pr] of puffs) { ctx.moveTo(px + lean * pr * 0.12 + pr * 0.82, py - pr * 0.12); ctx.arc(px + lean * pr * 0.12, py - pr * 0.12, pr * 0.82, 0, 7); }
      ctx.fill();
    }
  }

  // A ridge of painted hills; far layers fade into the haze. `bumps` adds a treetop silhouette,
  // `fall` lowers the ridge to the sea on the right.
  function drawHills(L, pan, layers, fall) {
    for (const [col, hz, base, amp, f, ph, par, bumps] of layers) {
      const c = mix(lit(col), L.haze, hz);
      const pts = [];
      for (let x = -12; x <= W + 12; x += 12) {
        const wx = x + pan * par;
        let y = HORIZON - base - amp * (0.55 * Math.sin(wx / f + ph) + 0.3 * Math.sin(wx / (f * 0.43) + ph * 1.7) + 0.15 * Math.sin(wx / (f * 0.17) + ph * 3) + 0.5);
        if (fall) { const t = Math.max(0, Math.min(1, (x - W * 0.3) / (W * 0.25))); y += (HORIZON + 2 - y) * t * t * (3 - 2 * t); }
        pts.push([x, y]);
      }
      ctx.fillStyle = rgb(c); ctx.beginPath(); ctx.moveTo(-12, HORIZON + 2);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(W + 12, HORIZON + 2); ctx.fill();
      if (bumps) { // soft rounded tree crowns along the ridge
        ctx.beginPath();
        pts.forEach(([x, y], i) => { if (y < HORIZON - 2) { const r = bumps * (0.6 + 0.6 * hash(i + ph)); ctx.moveTo(x + r, y + r * 0.4); ctx.arc(x, y + r * 0.4, r, 0, 7); } });
        ctx.fill();
      }
      // a rim of light along the top
      ctx.strokeStyle = rgb(mix(c, L.sun, 0.5), 0.45); ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1) : ctx.moveTo(x, y + 1)));
      ctx.stroke();
    }
  }

  const GROUND = { paddies: ['#b4cf8c', '#5e9846'], forest: ['#8cb872', '#3d7a3a'], seaside: ['#bed592', '#6a9e4e'] };
  function quadAt(pts, fill) {
    ctx.fillStyle = fill; ctx.beginPath();
    pts.forEach(([x, y, z], i) => { const p = project(x, y, z); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
    ctx.fill();
  }
  function drawLand(name, pan, now, L, ZMIN) {
    if (name === 'paddies') {
      drawHills(L, pan, [
        ['#7d95a8', 0.55, 30, 40, 140, 1, 0.3, 0], ['#5f8a68', 0.3, 12, 34, 95, 4, 0.6, 5], ['#4f7f45', 0.1, 0, 22, 70, 2, 1, 4],
      ]);
    } else if (name === 'forest') {
      drawHills(L, pan, [
        ['#6f8aa0', 0.5, 40, 50, 120, 3, 0.3, 4], ['#3f6f55', 0.25, 22, 50, 80, 5, 0.6, 7], ['#2f5f38', 0.05, 4, 36, 55, 1, 1, 8],
      ]);
    } else {
      ctx.fillStyle = rgb(mix(lit('#4b97c4'), L.haze, 0.35)); ctx.fillRect(0, HORIZON - 4, W, 6);
      for (const [ix, iw, ih] of [[0.68, 70, 14], [0.86, 110, 22]]) { // distant islands
        ctx.fillStyle = rgb(mix(lit('#6c8aa0'), L.haze, 0.55)); ctx.beginPath();
        ctx.ellipse(W * ix, HORIZON - 3, iw, ih, 0, Math.PI, 0); ctx.fill();
      }
      drawHills(L, pan, [['#7d95a8', 0.5, 28, 40, 120, 2, 0.3, 0], ['#5e8a52', 0.15, 6, 34, 80, 6, 0.8, 4]], true);
      // a little town on the hillside
      const roofs = ['#c0504a', '#3f6fa0', '#d08a3a', '#4f8a6a', '#8a4a6a'];
      for (let i = 0; i < 14; i++) {
        const x = 30 + i * 22 + hash(i + 7) * 10 + pan * 0.8, y = HORIZON - 4 - hash(i + 3) * 26 * (1 - i / 16);
        ctx.fillStyle = rgb(lit('#f4eee0')); ctx.fillRect(x, y - 7, 12, 7);
        ctx.fillStyle = rgb(lit(roofs[i % roofs.length])); ctx.beginPath(); ctx.moveTo(x - 2, y - 7); ctx.lineTo(x + 6, y - 12); ctx.lineTo(x + 14, y - 7); ctx.fill();
      }
    }
    // ground, hazier in the distance
    const [g0, g1] = GROUND[name];
    const grd = ctx.createLinearGradient(0, HORIZON, 0, VIEW_H);
    grd.addColorStop(0, rgb(mix(lit(g0), L.haze, 0.35))); grd.addColorStop(0.25, rgb(lit(g0))); grd.addColorStop(1, rgb(lit(g1)));
    ctx.fillStyle = grd; ctx.fillRect(0, HORIZON, W, VIEW_H - HORIZON);
    { // brushy meadow patches, lighter and darker greens
      const [lo, hi] = span(320), light1 = rgb(mix(lit(g0), L.sun, 0.25), 0.35), dark1 = rgb(mix(lit(g1), [30, 60, 30], 0.25), 0.3);
      for (let s = Math.ceil(lo / 9) * 9; s < hi; s += 9) {
        for (const side of [-1, 1]) {
          const h = hash(s * 2.3 + side), z = zOf(s);
          if (z < ZMIN || (name === 'seaside' && side > 0)) continue;
          const p = project(side * (3 + h * 30), 0, z), rx = (2.5 + h * 4) * p.s;
          ctx.fillStyle = h < 0.5 ? light1 : dark1;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, rx, rx * cam.h / z * 0.8 + 1, 0, 0, 7); ctx.fill();
        }
      }
    }
    if (name === 'paddies') drawPaddies(L, now, ZMIN);
    if (name === 'seaside') drawSea(L, now, ZMIN);
  }

  // Flooded rice paddies reflecting the sky, with rows of young rice and drifting ripples.
  function drawPaddies(L, now, ZMIN) {
    const [lo, hi] = span(420), cells = [];
    for (let s = Math.floor(lo / 28) * 28; s < hi; s += 28) {
      for (const side of [-1, 1]) {
        for (let col = 0; col < 3; col++) {
          if (hash(s * 0.7 + side * 3 + col * 11) < 0.2) continue;
          const za = zOf(s + 2), zb = zOf(s + 26);
          cells.push({ x0: side * (9 + col * 13), x1: side * (20 + col * 13), zn: Math.max(ZMIN, Math.min(za, zb)), zf: Math.max(za, zb), k: hash(s + col + side) });
        }
      }
    }
    cells.sort((a, b) => b.zf - a.zf);
    const water = mix(mix(L.mid, L.top, 0.25), [120, 175, 120], 0.15);
    for (const c of cells) {
      if (c.zf <= ZMIN || c.zn >= 600) continue;
      quadAt([[c.x0, 0, c.zn], [c.x1, 0, c.zn], [c.x1, 0, c.zf], [c.x0, 0, c.zf]], rgb(c.k < 0.25 ? mix(water, [110, 170, 80], 0.45) : water));
      ctx.strokeStyle = rgb(mix([90, 150, 60], L.sun, 0.15 * L.warm), 0.7); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 1; i < 6; i++) {
        const x = c.x0 + (c.x1 - c.x0) * i / 6, a = project(x, 0, c.zn), b = project(x, 0, c.zf);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      const z = c.zn + ((now * 2 + c.k * 40) % (c.zf - c.zn)); // a ripple of light crossing the field
      const a = project(c.x0, 0, z), b = project(c.x1, 0, z);
      ctx.strokeStyle = rgb(mix(L.sun, [255, 255, 255], 0.5), 0.55); ctx.lineWidth = Math.max(1, 0.06 * a.s);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }

  // The sea beside the track: rolling waves, glitter under the sun, and little sailboats.
  function drawSea(L, now, ZMIN) {
    const ZMAX = 600;
    ctx.save();
    const sea = ctx.createLinearGradient(0, HORIZON, 0, VIEW_H);
    sea.addColorStop(0, rgb(mix(lit('#5aa6cf'), L.low, 0.35))); sea.addColorStop(1, rgb(lit('#2f7fb4')));
    ctx.fillStyle = sea; ctx.beginPath();
    for (let z = ZMIN; z <= ZMAX; z *= 1.08) { const p = project(11, 0, z); ctx.lineTo(p.x, p.y); }
    ctx.lineTo(W, HORIZON); ctx.lineTo(W, VIEW_H); ctx.fill();
    ctx.clip();
    ctx.fillStyle = rgb(mix(L.sun, [255, 255, 255], 0.5), 0.8); // glitter
    for (let i = 0; i < 40; i++) {
      const x = W * L.sunX + (hash(i) - 0.5) * 260, y = HORIZON + 2 + hash(i + 9) * 60;
      const tw = Math.max(0, Math.sin(now * 3 + i));
      ctx.fillRect(x - 6 * tw, y, 12 * tw, 1.5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    const [lo, hi] = span(300);
    for (let row = 0; row < 12; row++) {
      const xw = 13 + ((row * 9 - now * 4) % 108 + 108) % 108;
      for (let s = Math.ceil(lo / 18) * 18; s < hi; s += 18) {
        const z = zOf(s) + hash(s + row) * 9; if (z < ZMIN) continue;
        const a = project(xw, 0, z), b = project(xw, 0, z + 6);
        ctx.lineWidth = Math.max(1, 0.15 * a.s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    { const [blo, bhi] = span(560); // sailboats
      for (let s = Math.ceil(blo / 140) * 140; s < bhi; s += 140) {
        const z = zOf(s) + 40; if (z < 30) continue;
        const p = project(25 + hash(s) * 60, 0, z), k = p.s, bob = Math.sin(now * 1.5 + s) * 0.15 * k;
        ctx.fillStyle = rgb(lit('#7a4a32')); ctx.beginPath(); ctx.moveTo(p.x - 2 * k, p.y - bob); ctx.lineTo(p.x + 2 * k, p.y - bob); ctx.lineTo(p.x + 1.4 * k, p.y + 0.6 * k - bob); ctx.lineTo(p.x - 1.4 * k, p.y + 0.6 * k - bob); ctx.fill();
        ctx.fillStyle = rgb(lit('#fbf6ea')); ctx.beginPath(); ctx.moveTo(p.x, p.y - 4 * k - bob); ctx.lineTo(p.x + 1.8 * k, p.y - 0.4 * k - bob); ctx.lineTo(p.x, p.y - 0.4 * k - bob); ctx.fill();
      }
    }
    ctx.restore();
    // sandy shore along the cliff edge
    ctx.fillStyle = rgb(lit('#e6d3a3')); ctx.beginPath();
    for (let z = ZMIN; z <= ZMAX; z *= 1.08) { const p = project(10, 0, z); ctx.lineTo(p.x, p.y); }
    for (let z = ZMAX; z >= ZMIN; z /= 1.08) { const p = project(11.2, 0, z); ctx.lineTo(p.x, p.y); }
    ctx.fill();
  }

  // Painted trees: a shadowed crown, a mid-tone crown and a sunlit top, swaying in the breeze.
  function blob(cx, cy, R, seed, n) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + seed, rr = R * (0.42 + 0.22 * hash(seed + i));
      const px = cx + Math.cos(a) * R * 0.55, py = cy + Math.sin(a) * R * 0.42;
      ctx.moveTo(px + rr, py); ctx.arc(px, py, rr, 0, 7);
    }
    ctx.moveTo(cx + R * 0.6, cy); ctx.arc(cx, cy, R * 0.6, 0, 7);
    ctx.fill();
  }
  function roundTree(b, s, k, now, cols, trunkH = 2.2, r = 2.6) {
    stats.trees++;
    const sway = Math.sin(now * 1.1 + k * 30) * 0.12 * s;
    ctx.fillStyle = rgb(lit('#5b4231')); ctx.fillRect(b.x - 0.22 * s, b.y - (trunkH + 0.6) * s, 0.44 * s, (trunkH + 0.6) * s);
    const cx = b.x + sway, cy = b.y - (trunkH + r * 0.75) * s, R = r * s, dir = light.sunX < 0.5 ? -1 : 1;
    ctx.fillStyle = rgb(lit(cols[0])); blob(cx, cy, R, k * 10, 7);
    ctx.fillStyle = rgb(lit(cols[1])); blob(cx + dir * R * 0.1, cy - R * 0.12, R * 0.82, k * 10 + 1, 6);
    ctx.fillStyle = rgb(mix(lit(cols[2]), light.sun, 0.25 * light.warm)); blob(cx + dir * R * 0.28, cy - R * 0.32, R * 0.45, k * 10 + 2, 4);
  }
  function cedar(b, s, k, now) {
    stats.trees++;
    const sway = Math.sin(now * 1.3 + k * 20) * 0.08 * s, dir = light.sunX < 0.5 ? -1 : 1;
    ctx.fillStyle = rgb(lit('#4a3426')); ctx.fillRect(b.x - 0.2 * s, b.y - 1.6 * s, 0.4 * s, 1.6 * s);
    for (let i = 0; i < 4; i++) {
      const y = b.y - (1.2 + i * 1.7) * s, w = (2.3 - i * 0.45) * s, top = y - 2.8 * s, sx = sway * (i + 1) / 4;
      ctx.fillStyle = rgb(lit(i % 2 ? '#2a5a3a' : '#2f6440'));
      ctx.beginPath(); ctx.moveTo(b.x - w, y); ctx.quadraticCurveTo(b.x, y + 0.5 * s, b.x + w, y); ctx.lineTo(b.x + sx, top); ctx.fill();
      ctx.fillStyle = rgb(mix(lit('#5c9a5a'), light.sun, 0.3 * light.warm), 0.8);
      ctx.beginPath(); ctx.moveTo(b.x + sx, top); ctx.lineTo(b.x + dir * w * 0.8, y - 0.1 * s); ctx.lineTo(b.x + dir * w * 0.25, y - 0.2 * s); ctx.fill();
    }
  }
  function house(b, s, k, now, roof, wall = '#f1e8d4', w = 6, h = 3, washing = false) {
    const x0 = b.x - (w / 2) * s, y0 = b.y - h * s;
    ctx.fillStyle = rgb(lit(wall)); ctx.fillRect(x0, y0, w * s, h * s);
    ctx.fillStyle = rgb(lit('#5a4434'));
    for (const px of [0, w / 3, (2 * w) / 3, w]) ctx.fillRect(x0 + px * s - 0.1 * s, y0, 0.2 * s, h * s);
    ctx.fillRect(x0, y0 + h * 0.45 * s, w * s, 0.15 * s);
    ctx.fillStyle = rgb(mix(lit('#3a3a40'), light.sun, 0.5 * light.warm)); // windows glow warm in the evening
    ctx.fillRect(x0 + 0.5 * s, y0 + 0.6 * s, 1.2 * s, 0.9 * s); ctx.fillRect(x0 + (w - 1.7) * s, y0 + 0.6 * s, 1.2 * s, 0.9 * s);
    ctx.fillStyle = rgb(lit(roof)); ctx.beginPath();
    ctx.moveTo(x0 - 0.9 * s, y0 + 0.2 * s); ctx.lineTo(x0 + (w + 0.9) * s, y0 + 0.2 * s); ctx.lineTo(x0 + (w - 1.4) * s, y0 - 2.3 * s); ctx.lineTo(x0 + 1.4 * s, y0 - 2.3 * s); ctx.fill();
    ctx.fillStyle = rgb(mix(lit(roof), [255, 240, 210], 0.3)); ctx.fillRect(x0 + 1.4 * s, y0 - 2.3 * s, (w - 2.8) * s, 0.3 * s);
    if (washing) { // a washing line beside the house, clothes swaying
      const lx = x0 + (w + 1.5) * s, ly = b.y - 2 * s;
      ctx.strokeStyle = rgb(lit('#6a5240')); ctx.lineWidth = Math.max(1, 0.1 * s); ctx.beginPath();
      ctx.moveTo(lx, b.y); ctx.lineTo(lx, ly - 0.3 * s); ctx.moveTo(lx + 4 * s, b.y); ctx.lineTo(lx + 4 * s, ly - 0.3 * s);
      ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + 2 * s, ly + 0.3 * s, lx + 4 * s, ly); ctx.stroke();
      ['#f4f1ea', '#e07a6a', '#7aa7d6', '#f2d27a'].forEach((c, i) => {
        const cx = lx + (0.5 + i * 0.9) * s, sw = Math.sin(now * 2.2 + i + k * 9) * 0.25 * s;
        ctx.fillStyle = rgb(lit(c)); ctx.beginPath();
        ctx.moveTo(cx, ly + 0.15 * s); ctx.lineTo(cx + 0.7 * s, ly + 0.15 * s); ctx.lineTo(cx + 0.7 * s + sw, ly + 1.1 * s); ctx.lineTo(cx + sw, ly + 1.1 * s); ctx.fill();
      });
    }
  }
  const LEAF = { paddies: ['#3f7a3a', '#5a9a48', '#9cc86a'], forest: ['#2c5e35', '#3f7f45', '#7fb860'], seaside: ['#3c7444', '#579a52', '#a2cc72'] };
  function drawProp(name, b, k, now) {
    const s = b.s;
    if (name === 'paddies') {
      if (k < 0.08 || (k > 0.3 && k < 0.36)) house(b, s, k, now, k < 0.08 ? '#7a6a4a' : '#56677a', '#f1e8d4', 6, 3, true);
      else roundTree(b, s, k, now, LEAF.paddies, 1.8 + k * 2, 2 + k * 2);
    } else if (name === 'forest') {
      if (k < 0.15 || (k > 0.3 && k < 0.42)) cedar(b, s, k, now);
      else roundTree(b, s, k, now, LEAF.forest, 2.6, 3.4 + k * 2);
    } else if (k < 0.16) house(b, s, k, now, ['#c0504a', '#3f6fa0', '#d08a3a'][Math.floor(k * 18) % 3], '#f6f2ea', 5, 3, k < 0.06);
    else roundTree(b, s, k, now, LEAF.seaside, 1.6, 2 + k * 1.5);
  }

  // Swaying grass tufts and wildflowers beside the track.
  const FLOWERS = ['#fbf7ee', '#f6d54a', '#f2a7c3', '#b9a4e8'];
  function drawTuft(b, k, now) {
    const s = b.s; if (s < 2) return;
    const sway = Math.sin(now * 1.8 + k * 40) * 0.1 * s;
    ctx.strokeStyle = rgb(lit(k < 0.2 ? '#4a8236' : '#6aa64a')); ctx.lineWidth = Math.max(1, 0.05 * s);
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      const bx = b.x + i * 0.07 * s;
      ctx.moveTo(bx, b.y); ctx.quadraticCurveTo(bx + i * 0.04 * s, b.y - 0.3 * s, bx + i * 0.1 * s + sway, b.y - (0.4 + 0.2 * hash(k + i)) * s);
    }
    ctx.stroke();
    if (k > 0.3) {
      ctx.fillStyle = rgb(lit(FLOWERS[Math.floor(k * 37) % FLOWERS.length]));
      ctx.beginPath(); ctx.arc(b.x + sway * 1.2, b.y - 0.55 * s, Math.max(1, 0.07 * s), 0, 7); ctx.fill();
    }
  }

  // Birds crossing the sky, petals drifting by day, fireflies in the evening.
  function drawBirds(now) {
    ctx.strokeStyle = 'rgba(50,55,70,.75)'; ctx.lineWidth = 1.5;
    for (let f = 0; f < 3; f++) {
      const fx = ((hash(f + 70) * 1300 + now * (14 + f * 5)) % 1500) - 200, fy = 40 + hash(f + 71) * 60 + Math.sin(now * 0.4 + f) * 8;
      for (let i = 0; i < 5; i++) {
        const x = fx - Math.abs(i - 2) * 14, y = fy + (i - 2) * 7, w = 5 + hash(i + f) * 2, flap = Math.sin(now * 7 + i * 1.3 + f);
        ctx.beginPath(); ctx.moveTo(x - w, y - flap * 3); ctx.quadraticCurveTo(x - w / 2, y - 3 - flap * 2, x, y);
        ctx.quadraticCurveTo(x + w / 2, y - 3 - flap * 2, x + w, y - flap * 3); ctx.stroke();
        stats.birds++;
      }
    }
  }
  function drawPetals(L, now) {
    const a = 0.75 * (1 - L.warm);
    if (a < 0.05) return;
    for (let i = 0; i < 18; i++) {
      const x = ((hash(i + 80) * W - now * (30 + hash(i) * 30)) % W + W) % W;
      const y = ((hash(i + 81) * VIEW_H + now * (18 + hash(i + 1) * 12)) % VIEW_H);
      ctx.fillStyle = rgb(hex(i % 3 ? '#f7c6d6' : '#fbe6ee'), a);
      ctx.beginPath(); ctx.ellipse(x, y, 3, 1.6, now * 2 + i, 0, 7); ctx.fill();
    }
  }
  function drawFirefly(p, k, now) {
    const blink = Math.max(0, Math.sin(now * 2.3 + k * 50)) * Math.min(1, (light.u - 0.7) / 0.15);
    if (blink < 0.05) return;
    stats.fireflies++;
    const r = Math.max(3, 0.25 * p.s);
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    glow.addColorStop(0, `rgba(255,250,170,${blink})`); glow.addColorStop(1, 'rgba(220,255,120,0)');
    ctx.fillStyle = glow; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  }

  // The finishing wash: sun rays, the time-of-day tint, then vignette and paper grain.
  // Paper grain and a soft vignette, painted once into an overlay canvas.
  const paper = document.createElement('canvas');
  paper.width = W; paper.height = VIEW_H;
  {
    const px = paper.getContext('2d');
    const v = px.createRadialGradient(W / 2, VIEW_H * 0.45, VIEW_H * 0.55, W / 2, VIEW_H * 0.45, W * 0.68);
    v.addColorStop(0, 'rgba(70,50,40,0)'); v.addColorStop(1, 'rgba(70,50,40,.22)');
    px.fillStyle = v; px.fillRect(0, 0, W, VIEW_H);
    for (let i = 0; i < 9000; i++) { // speckles and soft fibres, like watercolour paper
      const x = hash(i * 0.73) * W, y = hash(i * 1.31 + 5) * VIEW_H, d = hash(i * 2.9) < 0.5;
      px.fillStyle = d ? 'rgba(90,70,50,.07)' : 'rgba(255,250,235,.09)';
      px.fillRect(x, y, 1 + hash(i) * 2, 1 + hash(i + 3) * 2);
    }
  }
  function drawWash(L, now) {
    if (cam.frame) { // sun rays, only in the main view
      const sx = W * L.sunX, sy = HORIZON * L.sunY;
      const rays = 0.05 + 0.07 * L.warm + (L.phase === 'morning' ? 0.04 : 0);
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 2 + (i - 2.5) * 0.28 + (L.sunX - 0.5) * -1.2 + Math.sin(now * 0.15 + i) * 0.03;
        const ray = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * 500, sy + Math.sin(a) * 500);
        ray.addColorStop(0, rgb(L.sun, rays)); ray.addColorStop(1, rgb(L.sun, 0));
        ctx.fillStyle = ray; ctx.beginPath(); ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a - 0.06) * 700, sy + Math.sin(a - 0.06) * 700); ctx.lineTo(sx + Math.cos(a + 0.06) * 700, sy + Math.sin(a + 0.06) * 700); ctx.fill();
      }
    }
    if (L.tintA > 0.005) { ctx.fillStyle = rgb(L.tint, L.tintA); ctx.fillRect(0, 0, W, VIEW_H); }
    ctx.drawImage(paper, 0, 0);
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
  const stats = { catsDrawn: 0, frames: 0, trainDrawn: 0, insets: {}, lastInsets: [], trees: 0, birds: 0, fireflies: 0 }; // render counters for automated tests
  function drawCat(c, p) {
    const s = p.s * 1.4; // cats drawn a bit larger than life so you can spot them
    if (s < 1.2) return;
    stats.catsDrawn++;
    const t = performance.now() / 1000 + c.ph;
    const [body, accent] = c.col, f = c.face;
    const bob = c.walk ? Math.abs(Math.sin(t * 6)) * 0.04 * s : 0;
    const x = p.x, y = p.y - bob;
    ctx.fillStyle = 'rgba(40,60,30,.25)'; // soft shadow on the ground
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.24 * s, 0.05 * s, 0, 0, 7); ctx.fill();
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

  const onPlatform = (s) => STATIONS.some((S) => s > S.pos - 165 && s < S.pos + 35);
  function drawWorld(view) {
    cam = view;
    offCache.length = 0;
    { let off = 0, slope = 0; for (let z = 0; z <= 600; z += 5) { offCache.push(off); slope += curvature(cam.pos + cam.dir * z) * 5; off += slope * 5; } }

    const now = performance.now() / 1000;
    const L = light = lightAt(g.pos);
    const pan = -offCache[offCache.length - 1] * 0.15 - cam.pos * cam.dir * 0.002;
    const ZMIN = cam.h * FOCAL / (VIEW_H - HORIZON) * 0.9, ZMAX = 600;
    drawSky(L, pan, now);
    if (scene.blend < 1) {
      drawLand(scene.prev, pan, now, L, ZMIN);
      ctx.globalAlpha = scene.blend; drawLand(scene.cur, pan, now, L, ZMIN); ctx.globalAlpha = 1;
    } else drawLand(scene.cur, pan, now, L, ZMIN);
    drawBirds(now);

    // ballast
    ctx.fillStyle = rgb(lit('#9a8e80'));
    ctx.beginPath();
    for (let z = ZMIN; z <= ZMAX; z *= 1.08) { const p = project(-1.8, 0, z); ctx.lineTo(p.x, p.y); }
    for (let z = ZMAX; z >= ZMIN; z /= 1.08) { const p = project(1.8, 0, z); ctx.lineTo(p.x, p.y); }
    ctx.fill();
    // sleepers
    ctx.fillStyle = rgb(lit('#6a5038'));
    const [slo, shi] = span(150);
    for (let s = Math.ceil(slo / 1.5) * 1.5; s <= shi; s += 1.5) {
      const z = zOf(s); if (z < ZMIN) continue;
      const a = project(-1.2, 0, z), b = project(1.2, 0, z);
      ctx.fillRect(a.x, a.y - Math.max(1, 0.12 * a.s) / 2, b.x - a.x, Math.max(1, 0.15 * a.s));
    }
    // rails, catching the light
    ctx.strokeStyle = rgb(mix([214, 214, 214], L.sun, 0.4));
    for (const rx of [-0.75, 0.75]) {
      ctx.beginPath();
      for (let z = ZMIN; z <= ZMAX; z *= 1.05) { const p = project(rx, 0.1, z); ctx.lineTo(p.x, p.y); }
      ctx.lineWidth = 2; ctx.stroke();
    }

    // collect billboard objects, draw far-to-near
    const objs = [];
    // poles + trees
    { const [lo, hi] = span(ZMAX); for (let s = Math.ceil(lo / 50) * 50; s < hi; s += 50) objs.push({ z: zOf(s), t: 'pole' }); }
    const [plo, phi] = span(400);
    for (let s = Math.ceil(plo / 23) * 23; s < phi; s += 23) {
      const h = hash(s);
      if (h < 0.6) {
        const x = (h < 0.3 ? -1 : 1) * (7 + h * 30);
        if (scene.blend < 1) objs.push({ z: zOf(s), t: 'prop', x, k: h, sc: scene.prev, a: 1 - scene.blend });
        objs.push({ z: zOf(s), t: 'prop', x, k: h, sc: scene.cur, a: scene.blend });
      }
    }
    if (cam.frame) { // grass tufts and wildflowers close to the track (main view only)
      const [lo, hi] = span(90);
      for (let s = Math.ceil(lo / 1.6) * 1.6; s < hi; s += 1.6) {
        const plat = onPlatform(s);
        for (const side of [-1, 1]) {
          const h = hash(s * 3.1 + side);
          if (h < 0.5 && !(plat && side < 0)) objs.push({ z: zOf(s), t: 'tuft', x: side * (2.3 + h * 9), k: h });
        }
      }
    }
    if (L.u > 0.7) { // fireflies come out in the evening
      const [lo, hi] = span(70);
      for (let s = Math.ceil(lo / 2.2) * 2.2; s < hi; s += 2.2) {
        const h = hash(s * 1.9);
        if (h < 0.5) objs.push({ z: zOf(s), t: 'fly', x: (h < 0.25 ? -1 : 1) * (2.6 + hash(s + 4) * 10), y: 0.6 + hash(s + 5) * 1.6 + Math.sin(now + s) * 0.3, k: h });
      }
    }
    { const [lo, hi] = span(120); for (const c of catsBetween(lo, hi)) objs.push({ z: zOf(c.s), t: 'cat', c }); }
    for (const Lm of LIMITS) { const z = zOf(Lm.at - 150); if (z > 0 && z < ZMAX) objs.push({ z, t: 'limit', lim: Lm.lim }); }
    for (let i = 0; i < STATIONS.length; i++) {
      const S = STATIONS[i];
      const za = zOf(S.pos - 160), zb = zOf(S.pos + 30), z0 = Math.min(za, zb), z1 = Math.max(za, zb);
      // sorted by its far end so the train, cats and signs on or beside it are drawn over it
      if (z1 > ZMIN && z0 < ZMAX) objs.push({ z: Math.max(z0, ZMIN), z1, key: Math.min(z1, ZMAX), t: 'platform', S, s0: S.pos - 160 });
      const zs = zOf(S.pos); if (zs > ZMIN && zs < ZMAX) objs.push({ z: zs, t: 'stop' });
      const zn = zOf(S.pos - 70); if (zn > ZMIN && zn < ZMAX) objs.push({ z: zn, t: 'name', S });
    }
    if (cam.train) { // seen from outside: add our own train (front at g.pos, TRAIN_LEN long)
      const za = zOf(g.pos), zb = zOf(g.pos - TRAIN_LEN);
      if (Math.max(za, zb) > ZMIN && Math.min(za, zb) < ZMAX) objs.push({ z: Math.max(ZMIN, Math.min(za, zb)) - 0.01, t: 'train' });
    }
    objs.sort((a, b) => (b.key ?? b.z) - (a.key ?? a.z));
    const wood = rgb(lit('#6b4f36'));
    for (const o of objs) {
      if (o.z < ZMIN) continue;
      if (o.t === 'pole') { // wooden catenary pole
        const b = project(3, 0, o.z), t = project(3, 6.5, o.z), arm = project(-0.2, 6.2, o.z);
        ctx.strokeStyle = wood; ctx.lineWidth = Math.max(1, 0.25 * b.s);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.lineTo(arm.x, arm.y); ctx.stroke();
      } else if (o.t === 'prop') {
        if (o.a <= 0.01 || (o.sc === 'seaside' && o.x > 9)) continue;
        ctx.globalAlpha = o.a; drawProp(o.sc, project(o.x, 0, o.z), o.k, now); ctx.globalAlpha = 1;
      } else if (o.t === 'tuft') {
        drawTuft(project(o.x, 0, o.z), o.k, now);
      } else if (o.t === 'fly') {
        drawFirefly(project(o.x, o.y, o.z), o.k, now);
      } else if (o.t === 'cat') {
        drawCat(o.c, project(o.c.x, o.c.y, o.z));
      } else if (o.t === 'limit') {
        const b = project(2.4, 0, o.z), t = project(2.4, 3, o.z), s = b.s;
        ctx.strokeStyle = wood; ctx.lineWidth = Math.max(1, 0.1 * s);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#d4483a'; ctx.lineWidth = Math.max(1, 0.12 * s);
        ctx.beginPath(); ctx.arc(t.x, t.y, 0.6 * s, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2a2420'; ctx.font = `bold ${Math.max(6, 0.6 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.lim, t.x, t.y);
      } else if (o.t === 'platform') {
        drawPlatform(o, ZMAX, now);
      } else if (o.t === 'stop') {
        const b = project(-2.6, 1.1, o.z), t = project(-2.6, 2.8, o.z), s = b.s;
        ctx.strokeStyle = wood; ctx.lineWidth = Math.max(1, 0.08 * s);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        ctx.fillStyle = '#f2c94a'; ctx.fillRect(t.x - 0.5 * s, t.y - 0.4 * s, 1 * s, 0.8 * s);
        ctx.fillStyle = '#2a2420'; ctx.font = `bold ${Math.max(5, 0.35 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('STOP', t.x, t.y);
        // mark on the ballast
        const m1 = project(-1.8, 0.02, o.z), m2 = project(1.8, 0.02, o.z);
        ctx.strokeStyle = '#f2c200'; ctx.lineWidth = Math.max(1, 0.2 * s);
        ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke();
      } else if (o.t === 'train') {
        drawTrain(ZMIN);
      } else if (o.t === 'name') { // wooden station name board
        const t = project(-5, 3.2, o.z), s = t.s;
        ctx.fillStyle = wood; ctx.fillRect(t.x - 1.6 * s, t.y, 0.15 * s, 1.6 * s); ctx.fillRect(t.x + 1.45 * s, t.y, 0.15 * s, 1.6 * s);
        ctx.fillStyle = rgb(lit('#fbf3df')); ctx.strokeStyle = rgb(lit('#7a5232')); ctx.lineWidth = Math.max(1, 0.12 * s);
        ctx.fillRect(t.x - 2 * s, t.y - 0.5 * s, 4 * s, 1 * s); ctx.strokeRect(t.x - 2 * s, t.y - 0.5 * s, 4 * s, 1 * s);
        ctx.fillStyle = '#3a2a1e'; ctx.font = `bold ${Math.max(5, 0.5 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.S.name, t.x, t.y);
      }
    }
    // overhead wire
    ctx.strokeStyle = 'rgba(50,40,35,.8)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let z = ZMIN; z <= ZMAX; z *= 1.05) { const p = project(0, 5.8, z); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    if (cam.frame) drawPetals(L, now);
    drawWash(L, now);
    if (cam.frame) { // cab window frame
      ctx.fillStyle = '#1b1f24';
      ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, 0, 14, VIEW_H); ctx.fillRect(W - 14, 0, 14, VIEW_H);
      ctx.fillRect(W / 2 - 4, 0, 8, VIEW_H);
    }
  }

  // A small country station: stone edge, warm paved top, wooden posts under a tiled roof, flower boxes.
  function drawPlatform(o, ZMAX, now) {
    const z0 = o.z, z1 = Math.min(o.z1, ZMAX);
    const P = (x, y, z) => [x, y, z];
    quadAt([P(-2.1, 0, z0), P(-2.1, 0, z1), P(-2.1, 1.1, z1), P(-2.1, 1.1, z0)], rgb(lit('#a8937a')));
    quadAt([P(-2.1, 1.1, z0), P(-2.1, 1.1, z1), P(-9, 1.1, z1), P(-9, 1.1, z0)], rgb(lit('#e4d6bc')));
    quadAt([P(-2.1, 1.1, z0), P(-2.1, 1.1, z1), P(-2.4, 1.1, z1), P(-2.4, 1.1, z0)], rgb(lit('#f6efe2')));
    quadAt([P(-2.7, 1.1, z0), P(-2.7, 1.1, z1), P(-3.0, 1.1, z1), P(-3.0, 1.1, z0)], rgb(lit('#f0c94a')));
    // flower boxes along the back, posts holding the roof
    const sOf = (z) => cam.pos + z * cam.dir;
    const [sa, sb] = [sOf(z0), sOf(z1)].sort((a, b) => a - b);
    const items = [];
    for (let s = Math.ceil(sa / 8) * 8; s < sb; s += 8) items.push(s);
    items.sort((a, b) => zOf(b) - zOf(a));
    for (const s of items) {
      const z = zOf(s); if (z < z0) continue;
      const box = project(-8.4, 1.1, z), bs = box.s;
      ctx.fillStyle = rgb(lit('#7a5232')); ctx.fillRect(box.x - 0.6 * bs, box.y - 0.5 * bs, 1.2 * bs, 0.5 * bs);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = rgb(lit(FLOWERS[Math.abs(i + Math.floor(s / 8)) % FLOWERS.length]));
        ctx.beginPath(); ctx.arc(box.x + (i - 1.5) * 0.3 * bs, box.y - (0.6 + 0.1 * Math.sin(now * 2 + i + s)) * bs, Math.max(1, 0.14 * bs), 0, 7); ctx.fill();
      }
      if (Math.round(s / 8) % 2 === 0) {
        const b = project(-5, 1.1, z), t = project(-5, 4.3, z);
        ctx.strokeStyle = rgb(lit('#6b4f36')); ctx.lineWidth = Math.max(1, 0.18 * b.s);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      }
    }
    quadAt([P(-3.4, 4.1, z0), P(-3.4, 4.1, z1), P(-9.2, 4.7, z1), P(-9.2, 4.7, z0)], rgb(lit('#9c4a3a')));
    quadAt([P(-3.4, 4.1, z0), P(-3.4, 4.1, z1), P(-3.4, 3.8, z1), P(-3.4, 3.8, z0)], rgb(lit('#6e3328')));
  }

  // Our own train seen from outside: 4 cream cars with a sky-blue stripe and soft painted shading.
  // Draws the side facing the camera, then the nose if the camera is ahead of the train.
  function drawTrain(ZMIN) {
    stats.trainDrawn++;
    const quad = (pts, fill, line) => {
      ctx.fillStyle = fill; ctx.beginPath();
      pts.forEach(([x, y, z], i) => { const p = project(x, y, Math.max(ZMIN, z)); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
      ctx.closePath(); ctx.fill();
      if (line) { ctx.strokeStyle = line; ctx.lineWidth = 1.2; ctx.stroke(); }
    };
    const side = cam.x < 0 ? -1.45 : 1.45;
    const body = rgb(lit('#f6efe0')), shade = rgb(lit('#ddd2bf')), stripe = rgb(lit('#3f8fc6')), stripe2 = rgb(lit('#f0b14a'));
    const ink = 'rgba(60,70,80,.75)', glass = rgb(mix(lit('#2c4a60'), light.low, 0.25)), shine = rgb(mix([255, 255, 255], light.sun, 0.4), 0.45);
    const cars = [];
    for (let i = 0; i < TRAIN_LEN / 20; i++) {
      const sa = g.pos - i * 20 - 0.4, sb = g.pos - (i + 1) * 20 + 0.4;
      const za = zOf(sa), zb = zOf(sb);
      if (Math.max(za, zb) < ZMIN) continue;
      cars.push({ za, zb, far: Math.max(za, zb) });
    }
    cars.sort((a, b) => b.far - a.far);
    for (const { za, zb } of cars) {
      quad([[side, 0.4, za], [side, 0.4, zb], [side, 3.8, zb], [side, 3.8, za]], body, ink);
      quad([[side, 0.4, za], [side, 0.4, zb], [side, 1.1, zb], [side, 1.1, za]], shade);
      quad([[side, 3.55, za], [side, 3.55, zb], [side, 3.8, zb], [side, 3.8, za]], rgb(lit('#9aa3a8')));
      quad([[side, 1.2, za], [side, 1.2, zb], [side, 1.6, zb], [side, 1.6, za]], stripe);
      quad([[side, 1.65, za], [side, 1.65, zb], [side, 1.78, zb], [side, 1.78, za]], stripe2);
      quad([[side, 0.4, za], [side, 0.4, zb], [side, 0.62, zb], [side, 0.62, za]], rgb(lit('#4a4440')));
      for (let w = 0; w < 5; w++) { // windows with a glint, and doors
        const t0 = 0.08 + w * 0.18, t1 = t0 + 0.11, z0 = za + (zb - za) * t0, z1 = za + (zb - za) * t1;
        if (w % 2) quad([[side, 0.7, z0], [side, 0.7, z1], [side, 3.3, z1], [side, 3.3, z0]], rgb(lit('#c9c0ae')), ink);
        quad([[side, 2.1, z0], [side, 2.1, z1], [side, 3.0, z1], [side, 3.0, z0]], glass, ink);
        quad([[side, 2.6, z0], [side, 2.6, z1], [side, 2.85, z1], [side, 2.85, z0]], shine);
      }
    }
    const zf = zOf(g.pos);
    if (zf > ZMIN && zf < zOf(g.pos - 1)) { // nose faces the camera
      quad([[-1.45, 0.4, zf], [1.45, 0.4, zf], [1.45, 3.8, zf], [-1.45, 3.8, zf]], body, ink);
      quad([[-1.45, 1.2, zf], [1.45, 1.2, zf], [1.45, 1.6, zf], [-1.45, 1.6, zf]], stripe);
      quad([[-1.25, 2.2, zf], [1.25, 2.2, zf], [1.2, 3.4, zf], [-1.2, 3.4, zf]], glass, ink);
      quad([[-1.0, 2.9, zf], [0.2, 2.9, zf], [0.1, 3.2, zf], [-0.95, 3.2, zf]], shine);
      for (const hx of [-0.9, 0.9]) {
        const p = project(hx, 0.9, zf), r = Math.max(1, 0.18 * p.s);
        if (light.warm > 0.3) { // headlights glow in the evening
          const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
          gl.addColorStop(0, 'rgba(255,240,180,.6)'); gl.addColorStop(1, 'rgba(255,240,180,0)');
          ctx.fillStyle = gl; ctx.fillRect(p.x - r * 6, p.y - r * 6, r * 12, r * 12);
        }
        ctx.fillStyle = '#fff2b8'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      }
    }
  }

  // ---------- Camera insets (rendered views from other cameras) ----------
  const INSET_W = 220, INSET_H = Math.round(INSET_W * VIEW_H / W), INSET_X = W - 14 - 8 - INSET_W;
  const insetCanvas = document.createElement('canvas');
  insetCanvas.width = W / 2; insetCanvas.height = VIEW_H / 2;
  const offCtx = insetCanvas.getContext('2d');
  function insetViews() {
    const views = [
      { id: 'front', label: 'FRONT CAM', cam: { pos: g.pos + 16, dir: -1, x: -4.5, h: 3.6, train: true } },
      { id: 'rear', label: 'REAR CAM', cam: { pos: g.pos - TRAIN_LEN - 0.5, dir: -1, x: 0, h: 3 } },
    ];
    const S = STATIONS[g.seg], d = S.pos - g.pos;
    if ((g.state === 'running' || g.state === 'arrived') && d < 500 && d > -40) {
      views.push({ id: 'platform', label: 'PLATFORM · ' + S.name, cam: { pos: S.pos + 25, dir: -1, x: -6, h: 2.9, train: true } });
    }
    return views;
  }
  function drawInsets() {
    const views = insetViews();
    views.forEach((v, i) => {
      ctx = offCtx;
      ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
      drawWorld(v.cam);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx = mainCtx;
      const y = 22 + i * (INSET_H + 10);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(INSET_X - 3, y - 3, INSET_W + 6, INSET_H + 6);
      ctx.drawImage(insetCanvas, INSET_X, y, INSET_W, INSET_H);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(INSET_X, y, INSET_W, 16);
      ctx.fillStyle = v.id === 'platform' ? '#ffd33d' : '#fff'; ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(v.label, INSET_X + 6, y + 8);
      ctx.fillStyle = '#ff4040'; ctx.beginPath(); ctx.arc(INSET_X + INSET_W - 10, y + 8, 3.5, 0, 7); ctx.fill(); // live dot
      stats.insets[v.id] = (stats.insets[v.id] || 0) + 1;
    });
    stats.lastInsets = views.map((v) => v.id);
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
    ctx.fillStyle = '#ddd'; ctx.font = '12px sans-serif'; ctx.fillText(SCENE_NAMES[scene.blend < 0.5 ? scene.prev : scene.cur] + ' · ' + light.phase, 34, 57);
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
  function render() {
    stats.frames++;
    drawWorld({ pos: g.pos, dir: 1, x: 0, h: CAM_H, frame: true });
    if (g.state !== 'title' && g.state !== 'end') drawInsets();
    drawDash(); drawOverlay();
  }
  function step(dt) { update(dt); updateScene(dt); }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!hook.paused) { step(dt); render(); }
    sound.update(dt);
    requestAnimationFrame(frame);
  }

  // Exposed for automated testing: set paused = true, then drive the game with step(dt) and render().
  const hook = { get state() { return g; }, scene, stats, act, step, render, paused: false, sound, STATIONS, LIMITS, accel, limitAt, catsBetween, lightAt };
  window.__train = hook;
  requestAnimationFrame(frame);
})();
