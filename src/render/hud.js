// Dashboard, messages and panels.
import { STATIONS, MODE_NAMES, LIMITS, stopCount, limitAt, gradeAt } from '../route.js';
import { P_MAX, EB, leverName } from '../physics.js';
import { save, rankOf } from '../save.js';
import { g } from '../run.js';
import { ctx, W, H, VIEW_H } from './canvas.js';
import { light } from './light.js';
import { scene } from './land.js';

const fmtClock = (t) => { t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };

function drawDash() {
  const y0 = VIEW_H;
  ctx.fillStyle = '#23272e'; ctx.fillRect(0, y0, W, H - y0);
  ctx.textBaseline = 'alphabetic';
  // speedometer
  const cx = 110, cy = y0 + 82, r = 64, kmh = g.v * 3.6, lim = limitAt(g.pos);
  const ang = (k) => Math.PI * 0.75 + (Math.min(k, 120) / 120) * Math.PI * 1.5;
  ctx.fillStyle = '#0f1115'; ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, 7); ctx.fill();
  ctx.strokeStyle = '#d33'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, ang(lim), ang(120)); ctx.stroke();
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
  ctx.fillStyle = '#ccc'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let k = 0; k <= 120; k += 20) {
    const a = ang(k);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10)); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke();
    ctx.fillText(k, cx + Math.cos(a) * (r - 22), cy + Math.sin(a) * (r - 22));
  }
  const na = ang(kmh);
  ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * (r - 6), cy + Math.sin(na) * (r - 6)); ctx.stroke();
  ctx.fillStyle = kmh > lim + 2 ? '#ff5050' : '#fff'; ctx.font = 'bold 22px monospace';
  ctx.fillText(kmh.toFixed(0), cx, cy + 34);
  ctx.font = '10px sans-serif'; ctx.fillStyle = '#999'; ctx.fillText('km/h', cx, cy + 50);

  // lever
  const lx = 220, ly = y0 + 14, notches = [];
  for (let n = P_MAX; n >= EB; n--) notches.push(n);
  ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
  notches.forEach((n, i) => {
    const y = ly + i * 17;
    const on = n === g.lever;
    ctx.fillStyle = on ? (n > 0 ? '#3fb950' : n < 0 ? (n === EB ? '#ff3030' : '#f0883e') : '#ddd') : '#444';
    ctx.fillRect(lx, y, 34, 14);
    ctx.fillStyle = on ? '#000' : '#aaa'; ctx.fillText(leverName(n), lx + 5, y + 11);
  });
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px monospace'; ctx.fillText(leverName(g.lever), lx + 42, ly + 70);

  // info
  const st = STATIONS[g.seg];
  const d = st.pos - g.pos;
  const ix = 320;
  ctx.textAlign = 'left'; ctx.fillStyle = '#9da7b3'; ctx.font = '13px sans-serif';
  ctx.fillText('NEXT STOP', ix, y0 + 24);
  ctx.fillText('SPEED LIMIT', ix, y0 + 70);
  ctx.fillText('NEXT LIMIT', ix, y0 + 116);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(st.name, ix, y0 + 48);
  ctx.fillText(lim + ' km/h', ix, y0 + 94);
  // current gradient, beside the speed limit
  const pm = gradeAt(g.pos);
  ctx.fillStyle = '#9da7b3'; ctx.font = '13px sans-serif'; ctx.fillText('GRADIENT', ix + 130, y0 + 70);
  ctx.fillStyle = pm > 0 ? '#ffb86b' : pm < 0 ? '#79c0ff' : '#fff'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText(pm > 0 ? `▲ ${pm}‰` : pm < 0 ? `▼ ${-pm}‰` : 'Level', ix + 130, y0 + 94);
  ctx.fillStyle = '#fff';
  const nl = LIMITS.find((L) => L.at > g.pos);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(nl ? `${nl.lim} km/h in ${Math.max(0, nl.at - g.pos).toFixed(0)} m` : '—', ix, y0 + 138);

  const jx = 560;
  ctx.fillStyle = '#9da7b3'; ctx.font = '13px sans-serif';
  ctx.fillText('DISTANCE TO MARK', jx, y0 + 24);
  ctx.fillText('CLOCK / DUE', jx, y0 + 70);
  ctx.fillText('SCORE', jx, y0 + 116);
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = d < -1 ? '#ff5050' : d < 100 ? '#ffd33d' : '#fff';
  ctx.fillText(Math.abs(d) < 100 ? (d >= 0 ? '' : '-') + Math.abs(d).toFixed(2) + ' m' : d.toFixed(0) + ' m', jx, y0 + 48);
  const late = g.clock - g.sched;
  ctx.fillStyle = '#fff'; ctx.font = 'bold 18px monospace';
  ctx.fillText(fmtClock(g.clock), jx, y0 + 94);
  ctx.fillStyle = late > 0 ? '#ff7b72' : '#7ee787';
  ctx.fillText(fmtClock(g.sched), jx + 105, y0 + 94);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace';
  ctx.fillText(String(g.score), jx, y0 + 140);
  if (g.overspeedPen > 0) { ctx.fillStyle = '#ff7b72'; ctx.font = '13px sans-serif'; ctx.fillText(`overspeed -${g.overspeedPen}`, jx + 100, y0 + 138); }

  // approach bar (last 100 m)
  const bx = 800, bw = 140, by = y0 + 20, bh = 120;
  ctx.fillStyle = '#0f1115'; ctx.fillRect(bx, by, bw, bh);
  const scale = bh / 60; // shows -10 .. +50 m
  const markY = by + 10 * scale;
  ctx.strokeStyle = '#f2c200'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, markY); ctx.lineTo(bx + bw, markY); ctx.stroke();
  ctx.fillStyle = '#f2c200'; ctx.font = '10px sans-serif'; ctx.fillText('STOP', bx + 4, markY - 3);
  const ty = markY + Math.max(-10, Math.min(50, d)) * scale;
  ctx.fillStyle = '#58a6ff'; ctx.fillRect(bx + bw / 2 - 12, ty - 3, 24, 6);
  ctx.fillStyle = '#9da7b3'; ctx.fillText('approach (50 m)', bx + 4, by + bh + 12);

  // overspeed warning in view
  if (kmh > lim + 2 && g.state === 'running') {
    ctx.fillStyle = 'rgba(200,0,0,.75)'; ctx.fillRect(W / 2 - 110, 24, 220, 34);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('OVER SPEED LIMIT', W / 2, 41);
  }
}

function bestLine() {
  const b = save.data.best, f = (m) => (b[m] ? `${b[m].score} (${b[m].rank})` : '—');
  return { t: `Best · Local ${f('local')}  ·  Express ${f('express')}`, c: '#9da7b3' };
}
function panel(lines, title) {
  const pw = 520, ph = 60 + lines.length * 26, px = (W - pw) / 2, py = (VIEW_H - ph) / 2;
  ctx.fillStyle = 'rgba(10,14,20,.88)'; ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#58a6ff'; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.fillText(title, W / 2, py + 38);
  ctx.font = '16px sans-serif';
  lines.forEach((l, i) => { ctx.fillStyle = l.c || '#c9d1d9'; ctx.fillText(l.t ?? l, W / 2, py + 70 + i * 26); });
}

function drawOverlay() {
  // cat counter + scene name
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(24, 22, 190, 46);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2b8d0'; ctx.font = 'bold 18px sans-serif'; ctx.fillText('Cats spotted: ' + g.cats, 34, 37);
  ctx.fillStyle = '#ddd'; ctx.font = '12px sans-serif'; ctx.fillText(scene.name + ' · ' + light.phase + (light.wet > 0.3 ? ' · rain' : light.snowy > 0.3 ? ' · snow' : ''), 34, 57);
  if (g.msgT > 0 && g.msg) {
    ctx.globalAlpha = Math.min(1, g.msgT);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 230, 64, 460, 36);
    ctx.fillStyle = '#ffd33d'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(g.msg, W / 2, 82); ctx.globalAlpha = 1;
  }
  if (g.state === 'title' && save.data.run) {
    const r = save.data.run;
    panel([
      { t: `${MODE_NAMES[r.mode] || 'Local'} run saved at ${STATIONS[r.seg].name}`, c: '#7ee787' },
      `Score so far: ${r.score} after ${(r.results || []).length} stops`,
      bestLine(),
      { t: 'Enter or tap: continue  ·  N: new run', c: '#ffd33d' },
    ], 'AOZORA LINE · Welcome back');
  } else if (g.state === 'title') {
    const ex = g.mode === 'express';
    panel([
      { t: (ex ? '   Local      ▶ EXPRESS ◀' : '▶ LOCAL ◀      Express   '), c: ex ? '#ff9f5a' : '#7ee787' },
      ex ? `Express: ${stopCount('express')} stops (passes ${stopCount('local') - stopCount('express')}), faster limits, tight times.`
        : `Local: stops at all ${stopCount('local')} stations.`,
      'Obey speed limits, stop on the yellow STOP mark, arrive on time.',
      '↑/W: more power   ↓/S: more brake   N: neutral   Space: EB',
      bestLine(),
      { t: '▲/▼ (or L / E) choose mode · Enter or tap to start', c: '#ffd33d' },
    ], 'AOZORA LINE · Train Driver');
  } else if (g.state === 'arrived') {
    const r = g.lastResult;
    const lines = r.failed ? [{ t: 'Overran the platform – no points for this stop.', c: '#ff7b72' }] : [
      `Stop: ${r.d >= 0 ? r.d.toFixed(2) + ' m short' : (-r.d).toFixed(2) + ' m over'}  → ${r.stopPts}` + (r.perfect ? `  PERFECT +${r.perfect}` : ''),
      `Time: ${Math.abs(r.diff).toFixed(1)} s ${r.diff > 0 ? 'late' : 'early'}  → ${r.timePts}`,
      r.smooth ? `Smooth stop bonus +${r.smooth}` : 'Tip: stop on B1–B3 for a smooth-stop bonus',
      r.pen ? { t: `Overspeed penalty -${r.pen}`, c: '#ff7b72' } : 'No overspeed. Nice!',
      { t: `Cats spotted: ${r.cats}  → +${r.catPts}`, c: '#f2b8d0' },
    ];
    lines.push({ t: `Stop total: ${r.total}   ·   Score: ${g.score}`, c: '#7ee787' });
    lines.push({ t: g.seg >= STATIONS.length - 1 ? 'Press Enter for final results' : 'Press Enter to depart', c: '#ffd33d' });
    panel(lines, 'Arrived at ' + r.name);
  } else if (g.state === 'end') {
    const rank = rankOf(g.score, g.mode);
    const lines = g.results.map((r) => `${r.name}: ${r.failed ? 'overrun' : r.total + ' pts'}`);
    lines.push({ t: `Total ${g.score}  ·  Rank ${rank}`, c: '#7ee787' });
    const b = save.data.best[g.mode];
    lines.push(g.newBest ? { t: `New best for ${MODE_NAMES[g.mode]}!`, c: '#ffd33d' } : { t: `Best ${MODE_NAMES[g.mode]}: ${b ? b.score + ' · Rank ' + b.rank : '—'}`, c: '#c9d1d9' });
    lines.push({ t: 'Press Enter to play again', c: '#ffd33d' });
    panel(lines, `End of the line! · ${MODE_NAMES[g.mode]}`);
  }
  if (g.paused) {
    panel([
      'The train and the clock are stopped.',
      { t: 'Press P / Esc, or tap, to resume', c: '#ffd33d' },
    ], 'PAUSED');
  }
}

export { drawDash, drawOverlay };
