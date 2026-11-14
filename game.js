// Aozora Line – a tiny original train-driving game.
// Drive a seaside line based on real towns in Japan, respect speed limits, stop on the mark on time.
// Entry module: the main loop and the test hook. The game itself lives in src/ (see CLAUDE.md for
// which module owns what). Native ES modules, no build step.
import { STATIONS, GRADES, LIMITS, limitAt, gradeAt, catsBetween, stopsAt, ROUTE } from './src/route.js';
import { accel } from './src/physics.js';
import { save } from './src/save.js';
import { stats, hook } from './src/debug.js';
import { g, update, weatherAt, COATS } from './src/run.js';
import { sound } from './src/audio.js';
import { act, setPaused, feedbackUrl } from './src/ui.js';
import { CAM_H } from './src/render/canvas.js';
import { lightAt } from './src/render/light.js';
import { mapAt } from './src/render/sky.js';
import { scene, updateScene } from './src/render/land.js';
import { drawWorld } from './src/render/world.js';
import { insetViews, drawInsets } from './src/render/insets.js';
import { drawWarning, drawOverlay } from './src/render/hud.js';
import { drawCab } from './src/render/cab.js';

// ---------- Main loop ----------
function render() {
  stats.frames++;
  drawWorld({ pos: g.pos, dir: 1, x: 0, h: CAM_H, frame: true });
  if (g.state !== 'title' && g.state !== 'end') drawInsets();
  drawCab(); drawWarning(); drawOverlay();
}
// Test hook: draw one camera ('cab', 'front', 'rear', 'platform') full size on the main canvas.
function renderCam(id) {
  const v = id === 'cab' ? { cam: { pos: g.pos, dir: 1, x: 0, h: CAM_H } } : insetViews().find((x) => x.id === id);
  if (v) drawWorld(v.cam);
  return !!v;
}
function step(dt) { if (g.paused) return; update(dt); updateScene(dt); }
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!hook.paused) { step(dt); render(); }
  sound.update(dt);
  requestAnimationFrame(frame);
}


// Exposed for automated testing: set paused = true, then drive the game with step(dt) and render().
Object.defineProperties(hook, Object.getOwnPropertyDescriptors({ get state() { return g; }, save, scene, stats, act, step, render, renderCam, setPaused, sound, STATIONS, get LIMITS() { return LIMITS; }, GRADES, accel, limitAt, gradeAt, catsBetween, lightAt, stopsAt, ROUTE, mapAt, weatherAt, feedbackUrl, COATS,
  setWeather(kind, from = 0, to = 1e9) { g.wx = { kind, from, to }; }, // 'rain', 'snow' or 'clear' between two positions
  drawView(view) { drawWorld(view); }, // draw one camera's view full size (for screenshots and tests)
}));
window.__train = hook;
requestAnimationFrame(frame);
