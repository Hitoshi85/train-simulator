// The driver's desk below the window: speedometer, readouts, the one-handle lever, and the paw of
// this run's cat resting on it (g.coat, picked in run.js).
import { STATIONS, LIMITS, limitAt, gradeAt } from '../route.js';
import { P_MAX, EB, leverName } from '../physics.js';
import { stats } from '../debug.js';
import { g, COATS } from '../run.js';
import { ctx, W, H, VIEW_H } from './canvas.js';

const fmtClock = (t) => { t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
const DESK = '#3f5a52', DESK2 = '#344c45', LIP = '#26372f', PANEL = '#1f2b27', INK = '#eef3e8', DIM = '#a9bdb1';
// The lever: an upright slot, P3 at the top down to EB at the bottom, one stop per notch.
const LEVER_X = 760, LEVER_TOP = VIEW_H + 8, LEVER_H = 112, NOTCHES = P_MAX - EB;
const notchY = (l) => LEVER_TOP + (P_MAX - l) * LEVER_H / NOTCHES;
const MAX_KMH = 140; // the speedometer's top speed
let shown = null; // where the handle is drawn; it slides to the notch rather than jumping

function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// Painted frame of the front window: roof edge and the two pillars.
function drawFrame() {
  ctx.fillStyle = LIP;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 14); ctx.quadraticCurveTo(W / 2, 4, 0, 14); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, 0); ctx.lineTo(10, VIEW_H); ctx.lineTo(0, VIEW_H); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - 22, 0); ctx.lineTo(W - 10, VIEW_H); ctx.lineTo(W, VIEW_H); ctx.fill();
}
let deskGrad = null;
function drawDesk() {
  const Y = VIEW_H;
  if (!deskGrad) { deskGrad = ctx.createLinearGradient(0, Y - 26, 0, H); deskGrad.addColorStop(0, DESK); deskGrad.addColorStop(1, DESK2); }
  ctx.fillStyle = deskGrad;
  ctx.beginPath(); ctx.moveTo(0, Y - 6); ctx.quadraticCurveTo(W / 2, Y - 26, W, Y - 6); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.strokeStyle = LIP; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, Y - 6); ctx.quadraticCurveTo(W / 2, Y - 26, W, Y - 6); ctx.stroke();
  for (let i = 0; i < 160; i++) { // painted brush flecks
    ctx.fillStyle = `rgba(255,255,255,${0.02 + (i % 5) * 0.006})`;
    ctx.fillRect((i * 97.3) % W, Y + ((i * 53.7) % (H - Y)), 6, 2);
  }
}
function drawGauge(cx, cy, r, kmh, lim) {
  const ang = (k) => Math.PI * 0.75 + (Math.min(k, MAX_KMH) / MAX_KMH) * Math.PI * 1.5;
  ctx.fillStyle = LIP; ctx.beginPath(); ctx.arc(cx, cy, r + 9, 0, 7); ctx.fill();
  ctx.fillStyle = '#f1ead8'; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, 7); ctx.fill();
  ctx.strokeStyle = '#d33'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r - 3, ang(lim), ang(MAX_KMH)); ctx.stroke();
  ctx.strokeStyle = '#2a2a2a'; ctx.fillStyle = '#2a2a2a'; ctx.lineWidth = 2;
  ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let k = 0; k <= MAX_KMH; k += 20) {
    const a = ang(k);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10)); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
    ctx.fillText(k, cx + Math.cos(a) * (r - 20), cy + Math.sin(a) * (r - 20));
  }
  const na = ang(kmh);
  ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * (r - 6), cy + Math.sin(na) * (r - 6)); ctx.stroke();
  ctx.fillStyle = kmh > lim + 2 ? '#d01818' : '#2a2a2a'; ctx.font = 'bold 18px monospace';
  ctx.fillText(kmh.toFixed(0), cx, cy + r * 0.48);
  ctx.font = '9px sans-serif'; ctx.fillStyle = '#6a6a6a'; ctx.fillText('km/h', cx, cy + r * 0.48 + 14);
}
// A dark panel of readouts: rows of [label, value, colour].
function drawPanel(x, y, w, h, rows) {
  ctx.fillStyle = PANEL; roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = LIP; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  rows.forEach(([k, v, col], i) => {
    const yy = y + 16 + i * ((h - 12) / rows.length);
    ctx.fillStyle = DIM; ctx.font = '11px sans-serif'; ctx.fillText(k, x + 10, yy);
    ctx.fillStyle = col || INK; ctx.font = 'bold 16px sans-serif'; ctx.fillText(v, x + 10, yy + 17);
  });
}
// Approach bar: where the train is against the STOP mark over the last 50 m.
function drawApproach(x, y, w, h, d) {
  ctx.fillStyle = PANEL; roundRect(x, y, w, h, 6); ctx.fill();
  const scale = (h - 16) / 60, markY = y + 8 + 10 * scale; // shows -10 .. +50 m
  ctx.strokeStyle = '#f2c200'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, markY); ctx.lineTo(x + w - 4, markY); ctx.stroke();
  const ty = markY + Math.max(-10, Math.min(50, d)) * scale;
  ctx.fillStyle = '#58a6ff'; ctx.fillRect(x + w / 2 - 10, ty - 3, 20, 6);
  ctx.fillStyle = '#f2c200'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('STOP', x + w / 2, markY - 4);
  ctx.fillStyle = DIM; ctx.fillText('50 m', x + w / 2, y + h - 3);
}
const leverColour = (n) => n > 0 ? '#7ee787' : n === EB ? '#ff6b6b' : n < 0 ? '#ffb070' : INK;
// The one-handle lever: P3 at the top, EB at the bottom. Returns where the grip is.
function drawLever(dt) {
  const target = notchY(g.lever), x = LEVER_X;
  shown = shown === null ? target : shown + (target - shown) * Math.min(1, dt * 14);
  if (Math.abs(target - shown) < 0.3) shown = target;
  ctx.fillStyle = LIP; roundRect(x - 34, LEVER_TOP - 8, 62, LEVER_H + 16, 12); ctx.fill();
  ctx.fillStyle = '#0b0b0b'; ctx.fillRect(x - 3, LEVER_TOP, 6, LEVER_H);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let n = EB; n <= P_MAX; n++) {
    const y = notchY(n), on = n === g.lever;
    ctx.fillStyle = on ? leverColour(n) : DIM; ctx.font = on ? 'bold 14px monospace' : 'bold 11px monospace';
    ctx.fillText(leverName(n), x - 9, y);
    ctx.fillRect(x + 7, y - 1, 8, 2);
  }
  ctx.fillStyle = '#c9c9c9'; ctx.fillRect(x - 3, shown - 3, 36, 6);
  ctx.fillStyle = '#c23a3a'; roundRect(x + 24, shown - 10, 32, 20, 9); ctx.fill();
  return { x: x + 40, y: shown };
}
// The cat's paw on the grip, its leg reaching in from below.
function drawPaw(px, py, coat) {
  const fur = coat.fur, toes = coat.toes || fur, dark = fur === '#2a272d' || fur === '#25232a' || fur === '#3b2a22';
  ctx.save(); ctx.translate(px, py); ctx.rotate(-0.55); ctx.scale(0.62, 0.62);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)'; ctx.lineWidth = 4;
  ctx.fillStyle = fur;
  ctx.beginPath(); ctx.moveTo(-26, -6); ctx.quadraticCurveTo(-30, 60, -24, 220); ctx.lineTo(34, 220); ctx.quadraticCurveTo(40, 60, 30, -6); ctx.closePath();
  ctx.stroke(); ctx.fill();
  if (coat.stripe) {
    ctx.strokeStyle = coat.stripe; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-24, 30 + i * 30); ctx.quadraticCurveTo(0, 22 + i * 30, 30, 34 + i * 30); ctx.stroke(); }
  }
  for (const [c, x, y] of coat.patches || []) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, 18, 26, 0.3, 0, 7); ctx.fill(); }
  // the paw and four toes
  ctx.fillStyle = toes; ctx.strokeStyle = dark && toes === fur ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.25)'; ctx.lineWidth = 4;
  const blob = () => {
    ctx.beginPath(); ctx.ellipse(2, -8, 34, 26, 0, 0, 7);
    for (const [tx, ty] of [[-22, -26], [-8, -34], [8, -34], [22, -26]]) { ctx.moveTo(tx + 11, ty); ctx.ellipse(tx, ty, 11, 12, 0, 0, 7); }
  };
  blob(); ctx.stroke(); blob(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2;
  for (const tx of [-15, 0, 15]) { ctx.beginPath(); ctx.moveTo(tx, -30 + (tx ? 4 : 0)); ctx.lineTo(tx, -18); ctx.stroke(); }
  ctx.fillStyle = '#f2a0b0'; ctx.beginPath(); ctx.ellipse(2, -2, 10, 7, 0, 0, 7); ctx.fill(); // a pink bean peeking out
  ctx.restore();
  stats.pawDrawn++; stats.pawCoat = coat.id; stats.pawY = py;
}

let lastT = 0;
function drawCab() {
  const now = performance.now() / 1000, dt = lastT ? Math.min(0.1, now - lastT) : 1; lastT = now;
  const Y = VIEW_H, kmh = g.v * 3.6, lim = limitAt(g.pos);
  drawFrame(); drawDesk();
  drawGauge(100, Y + 82, 60, kmh, lim);
  const st = STATIONS[g.seg], d = st.pos - g.pos, pm = gradeAt(g.pos);
  const nl = LIMITS.find((L) => L.at > g.pos);
  drawPanel(186, Y + 12, 250, 140, [
    ['NEXT STOP', st.name],
    ['LIMIT · NEXT', `${lim} km/h · ${nl ? `${nl.lim} in ${Math.max(0, nl.at - g.pos).toFixed(0)} m` : '—'}`],
    ['GRADIENT', pm > 0 ? `▲ ${pm}‰` : pm < 0 ? `▼ ${-pm}‰` : 'Level', pm > 0 ? '#ffb86b' : pm < 0 ? '#79c0ff' : null],
  ]);
  const late = g.clock - g.sched;
  drawPanel(446, Y + 12, 160, 140, [
    ['TO MARK', Math.abs(d) < 100 ? (d >= 0 ? '' : '-') + Math.abs(d).toFixed(2) + ' m' : d.toFixed(0) + ' m', d < -1 ? '#ff5050' : d < 100 ? '#ffd33d' : null],
    ['CLOCK / DUE', fmtClock(g.clock)],
    [g.overspeedPen > 0 ? `SCORE (-${g.overspeedPen})` : 'SCORE', String(g.score)],
  ]);
  // due time beside the clock, green when on time
  ctx.fillStyle = late > 0 ? '#ff7b72' : '#7ee787'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right';
  ctx.fillText(fmtClock(g.sched), 446 + 160 - 8, Y + 12 + 16 + (140 - 12) / 3);
  drawApproach(616, Y + 12, 50, 140, d);
  const grip = drawLever(dt);
  drawPaw(grip.x + 4, grip.y + 2, COATS.find((c) => c.id === g.coat) || COATS[0]);
}

export { drawCab, notchY };
