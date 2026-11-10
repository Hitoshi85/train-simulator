// The canvas, the current drawing context, the camera and projection, colour helpers.

const canvas = document.getElementById('game');
const mainCtx = canvas.getContext('2d');
let ctx = mainCtx;           // swapped to an offscreen context while drawing camera insets
const W = canvas.width, H = canvas.height;
const VIEW_H = 440;          // height of the 3D view; the dashboard is below
const HORIZON = 170;
const CAM_H = 3;             // camera height (m)
const FOCAL = 600;           // projection focal length (px)
// ---------- Rendering ----------
// Lateral offset of the track at distance z ahead (approximate curve integration)
// A camera sits at track position `pos`, looks along the track (dir 1 = forward, -1 = back),
// and is offset `x` m sideways at height `h` m. The cab view is { pos: g.pos, dir: 1, x: 0 }.
const offCache = [];
let cam = { pos: 0, dir: 1, x: 0, h: CAM_H };
const setCam = (view) => { cam = view; };
const setCtx = (c) => { ctx = c; };
const zOf = (s) => (s - cam.pos) * cam.dir;           // distance ahead of the camera
const span = (len) => cam.dir > 0 ? [cam.pos, cam.pos + len] : [cam.pos - len, cam.pos];
function project(x, y, z) {
  const zi = Math.min(offCache.length - 1, Math.max(0, Math.round(z / 5)));
  const off = offCache[zi];
  return { x: W / 2 + (cam.dir * (x - cam.x) - off) * FOCAL / z, y: HORIZON + (cam.h - y) * FOCAL / z, s: FOCAL / z };
}
// Colour helpers: colours are [r, g, b] arrays so they can be blended with the light.
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export { canvas, hex, mix, ctx, W, HORIZON, FOCAL, cam, rgb, VIEW_H, zOf, span, project, offCache, setCam, mainCtx, setCtx, H, CAM_H };
