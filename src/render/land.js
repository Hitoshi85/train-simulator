// Scenes along the route: hills, ground, paddies, sea.
import { ROUTE, hash } from '../route.js';
import { g, flash } from '../run.js';
import { ctx, W, VIEW_H, HORIZON, cam, zOf, span, project, mix, rgb } from './canvas.js';
import { lit } from './light.js';
import { backdrop, drawIslands } from './sky.js';

// ---------- Painted scenery: watercolour skies, layered hills, lush greenery (all original) ----------
// The scenery follows the towns on the route (ROUTE.zones), fading from one scene to the next.
// The light follows the run: morning at the first station, bright midday mid-line, evening at the end.
// Scenes: town, pines, seaside, temple (this line), plus paddies and forest for future lines.
const zoneAt = (p) => { let z = ROUTE.zones[0]; for (const Z of ROUTE.zones) if (p >= Z.at) z = Z; return z; };
const scene = { cur: ROUTE.zones[0].scene, prev: ROUTE.zones[0].scene, name: ROUTE.zones[0].name, blend: 1 };
function updateScene(dt) {
  if (scene.blend < 1) scene.blend = Math.min(1, scene.blend + dt / 1.5);
  const z = zoneAt(g.pos);
  if (z.name === scene.name) return;
  scene.name = z.name;
  if (z.scene !== scene.cur) { scene.prev = scene.cur; scene.cur = z.scene; scene.blend = g.state === 'running' ? 0 : 1; }
  if (g.state === 'running') flash('Now entering: ' + z.name, 2);
}
// A ridge of painted hills; far layers fade into the haze. `bumps` adds a treetop silhouette,
// `fall` lowers the ridge to the sea on the right.
function drawHills(L, pan, layers, fall) {
  for (const [col, hz, base, amp, f, ph, par, bumps] of layers) {
    const c = mix(mix(lit(col), lit('#eef2f8'), L.snowy * 0.4), L.haze, hz);
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

// A hillside of little houses; `rise` lifts the far ones up the slope.
function drawRooftops(L, pan, rise) {
  const roofs = ['#c0504a', '#3f6fa0', '#d08a3a', '#4f8a6a', '#5a6270', '#8a4a6a'];
  for (let i = 0; i < 14; i++) {
    const x = 30 + i * 22 + hash(i + 7) * 10 + pan * 0.8;
    const y = HORIZON - 4 - hash(i + 3) * rise * (1 - i / 16) - (rise ? 0 : hash(i + 5) * 6);
    ctx.fillStyle = rgb(lit('#f4eee0')); ctx.fillRect(x, y - 7, 12, 7);
    ctx.fillStyle = rgb(lit(roofs[i % roofs.length])); ctx.beginPath(); ctx.moveTo(x - 2, y - 7); ctx.lineTo(x + 6, y - 12); ctx.lineTo(x + 14, y - 7); ctx.fill();
  }
}
const GROUND = { town: ['#b9cf94', '#77a05a'], pines: ['#c9d39a', '#7c9a56'], temple: ['#8cb872', '#3d7a3a'], paddies: ['#b4cf8c', '#5e9846'], forest: ['#8cb872', '#3d7a3a'], seaside: ['#bed592', '#6a9e4e'] };
function quadAt(pts, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  pts.forEach(([x, y, z], i) => { const p = project(x, y, z); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
  ctx.fill();
}
function drawLand(name, pan, now, L, ZMIN) {
  backdrop(() => drawRidges(name, pan, L));
  drawGround(name, now, L, ZMIN);
}
function drawRidges(name, pan, L) {
  if (name === 'paddies') {
    drawHills(L, pan, [
      ['#7d95a8', 0.55, 30, 40, 140, 1, 0.3, 0], ['#5f8a68', 0.3, 12, 34, 95, 4, 0.6, 5], ['#4f7f45', 0.1, 0, 22, 70, 2, 1, 4],
    ]);
  } else if (name === 'forest') {
    drawHills(L, pan, [
      ['#6f8aa0', 0.5, 40, 50, 120, 3, 0.3, 4], ['#3f6f55', 0.25, 22, 50, 80, 5, 0.6, 7], ['#2f5f38', 0.05, 4, 36, 55, 1, 1, 8],
    ]);
  } else if (name === 'town' || name === 'pines') {
    drawHills(L, pan, [['#8a9cb0', 0.55, 26, 30, 150, 2, 0.3, 0], ['#5f8a68', 0.3, 6, 22, 90, 5, 0.6, name === 'pines' ? 0 : 4]]);
    if (name === 'pines') drawHills(L, pan, [['#2f5a3c', 0.15, 2, 16, 40, 3, 0.9, 6]]);
    else drawRooftops(L, pan, 0);
  } else if (name === 'temple') {
    drawHills(L, pan, [['#6f8aa0', 0.5, 40, 50, 120, 3, 0.3, 4], ['#3f6f55', 0.25, 22, 50, 80, 5, 0.6, 7]]);
    for (const [fx, fy] of [[0.22, 58], [0.63, 46]]) { // temple halls on the wooded hills
      const x = ((W * fx + pan * 0.6) % (W + 200) + W + 200) % (W + 200) - 100, y = HORIZON - fy;
      ctx.fillStyle = rgb(mix(lit('#3a3036'), L.haze, 0.3)); ctx.beginPath();
      ctx.moveTo(x - 30, y); ctx.quadraticCurveTo(x - 14, y - 4, x - 10, y - 12); ctx.lineTo(x + 10, y - 12);
      ctx.quadraticCurveTo(x + 14, y - 4, x + 30, y); ctx.fill();
      ctx.fillStyle = rgb(mix(lit('#b0423a'), L.haze, 0.3)); ctx.fillRect(x - 18, y, 36, 9);
    }
    drawHills(L, pan, [['#2f5f38', 0.05, 4, 36, 55, 1, 1, 8]]);
  } else {
    ctx.fillStyle = rgb(mix(lit('#4b97c4'), L.haze, 0.35)); ctx.fillRect(0, HORIZON - 4, W, 6);
    drawIslands(L, pan);
    drawHills(L, pan, [['#7d95a8', 0.5, 28, 40, 120, 2, 0.3, 0], ['#5e8a52', 0.15, 6, 34, 80, 6, 0.8, 4]], true);
    drawRooftops(L, pan, 26);
  }
}
function drawGround(name, now, L, ZMIN) {
  // ground, hazier in the distance
  const [g0, g1] = GROUND[name], gl = (c) => mix(lit(c), lit('#f4f6fa'), L.snowy * 0.6); // snow settles on the ground
  const grd = ctx.createLinearGradient(0, HORIZON, 0, VIEW_H);
  grd.addColorStop(0, rgb(mix(gl(g0), L.haze, 0.35))); grd.addColorStop(0.25, rgb(gl(g0))); grd.addColorStop(1, rgb(gl(g1)));
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
  const edge = cam.dir > 0 ? W : 0; // the sea lies off the right side going forward, left looking back
  ctx.lineTo(edge, HORIZON); ctx.lineTo(edge, VIEW_H); ctx.fill();
  ctx.clip();
  ctx.fillStyle = rgb(mix(L.sun, [255, 255, 255], 0.5), 0.8); // glitter
  for (let i = 0; i < 40; i++) {
    const x = W * (cam.dir > 0 ? L.sunX : 1 - L.sunX) + (hash(i) - 0.5) * 260, y = HORIZON + 2 + hash(i + 9) * 60;
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

export { scene, quadAt, drawLand, updateScene };
