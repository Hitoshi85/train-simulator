// Camera insets: views from the other cameras.
import { STATIONS, TRAIN_LEN } from '../route.js';
import { stats } from '../debug.js';
import { g } from '../run.js';
import { mainCtx, ctx, W, VIEW_H, setCtx } from './canvas.js';
import { drawWorld } from './world.js';

// ---------- Camera insets (rendered views from other cameras) ----------
const INSET_W = 220, INSET_H = Math.round(INSET_W * VIEW_H / W), INSET_X = W - 14 - 8 - INSET_W;
// Insets are drawn at INSET_W px wide, so render them at just over that size (not half the
// screen): three cameras near a station then fit the 16 ms phone frame budget.
const INSET_SCALE = 0.25;
const insetCanvas = document.createElement('canvas');
insetCanvas.width = W * INSET_SCALE; insetCanvas.height = VIEW_H * INSET_SCALE;
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
    setCtx(offCtx);
    ctx.setTransform(INSET_SCALE, 0, 0, INSET_SCALE, 0, 0);
    drawWorld(v.cam);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    setCtx(mainCtx);
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

export { insetViews, drawInsets };
