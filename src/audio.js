// Sound: power/brake mix and all generated audio.
import { limitAt } from './route.js';
import { B_MAX, EB } from './physics.js';
import { save } from './save.js';
import { g } from './run.js';

// Power and brake sound levels, like a modern commuter EMU: the inverter whine rises in pitch with
// speed under power, falls with it under regenerative braking (which fades out below ~7 km/h, where
// the air brake takes over) and is silent when coasting. Air hiss only under heavy braking.
function soundMix(v, lever, state) {
  const kmh = v * 3.6, running = state === 'running';
  const whineHz = 140 + kmh * 9;
  const soft = Math.min(1, kmh / 4); // fade in from standstill so pull-away never clicks on
  let whine = 0;
  if (running && lever > 0) whine = (0.018 + 0.006 * lever) * Math.max(0.35, soft);
  else if (running && lever < 0 && lever > EB) whine = (0.01 + 0.004 * -lever) * Math.min(1, Math.max(0, (kmh - 5) / 6));
  const hiss = running && v > 0.3 && (lever <= -B_MAX) ? 0.004 + (lever === EB ? 0.003 : 0) : 0;
  return { whineHz, whine, hiss };
}

// ---------- Sound (all generated with Web Audio: no audio files, original tunes) ----------
const sound = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  let muted = !!save.data.settings.muted;
  let ac = null, master, sfx, music, noise, motor, motorGain, motorFilter, roll, hiss;
  let prevState = '', prevLever = 0, joint = 0, beepT = 0, nextNote = 0, stepN = 0;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function tone(freq, t, dur, type, vol, dest = sfx) {
    const o = ac.createOscillator(), e = ac.createGain();
    o.type = type; o.frequency.value = freq;
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function burst(t, dur, freq, vol, q = 1) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
    src.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(e).connect(sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  // soft air: noise that swells in and fades, filtered low so it never sounds harsh
  function puff(t, dur, vol) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
    src.buffer = noise; f.type = 'lowpass'; f.frequency.value = 2200;
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(vol, t + 0.06);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(e).connect(sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function loopNoise(type, freq, dest) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
    src.buffer = noise; src.loop = true; f.type = type; f.frequency.value = freq; e.gain.value = 0;
    src.connect(f).connect(e).connect(dest); src.start();
    return e;
  }

  function start() {
    if (ac || !AC) return;
    try {
      ac = new AC();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
      sfx = ac.createGain(); sfx.gain.value = 1; sfx.connect(master);
      music = ac.createGain(); music.gain.value = 0.22; music.connect(master);
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const ch = noise.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      // inverter whine: a smooth tone plus a soft octave below, pitch follows speed (see mix())
      motor = [ac.createOscillator(), ac.createOscillator()];
      motorFilter = ac.createBiquadFilter(); motorFilter.type = 'lowpass'; motorFilter.frequency.value = 1800; motorFilter.Q.value = 0.5;
      motorGain = ac.createGain(); motorGain.gain.value = 0;
      motor[0].type = 'sine'; motor[1].type = 'triangle';
      const sub = ac.createGain(); sub.gain.value = 0.35;
      motor[0].frequency.value = 120; motor[0].connect(motorFilter); motor[0].start();
      motor[1].frequency.value = 60; motor[1].connect(sub).connect(motorFilter); motor[1].start();
      motorFilter.connect(motorGain).connect(sfx);
      roll = loopNoise('lowpass', 350, sfx);
      hiss = loopNoise('bandpass', 2600, sfx);
      nextNote = ac.currentTime + 0.1;
    } catch { ac = null; }
  }

  // Original background tune: C - Am - F - G, eighth notes at 104 bpm (null = rest).
  const MELODY = [
    76, null, 79, null, 81, 79, 76, null, 72, null, 76, null, 74, 72, 69, null,
    77, null, 81, null, 84, 81, 79, 77, 79, null, null, 74, 76, null, 74, null,
    76, null, 79, null, 81, 79, 76, 79, 72, null, 76, 77, 76, 74, 72, null,
    77, null, 81, null, 84, null, 81, 79, 74, 76, 79, null, 84, null, null, null,
  ];
  const CHORDS = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]];
  function scheduleMusic() {
    const eighth = 60 / 104 / 2;
    while (nextNote < ac.currentTime + 0.3) {
      const i = stepN % MELODY.length, bar = Math.floor(i / 8) % 4, chord = CHORDS[bar];
      if (MELODY[i]) tone(mtof(MELODY[i]), nextNote, eighth * 1.6, 'triangle', 0.18, music);
      if (i % 4 === 0) tone(mtof(chord[0] - 12 + (i % 8 ? 7 : 0)), nextNote, eighth * 3, 'sine', 0.3, music);
      if (i % 8 === 0) chord.forEach((m) => tone(mtof(m + 12), nextNote, eighth * 7.5, 'sine', 0.05, music));
      nextNote += eighth; stepN++;
    }
  }

  function update(dt) {
    if (!ac) return;
    // Pausing freezes every sound and the music where it is.
    if (g.paused) { if (ac.state === 'running') ac.suspend().catch(() => {}); return; }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const t = ac.currentTime, kmh = g.v * 3.6, running = g.state === 'running';
    scheduleMusic();
    // continuous sounds
    const m = soundMix(g.v, g.lever, g.state);
    motor[0].frequency.setTargetAtTime(m.whineHz, t, 0.12);
    motor[1].frequency.setTargetAtTime(m.whineHz / 2, t, 0.12);
    motorGain.gain.setTargetAtTime(m.whine, t, 0.35);
    roll.gain.setTargetAtTime(Math.min(1, g.v / 25) * 0.22, t, 0.2);
    hiss.gain.setTargetAtTime(m.hiss, t, 0.25);
    // rail joints every 25 m: a clack for each pair of wheels
    const j = Math.floor(g.pos / 25);
    if (j !== joint && g.v > 1) {
      const gap = Math.min(0.4, 2.5 / g.v);
      burst(t, 0.06, 1100, 0.5, 2); burst(t + gap, 0.06, 1000, 0.45, 2);
    }
    joint = j;
    // a soft lever click, a gentle "pshh" when the brake goes on harder and a sigh when it is released
    if (g.lever !== prevLever) {
      tone(1200, t, 0.025, 'triangle', 0.02);
      if (g.lever < prevLever && g.lever < 0 && running) puff(t, 0.35, 0.035);
      if (prevLever < 0 && g.lever >= 0 && running) puff(t, 0.5, 0.025);
    }
    prevLever = g.lever;
    // overspeed warning beep
    beepT -= dt;
    if (running && kmh > limitAt(g.pos) + 2 && beepT <= 0) { tone(1320, t, 0.12, 'square', 0.07); beepT = 0.5; }
    // door chime on departure, original arrival melody at each stop
    if (g.state !== prevState) {
      if (g.state === 'running') [988, 784].forEach((f, k) => tone(f, t + k * 0.35, 0.6, 'sine', 0.2));
      if (g.state === 'arrived') [72, 76, 79, 84, 81, 84].forEach((m, k) => tone(mtof(m), t + 0.2 + k * 0.16, 0.5, 'triangle', 0.18));
      if (g.state === 'end') [72, 79, 84, 88].forEach((m, k) => tone(mtof(m), t + k * 0.22, 0.9, 'triangle', 0.18));
    }
    prevState = g.state;
  }

  function toggle() {
    muted = !muted;
    save.setting('muted', muted);
    if (ac) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.05);
    syncButton();
  }
  function syncButton() {
    const b = document.getElementById('mute');
    if (b) b.textContent = muted ? '🔇 Sound off' : '🔊 Sound on';
  }
  syncButton();
  return { start, update, toggle, mix: soundMix, get muted() { return muted; }, get started() { return !!ac; } };
})();

export { sound };
