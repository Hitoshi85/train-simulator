// Dashboard, messages and panels.
import { STATIONS, MODE_NAMES, stopCount, limitAt } from '../route.js';
import { save, rankOf } from '../save.js';
import { g } from '../run.js';
import { ctx, W, VIEW_H } from './canvas.js';
import { light } from './light.js';
import { scene } from './land.js';


// The desk and controls are in cab.js; this adds the warning that shows in the view.
function drawWarning() {
  const kmh = g.v * 3.6, lim = limitAt(g.pos);
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

export { drawWarning, drawOverlay };
