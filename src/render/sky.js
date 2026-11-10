// Sky, clouds and distant landmarks.
import { ROUTE, hash } from '../route.js';
import { stats } from '../debug.js';
import { ctx, W, HORIZON, FOCAL, cam, mix, rgb } from './canvas.js';
import { lit } from './light.js';
import { blob } from './props.js';

// Where the line is on the map, and which way it heads, for distant landmarks (see ROUTE.turn).
function mapAt(p) {
  const [t0, t1] = ROUTE.turn, R = (t1 - t0) / (Math.PI / 2);
  if (p <= t0) return { x: 0, y: -p, h: -Math.PI / 2 };
  if (p <= t1) { const a = (p - t0) / R; return { x: R - R * Math.cos(a), y: -t0 - R * Math.sin(a), h: -Math.PI / 2 + a }; }
  return { x: R + (p - t1), y: -t0 - R, h: 0 };
}
// Screen position of a landmark for the current camera: x on screen, distance, or null if out of view.
function landmarkView(id, pan) {
  const m = ROUTE.landmarks.find((l) => l.id === id), c = mapAt(cam.pos);
  const dx = m.x - c.x, dy = m.y - c.y, d = Math.hypot(dx, dy);
  let rel = -(Math.atan2(dy, dx) - c.h - (cam.dir < 0 ? Math.PI : 0)); // angle to the right of view
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  if (Math.abs(rel) > 1.1) return null;
  const sx = W / 2 + Math.tan(rel) * FOCAL, x = (cam.dir > 0 ? sx : W - sx) + pan * 0.15; // backdrops are mirrored looking back
  if (x < -300 || x > W + 300) return null;
  stats.landmarks[id] = (stats.landmarks[id] || 0) + 1;
  return { x, d, k: FOCAL / d };
}
const CLOUDS = Array.from({ length: 7 }, (_, i) => ({
  x: hash(i + 40) * 1400, y: 30 + hash(i + 41) * 60, r: 13 + hash(i + 42) * 20,
  n: 6 + Math.floor(hash(i + 43) * 5), tall: hash(i + 44) < 0.4, sp: 2 + hash(i + 45) * 4,
}));
// Screen-space backdrops (sky, hills, islands, hillside town) are painted for a forward view.
// A camera looking back along the track sees the world left-right swapped, so mirror them to
// keep them on the same side as the track-side scenery (e.g. the sea stays on the sea side).
function backdrop(fn) {
  if (cam.dir > 0) { fn(); return; }
  ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); fn(); ctx.restore();
  stats.mirrored++;
}
function drawSky(L, pan, now) { backdrop(() => paintSky(L, pan, now)); }
function paintSky(L, pan, now) {
  const grd = ctx.createLinearGradient(0, 0, 0, HORIZON);
  grd.addColorStop(0, rgb(L.top)); grd.addColorStop(0.55, rgb(L.mid)); grd.addColorStop(1, rgb(L.low));
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, HORIZON + 2);
  if (L.night > 0.05) { // stars, hidden by rain and snow clouds
    ctx.fillStyle = `rgba(255,250,235,${(L.night * (1 - L.wet - L.snowy) * 0.9).toFixed(2)})`; ctx.beginPath();
    for (let i = 0; i < 70; i++) { const r = 0.8 + hash(i + 300) * 1.4; ctx.rect(hash(i + 200) * W, hash(i + 250) * HORIZON * 0.9, r, r); }
    ctx.fill();
  }
  // sun (or moon) and its soft glow
  const sx = W * L.sunX, sy = HORIZON * L.sunY, R = L.sunR;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 5);
  glow.addColorStop(0, rgb(L.sun, 0.85)); glow.addColorStop(0.25, rgb(L.sun, 0.3)); glow.addColorStop(1, rgb(L.sun, 0));
  ctx.fillStyle = glow; ctx.fillRect(sx - R * 5, sy - R * 5, R * 10, R * 10);
  ctx.fillStyle = rgb(mix(L.sun, [255, 255, 255], 0.4)); ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.fill();
  drawFuji(L, pan);
  // towering summer clouds: a shadowed mass, then sunlit puffs leaning toward the sun
  const shade = mix(mix(L.mid, mix([150, 150, 185], L.top, L.night * 0.8), 0.35), L.low, 0.25);
  const dim = Math.min(0.85, L.night * 0.8 + (L.wet + L.snowy) * 0.7); // grey rain clouds, dark night clouds
  const bright = mix(mix([255, 255, 255], L.sun, 0.25 + 0.45 * L.warm), mix(L.mid, L.haze, 0.5), dim);
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

// Distant landmarks of the real line, placed by map bearing so every camera sees them where they are:
// the snow-capped volcano far across the bay, Enoshima island with its lighthouse tower, the cape.
function drawFuji(L, pan) {
  const v = landmarkView('fuji', pan); if (!v) return;
  const h = 3776 * v.k * 2.2, w = h * 3, x = v.x, y = HORIZON + 2;
  ctx.fillStyle = rgb(mix(lit('#7484b0'), L.haze, 0.45)); ctx.beginPath();
  ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.35, y - h * 0.55, x - w * 0.12, y - h); ctx.lineTo(x + w * 0.12, y - h);
  ctx.quadraticCurveTo(x + w * 0.35, y - h * 0.55, x + w, y); ctx.fill();
  ctx.fillStyle = rgb(mix([250, 250, 255], L.sun, 0.3), 0.92); ctx.beginPath(); // snow cap with streaks
  ctx.moveTo(x - w * 0.12, y - h); ctx.lineTo(x + w * 0.12, y - h); ctx.lineTo(x + w * 0.26, y - h * 0.64);
  for (let i = 4; i >= -4; i--) ctx.lineTo(x + i * w * 0.06, y - h * (i % 2 ? 0.6 : 0.74));
  ctx.lineTo(x - w * 0.26, y - h * 0.64); ctx.fill();
}
function drawIslands(L, pan) {
  const isle = landmarkView('enoshima', pan);
  if (isle) {
    const k = Math.min(isle.k, 0.35), x = isle.x, y = HORIZON - 2, w = 520 * k, h = 70 * k;
    ctx.fillStyle = rgb(mix(lit('#4f7d58'), L.haze, 0.4)); ctx.beginPath();
    ctx.moveTo(x - w, y); ctx.bezierCurveTo(x - w * 0.6, y - h * 1.1, x + w * 0.3, y - h * 1.2, x + w, y); ctx.fill();
    ctx.fillStyle = rgb(mix(lit('#6c9a64'), L.haze, 0.35)); blob(x - w * 0.2, y - h * 0.75, h * 0.5, 3, 6);
    const tx = x + w * 0.05, th = 60 * k, tw = Math.max(1.5, 7 * k); // lighthouse tower on the summit
    ctx.fillStyle = rgb(mix(lit('#e8e6e0'), L.haze, 0.25)); ctx.fillRect(tx - tw / 2, y - h - th, tw, th);
    ctx.fillRect(tx - tw * 1.3, y - h - th, tw * 2.6, Math.max(1, 4 * k));
    ctx.fillStyle = rgb(mix(lit('#b6c0c8'), L.haze, 0.25)); ctx.fillRect(tx - tw * 0.6, y - h - th - 6 * k, tw * 1.2, 6 * k);
  }
  const cape = landmarkView('cape', pan);
  if (cape) {
    const k = Math.min(cape.k, 0.3), x = cape.x, y = HORIZON - 2, w = 900 * k, h = 45 * k, s = 1;
    ctx.fillStyle = rgb(mix(lit('#3f6f47'), L.haze, 0.35)); ctx.beginPath();
    ctx.moveTo(x - s * w * 0.2, y); ctx.quadraticCurveTo(x - s * w * 0.1, y - h * 1.2, x + s * w * 0.3, y - h);
    ctx.quadraticCurveTo(x + s * w * 0.8, y - h * 0.8, x + s * w * 1.4, y - h * 0.3); ctx.lineTo(x + s * w * 1.4, y); ctx.fill();
    ctx.fillStyle = rgb(mix(lit('#d9c39a'), L.haze, 0.3)); ctx.fillRect(Math.min(x - s * w * 0.2, x + s * w * 1.4), y - 1, w * 1.6, 2);
  }
}

export { backdrop, drawIslands, drawSky, mapAt };
