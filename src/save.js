// On-device progress (localStorage).
import { stopCount } from './route.js';

// ---------- Saved progress (on this device, in localStorage) ----------
// One versioned JSON record, so it can later move to a cloud account as-is:
// { v, settings: { mode, muted }, best: { local|express: { score, rank, at } }, run: null | { mode, seg, clock, ... } }
const save = (() => {
  // Dev (/train-simulator/dev/) shares the browser origin with prod, so it keeps its own save.
  const keyFor = (path) => (/\/dev(\/|$)/.test(path) ? 'aozora.save.dev' : 'aozora.save');
  const KEY = keyFor(location.pathname), V = 1;
  const blank = () => ({ v: V, settings: { mode: 'local', muted: false }, best: {}, run: null });
  let data = blank();
  function load() {
    data = blank();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && raw.v === V) data = { ...data, ...raw, settings: { ...data.settings, ...raw.settings } };
      else if (KEY === 'aozora.save' && localStorage.getItem('aozora.muted') === '1') data.settings.muted = true; // before saves existed
    } catch { /* storage blocked or corrupt: start fresh */ }
    return data;
  }
  function write() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage blocked */ } }
  load();
  return {
    KEY, V, keyFor, load, write,
    get data() { return data; },
    setting(k, val) { data.settings[k] = val; write(); },
    setRun(run) { data.run = run; write(); },
    // Keeps the higher score for a mode; returns true when it is a new best.
    record(mode, score, rank) {
      const b = data.best[mode];
      if (b && b.score >= score) return false;
      data.best[mode] = { score, rank, at: new Date().toISOString() };
      write(); return true;
    },
    clear() { data = blank(); write(); },
  };
})();
const rankOf = (score, mode) => { const pct = score / (stopCount(mode) * 2200); return pct > 0.85 ? 'S' : pct > 0.7 ? 'A' : pct > 0.5 ? 'B' : pct > 0.3 ? 'C' : 'D'; };

export { save, rankOf };
