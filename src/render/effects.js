// Birds, petals, fireflies, the painted wash, night lights, rain and snow.
import { hash } from '../route.js';
import { stats } from '../debug.js';
import { g } from '../run.js';
import { ctx, W, VIEW_H, HORIZON, cam, project, hex, mix, rgb } from './canvas.js';
import { light } from './light.js';

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
  const a = 0.75 * (1 - L.warm) * (1 - L.night) * (1 - L.wet - L.snowy);
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
  if (cam.frame && L.night < 0.9 && L.wet + L.snowy < 0.9) { // sun rays, only in the main view
    const sx = W * L.sunX, sy = HORIZON * L.sunY;
    const rays = (0.05 + 0.07 * L.warm + (L.phase === 'morning' ? 0.04 : 0)) * (1 - L.night) * (1 - L.wet - L.snowy);
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
// ---------- Night lights, rain and snow ----------
// Lights (windows, lamps, headlights) are collected while drawing, then added on top of the
// night tint so they shine. One soft sprite keeps this cheap.
const glows = [];
const glowSprite = document.createElement('canvas');
glowSprite.width = glowSprite.height = 64;
{
  const gx = glowSprite.getContext('2d'), gr = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,226,160,1)'); gr.addColorStop(0.3, 'rgba(255,200,120,.45)'); gr.addColorStop(1, 'rgba(255,190,110,0)');
  gx.fillStyle = gr; gx.fillRect(0, 0, 64, 64);
}
const glow = (x, y, r) => { if (glows.length < 120 && r > 0.5) glows.push(x, y, r); };
function drawNightLights(L) {
  if (L.night < 0.05) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (cam.frame) { // our headlight beam down the track
    const beam = ctx.createLinearGradient(0, VIEW_H, 0, HORIZON + 10);
    beam.addColorStop(0, `rgba(255,236,190,${0.28 * L.night})`); beam.addColorStop(1, 'rgba(255,236,190,0)');
    const a = project(-1.6, 0, 6), b = project(1.6, 0, 6), c = project(1.2, 0, 140), d = project(-1.2, 0, 140);
    ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(a.x - 60, VIEW_H); ctx.lineTo(b.x + 60, VIEW_H); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.fill();
  }
  ctx.globalAlpha = Math.min(1, L.night * 1.2);
  for (let i = 0; i < glows.length; i += 3) { const r = glows[i + 2]; ctx.drawImage(glowSprite, glows[i] - r, glows[i + 1] - r, r * 2, r * 2); }
  ctx.restore();
  stats.glows += glows.length / 3;
}
// Rain streaks or snowflakes over the view (fewer in the small camera insets), drops on the cab glass.
function drawPrecip(L, now) {
  const a = L.wet + L.snowy;
  if (a < 0.02) return;
  const n = Math.round((cam.frame ? 170 : 70) * a), v = g.v;
  ctx.beginPath();
  if (L.wet) {
    const slant = 0.18 + Math.min(0.5, v * 0.02);
    for (let i = 0; i < n; i++) {
      const y = (hash(i + 500) * VIEW_H + now * (700 + 400 * hash(i + 501))) % VIEW_H;
      const x = ((hash(i + 502) * W - y * slant) % W + W) % W, len = 10 + 10 * hash(i + 503);
      ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len);
    }
    ctx.strokeStyle = rgb(mix([225, 232, 245], L.haze, 0.2), 0.6); ctx.lineWidth = 1.2; ctx.stroke();
    if (cam.frame) { // drops on the cab window, sliding down
      ctx.beginPath();
      for (let i = 0; i < Math.round(28 * a); i++) {
        const x = 20 + hash(i + 600) * (W - 40), y = 20 + (hash(i + 601) * VIEW_H + now * (6 + 14 * hash(i + 602))) % (VIEW_H - 30), r = 1.5 + 2 * hash(i + 603);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 7);
      }
      ctx.fillStyle = 'rgba(225,235,245,.35)'; ctx.fill();
    }
  } else {
    for (let i = 0; i < n; i++) {
      const sp = 30 + 40 * hash(i + 510), y = (hash(i + 511) * VIEW_H + now * sp) % VIEW_H;
      const x = ((hash(i + 512) * W + Math.sin(now * 0.8 + i) * 14 - now * v * 3 * (hash(i + 513) - 0.5)) % W + W) % W, r = 1.5 + 2.5 * hash(i + 514);
      ctx.rect(x, y, r, r);
    }
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
  }
  stats.precip += n;
}

export { glow, drawBirds, drawPetals, drawFirefly, drawWash, glows, drawNightLights, drawPrecip };
