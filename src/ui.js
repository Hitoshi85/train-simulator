// Input (keys, touch buttons, pause) and player feedback.
import { STATIONS, MODES, MODE_NAMES, DWELL } from './route.js';
import { P_MAX, B_MAX, EB } from './physics.js';
import { save } from './save.js';
import { stats, hook } from './debug.js';
import { g, reset, weatherAt, setMode, nextStop, startSegment, flash, resumeRun } from './run.js';
import { sound } from './audio.js';
import { canvas } from './render/canvas.js';
import { lightAt } from './render/light.js';

// ---------- Input ----------
function setPaused(p) {
  g.paused = p && g.state === 'running';
  const b = document.getElementById('pause');
  if (b) b.textContent = g.paused ? '▶ Resume' : '⏸ Pause';
}
// ---------- Player feedback ----------
// The site is static, so feedback goes to GitHub as a prefilled issue from the repo's feedback form
// (labelled feedback, so it lands in the backlog and notifies the owner). The game context is filled in.
const FEEDBACK_NEW = 'https://github.com/hitoshi85/train-simulator/issues/new';
const GAME_VERSION = (() => { try { return new URL(document.querySelector('script[src*="game.js"]').src).searchParams.get('v') || 'dev'; } catch { return 'dev'; } })();
function feedbackContext() {
  const at = Math.round(g.pos), prev = [...STATIONS].reverse().find((s) => s.pos <= g.pos) || STATIONS[0];
  const where = g.state === 'title' ? 'title screen' : g.state === 'end' ? 'end of the line'
    : `${at} m, after ${prev.name}, heading for ${STATIONS[g.seg].name}`;
  const w = weatherAt(g.pos);
  return [
    `Game version: v${GAME_VERSION}`,
    `Mode: ${MODE_NAMES[g.mode]}`,
    `Where: ${where}`,
    `Speed: ${Math.round(g.v * 3.6)} km/h, score ${g.score}`,
    `Time of day: ${lightAt(g.pos).phase}`,
    `Weather: ${w.amt > 0 ? `${w.kind} (${Math.round(w.amt * 100)}%)` : 'clear'}`,
    `Screen: ${innerWidth}x${innerHeight}, ${matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse/keyboard'}`,
  ].join('\n');
}
function feedbackUrl() {
  const q = new URLSearchParams({ template: 'feedback.yml', title: 'Feedback: ', context: feedbackContext(), device: navigator.userAgent });
  return `${FEEDBACK_NEW}?${q}`;
}
function sendFeedback() {
  setPaused(true); // the train waits while the player writes
  stats.feedbackOpened++;
  stats.lastFeedbackUrl = feedbackUrl();
  if (!hook.paused) window.open(stats.lastFeedbackUrl, '_blank', 'noopener');
}

function act(a) {
  if (a === 'mute') { sound.toggle(); return; }
  if (a === 'feedback') { sendFeedback(); return; }
  if (a === 'pause') { setPaused(!g.paused); return; }
  if (g.paused) { if (a === 'enter') setPaused(false); return; } // only resume while paused
  if (a === 'enter') {
    if (g.state === 'title' && save.data.run && resumeRun()) return;
    if (g.state === 'title') { g.state = 'ready'; startSegment(); flash('Doors closed. Off we go on P1!', 3); }
    else if (g.state === 'arrived') {
      if (g.seg >= STATIONS.length - 1) { g.state = 'end'; }
      else {
        g.clock = Math.max(g.clock + 15, g.sched + DWELL);
        g.seg = nextStop(g.seg); startSegment();
      }
    } else if (g.state === 'end') { reset(); setMode(g.mode); }
    return;
  }
  if (g.state === 'title' && save.data.run) { // a saved run: Enter continues it, N starts over
    if (a === 'neutral') { save.setRun(null); flash('Saved run cleared. Pick a mode.', 2); }
    return;
  }
  if (g.state === 'title') { // ▲/▼ (or L/E) pick the mode on the title screen
    if (a === 'power' || a === 'brake') setMode(MODES[(MODES.indexOf(g.mode) + 1) % MODES.length]);
    else if (a === 'local' || a === 'express') setMode(a);
    return;
  }
  if (g.state !== 'running') return;
  if (a === 'power') g.lever = Math.min(P_MAX, g.lever === EB ? -B_MAX : g.lever + 1);
  else if (a === 'brake') g.lever = Math.max(-B_MAX, g.lever === EB ? EB : g.lever - 1);
  else if (a === 'neutral') g.lever = 0;
  else if (a === 'eb') g.lever = EB;
}
const KEYS = { ArrowUp: 'power', KeyW: 'power', ArrowDown: 'brake', KeyS: 'brake', KeyN: 'neutral', Space: 'eb', Enter: 'enter', NumpadEnter: 'enter', KeyM: 'mute', KeyP: 'pause', Escape: 'pause', KeyL: 'local', KeyE: 'express', KeyF: 'feedback' };
// Browsers only allow audio after a user gesture, so start it on the first key or tap.
addEventListener('keydown', () => sound.start());
addEventListener('pointerdown', () => sound.start());
addEventListener('keydown', (e) => { const a = KEYS[e.code]; if (a) { e.preventDefault(); if (!e.repeat || a !== 'enter') act(a); } });
// Feedback opens a new tab, which phones only allow from a click (not a pointerdown).
document.querySelectorAll('#touch button').forEach((b) => (b.dataset.act === 'feedback'
  ? b.addEventListener('click', () => act('feedback'))
  : b.addEventListener('pointerdown', (e) => { e.preventDefault(); act(b.dataset.act); })));
canvas.addEventListener('pointerdown', () => { if (g.state !== 'running' || g.paused) act('enter'); });
// Switching tabs or apps (or locking the phone) pauses the run so the train does not drive on alone.
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

export { act, setPaused, feedbackUrl };
