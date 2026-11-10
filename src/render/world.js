// Draws one camera view of the world: track, objects, platforms, our train.
import { STATIONS, GRADES, LIMITS, stopsAt, TRAIN_LEN, curvature, hash, catsBetween } from '../route.js';
import { stats } from '../debug.js';
import { g, weatherAt } from '../run.js';
import { ctx, W, VIEW_H, HORIZON, FOCAL, offCache, cam, setCam, zOf, span, project, mix, rgb } from './canvas.js';
import { lightAt, weatherLight, light, setLight, lit } from './light.js';
import { drawSky } from './sky.js';
import { scene, quadAt, drawLand } from './land.js';
import { drawProp, FLOWERS, drawTuft, drawCat } from './props.js';
import { drawBirds, drawPetals, drawFirefly, drawWash, glows, glow, drawNightLights, drawPrecip } from './effects.js';

const onPlatform = (s) => STATIONS.some((S) => s > S.pos - 165 && s < S.pos + 35);
function drawWorld(view) {
  setCam(view);
  offCache.length = 0;
  { let off = 0, slope = 0; for (let z = 0; z <= 600; z += 5) { offCache.push(off); slope += curvature(cam.pos + cam.dir * z) * 5; off += slope * 5; } }

  const now = performance.now() / 1000;
  const L = weatherLight(lightAt(g.pos), weatherAt(g.pos));
  setLight(L);
  glows.length = 0;
  // Backdrops drift with the curve ahead; flip that for mirrored (rear-facing) views.
  const pan = -offCache[offCache.length - 1] * 0.15 * cam.dir - cam.pos * 0.002;
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
      let x = (h < 0.3 ? -1 : 1) * (7 + h * 30);
      if (x < 0 && x > -16 && onPlatform(s)) x -= 10; // keep houses and trees off the platform
      if (scene.blend < 1) objs.push({ z: zOf(s), t: 'prop', x, k: h, sc: scene.prev, a: 1 - scene.blend });
      objs.push({ z: zOf(s), t: 'prop', x, k: h, sc: scene.cur, a: scene.blend });
    }
  }
  for (const [sc, a] of [[scene.prev, 1 - scene.blend], [scene.cur, scene.blend]]) { // towns: a row of houses close to the line
    if (sc !== 'town' || a <= 0.01) continue;
    const [lo, hi] = span(260);
    for (let s = Math.ceil(lo / 13) * 13 + 6; s < hi; s += 13) {
      const h = hash(s * 1.7), side = h < 0.5 ? -1 : 1;
      if (h > 0.85 || (side < 0 && onPlatform(s))) continue;
      objs.push({ z: zOf(s), t: 'prop', x: side * (9 + h * 6), k: 0.1 + h * 0.3, sc, a });
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
  for (let i = 1; i < GRADES.length; i++) { const z = zOf(GRADES[i].at); if (z > 0 && z < ZMAX) objs.push({ z, t: 'grade', pm: GRADES[i].pm }); }
  for (const Lm of LIMITS) { const z = zOf(Lm.at - 150); if (z > 0 && z < ZMAX) objs.push({ z, t: 'limit', lim: Lm.lim }); }
  for (let i = 0; i < STATIONS.length; i++) {
    const S = STATIONS[i];
    const za = zOf(S.pos - 160), zb = zOf(S.pos + 30), z0 = Math.min(za, zb), z1 = Math.max(za, zb);
    // sorted by its far end so the train, cats and signs on or beside it are drawn over it
    if (z1 > ZMIN && z0 < ZMAX) objs.push({ z: Math.max(z0, ZMIN), z1, key: Math.min(z1, ZMAX), t: 'platform', S });
    const zs = zOf(S.pos); if (zs > ZMIN && zs < ZMAX) objs.push({ z: zs, t: stopsAt(i, g.mode) ? 'stop' : 'pass' });
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
      ctx.globalAlpha = o.a; drawProp(o.sc, project(o.x, 0, o.z), o.k, now, Math.sign(o.x)); ctx.globalAlpha = 1;
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
    } else if (o.t === 'grade') {
      stats.gradePostsDrawn++;
      // gradient post: a short white board on the left, an arm showing up / down / level and the ‰ value
      const b = project(-2.6, 0, o.z), t = project(-2.6, 1.8, o.z), s = b.s;
      ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, 0.08 * s);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      const bw = 1.4 * s, bh = 0.9 * s;
      ctx.fillStyle = '#f4f1e8'; ctx.fillRect(t.x - bw / 2, t.y - bh, bw, bh);
      ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1, 0.06 * s); ctx.strokeRect(t.x - bw / 2, t.y - bh, bw, bh);
      const dy = o.pm > 0 ? -0.18 : o.pm < 0 ? 0.18 : 0;
      ctx.lineWidth = Math.max(1, 0.08 * s);
      ctx.beginPath(); ctx.moveTo(t.x - bw / 2 + 0.1 * s, t.y - bh * 0.72 - dy * s); ctx.lineTo(t.x + bw / 2 - 0.1 * s, t.y - bh * 0.72 + dy * s); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = `bold ${Math.max(5, 0.4 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.pm === 0 ? 'L' : String(Math.abs(o.pm)), t.x, t.y - bh * 0.3);
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
    } else if (o.t === 'pass') { // Express passes this station: green PASS board, no stop mark
      const b = project(-2.6, 1.1, o.z), t = project(-2.6, 2.8, o.z), s = b.s;
      ctx.strokeStyle = '#333'; ctx.lineWidth = Math.max(1, 0.08 * s);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      ctx.fillStyle = '#2ea043'; ctx.fillRect(t.x - 0.6 * s, t.y - 0.4 * s, 1.2 * s, 0.8 * s);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(5, 0.35 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PASS', t.x, t.y);
      stats.passDrawn++;
    } else if (o.t === 'train') {
      drawTrain(ZMIN);
    } else if (o.t === 'name') { // wooden station name board
      const t = project(-5, 3.2, o.z), s = t.s;
      ctx.fillStyle = wood; ctx.fillRect(t.x - 1.6 * s, t.y, 0.15 * s, 1.6 * s); ctx.fillRect(t.x + 1.45 * s, t.y, 0.15 * s, 1.6 * s);
      ctx.fillStyle = rgb(lit('#fbf3df')); ctx.strokeStyle = rgb(lit('#7a5232')); ctx.lineWidth = Math.max(1, 0.12 * s);
      ctx.fillRect(t.x - 2 * s, t.y - 0.7 * s, 4 * s, 1.4 * s); ctx.strokeRect(t.x - 2 * s, t.y - 0.7 * s, 4 * s, 1.4 * s);
      ctx.fillStyle = '#3a2a1e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.max(5, 0.6 * s)}px sans-serif`; ctx.fillText(o.S.kanji || o.S.name, t.x, t.y - 0.18 * s, 3.7 * s);
      ctx.font = `bold ${Math.max(4, 0.3 * s)}px sans-serif`; ctx.fillText(o.S.name.toUpperCase(), t.x, t.y + 0.4 * s, 3.7 * s);
    }
  }
  // overhead wire
  ctx.strokeStyle = 'rgba(50,40,35,.8)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let z = ZMIN; z <= ZMAX; z *= 1.05) { const p = project(0, 5.8, z); ctx.lineTo(p.x, p.y); }
  ctx.stroke();
  if (cam.frame) drawPetals(L, now);
  drawWash(L, now);
  drawNightLights(L);
  drawPrecip(L, now);
  if (cam.frame) { // cab window frame
    ctx.fillStyle = '#1b1f24';
    ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, 0, 14, VIEW_H); ctx.fillRect(W - 14, 0, 14, VIEW_H);
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
      if (light.night > 0.05) glow(t.x, t.y + 0.3 * t.s, 2.2 * t.s); // platform lamps
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
      if (light.night > 0.05) { const c = project(side, 2.55, Math.max(ZMIN, (z0 + z1) / 2)); glow(c.x, c.y, 0.9 * c.s); } // lit carriages
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
      if (light.night > 0.05) glow(p.x, p.y, r * 10);
      if (light.warm > 0.3) { // headlights glow in the evening
        const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
        gl.addColorStop(0, 'rgba(255,240,180,.6)'); gl.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = gl; ctx.fillRect(p.x - r * 6, p.y - r * 6, r * 12, r * 12);
      }
      ctx.fillStyle = '#fff2b8'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    }
  }
}

export { drawWorld };
