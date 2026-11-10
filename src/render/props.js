// Trackside props: trees, houses, shrines, grass, cats.
import { hash } from '../route.js';
import { stats } from '../debug.js';
import { ctx, mix, rgb } from './canvas.js';
import { light, lit } from './light.js';
import { glow } from './effects.js';

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
function house(b, s, k, now, roof, wall = '#f1e8d4', w = 6, h = 3, washing = false, side = 1) {
  const x0 = b.x - (w / 2) * s, y0 = b.y - h * s;
  ctx.fillStyle = rgb(lit(wall)); ctx.fillRect(x0, y0, w * s, h * s);
  ctx.fillStyle = rgb(lit('#5a4434'));
  for (const px of [0, w / 3, (2 * w) / 3, w]) ctx.fillRect(x0 + px * s - 0.1 * s, y0, 0.2 * s, h * s);
  ctx.fillRect(x0, y0 + h * 0.45 * s, w * s, 0.15 * s);
  ctx.fillStyle = rgb(mix(mix(lit('#3a3a40'), light.sun, 0.5 * light.warm), [255, 214, 140], light.night)); // windows glow warm in the evening and at night
  ctx.fillRect(x0 + 0.5 * s, y0 + 0.6 * s, 1.2 * s, 0.9 * s); ctx.fillRect(x0 + (w - 1.7) * s, y0 + 0.6 * s, 1.2 * s, 0.9 * s);
  if (light.night > 0.05) { glow(x0 + 1.1 * s, y0 + 1.05 * s, 1.6 * s); glow(x0 + (w - 1.1) * s, y0 + 1.05 * s, 1.6 * s); }
  ctx.fillStyle = rgb(lit(roof)); ctx.beginPath();
  ctx.moveTo(x0 - 0.9 * s, y0 + 0.2 * s); ctx.lineTo(x0 + (w + 0.9) * s, y0 + 0.2 * s); ctx.lineTo(x0 + (w - 1.4) * s, y0 - 2.3 * s); ctx.lineTo(x0 + 1.4 * s, y0 - 2.3 * s); ctx.fill();
  ctx.fillStyle = rgb(mix(lit(roof), [255, 240, 210], 0.3)); ctx.fillRect(x0 + 1.4 * s, y0 - 2.3 * s, (w - 2.8) * s, 0.3 * s);
  if (washing) { // a washing line on the far side of the house from the track, clothes swaying
    const lx = side < 0 ? x0 - 5.5 * s : x0 + (w + 1.5) * s, ly = b.y - 2 * s;
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
// Wind-bent black pine of the coast: a leaning trunk with flat, layered crowns.
function pine(b, s, k, now) {
  stats.trees++;
  const lean = (k < 0.5 ? -1 : 1) * 0.8 * s, sway = Math.sin(now * 1.2 + k * 25) * 0.08 * s;
  ctx.strokeStyle = rgb(lit('#5a3f2e')); ctx.lineWidth = Math.max(1, 0.35 * s); ctx.beginPath();
  ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x - lean * 0.2, b.y - 3 * s, b.x + lean, b.y - 6 * s); ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const cx = b.x + lean * (0.4 + i * 0.3) + sway * (i + 1), cy = b.y - (3.6 + i * 1.3) * s, rx = (2.6 - i * 0.6) * s;
    ctx.fillStyle = rgb(lit(i ? '#2f5a3a' : '#284f33')); ctx.beginPath(); ctx.ellipse(cx, cy, rx, 0.6 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = rgb(mix(lit('#5c8a54'), light.sun, 0.25 * light.warm)); ctx.beginPath(); ctx.ellipse(cx + 0.3 * s, cy - 0.25 * s, rx * 0.6, 0.3 * s, 0, 0, 7); ctx.fill();
  }
}
// Vermilion shrine gate.
function torii(b, s) {
  const red = rgb(lit('#d0452f')), w = 3.2 * s;
  ctx.fillStyle = red; ctx.fillRect(b.x - w * 0.4, b.y - 4 * s, 0.35 * s, 4 * s); ctx.fillRect(b.x + w * 0.4 - 0.35 * s, b.y - 4 * s, 0.35 * s, 4 * s);
  ctx.fillRect(b.x - w * 0.5, b.y - 3.3 * s, w, 0.3 * s);
  ctx.fillStyle = rgb(lit('#2a2224')); ctx.beginPath(); ctx.moveTo(b.x - w * 0.62, b.y - 4.2 * s); ctx.quadraticCurveTo(b.x, b.y - 3.9 * s, b.x + w * 0.62, b.y - 4.2 * s);
  ctx.lineTo(b.x + w * 0.55, b.y - 3.95 * s); ctx.lineTo(b.x - w * 0.55, b.y - 3.95 * s); ctx.fill();
}
// Hydrangea bushes, blue and violet, as seen around the temples in early summer.
function hydrangea(b, s, k) {
  ctx.fillStyle = rgb(lit('#3f7a45')); blob(b.x, b.y - 0.7 * s, 1.3 * s, k * 9, 6);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = rgb(lit(['#7a8fe0', '#a07ad6', '#6fa8e0', '#c69ae0'][(i + Math.floor(k * 10)) % 4]));
    ctx.beginPath(); ctx.arc(b.x + (i - 2) * 0.45 * s, b.y - (0.9 + 0.35 * hash(k + i)) * s, 0.38 * s, 0, 7); ctx.fill();
  }
}
const LEAF = { town: ['#3c7444', '#579a52', '#a2cc72'], temple: ['#2c5e35', '#3f7f45', '#7fb860'], maple: ['#a8402e', '#d0603a', '#f0a050'], paddies: ['#3f7a3a', '#5a9a48', '#9cc86a'], forest: ['#2c5e35', '#3f7f45', '#7fb860'], seaside: ['#3c7444', '#579a52', '#a2cc72'] };
function drawProp(name, b, k, now, side) {
  const s = b.s;
  if (name === 'town') {
    if (k < 0.4) house(b, s, k, now, ['#5a6270', '#c0504a', '#3f6fa0', '#6a5a4a'][Math.floor(k * 23) % 4], '#f4efe4', 5 + k * 4, 3 + (k < 0.2 ? 2 : 0), k < 0.1, side);
    else if (k < 0.48) pine(b, s, k, now);
    else roundTree(b, s, k, now, LEAF.town, 1.6, 1.8 + k * 1.5);
  } else if (name === 'pines') {
    if (k < 0.05) house(b, s, k, now, '#5a6270', '#f4efe4', 6, 3, true, side);
    else pine(b, s, k, now);
  } else if (name === 'temple') {
    if (k < 0.08) torii(b, s);
    else if (k < 0.2) cedar(b, s, k, now);
    else if (k < 0.32) hydrangea(b, s, k);
    else roundTree(b, s, k, now, k < 0.42 ? LEAF.maple : LEAF.temple, 2.4, 3 + k * 2);
  } else if (name === 'paddies') {
    if (k < 0.08 || (k > 0.3 && k < 0.36)) house(b, s, k, now, k < 0.08 ? '#7a6a4a' : '#56677a', '#f1e8d4', 6, 3, true, side);
    else roundTree(b, s, k, now, LEAF.paddies, 1.8 + k * 2, 2 + k * 2);
  } else if (name === 'forest') {
    if (k < 0.15 || (k > 0.3 && k < 0.42)) cedar(b, s, k, now);
    else roundTree(b, s, k, now, LEAF.forest, 2.6, 3.4 + k * 2);
  } else if (k < 0.16) house(b, s, k, now, ['#c0504a', '#3f6fa0', '#d08a3a'][Math.floor(k * 18) % 3], '#f6f2ea', 5, 3, k < 0.06, side);
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

export { blob, drawProp, FLOWERS, drawTuft, drawCat };
