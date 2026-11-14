// Time-of-day light along the line, and how weather dims it.
import { STATIONS } from '../route.js';
import { hex, mix } from './canvas.js';

const LINE_LEN = STATIONS[STATIONS.length - 1].pos;
const LIGHT = [ // keyframes along the line, 0 = first station, 1 = last: morning, midday, evening, night
  { at: 0, top: '#7fa9dc', mid: '#c4d8ee', low: '#fbdcc4', sun: '#fff0d4', haze: '#dde3ec', tint: '#ffd2bc', sunX: 0.2, sunY: 0.66, sunR: 30, tintA: 0.08, warm: 0.4, night: 0 },
  { at: 0.3, top: '#3b82d6', mid: '#86bdea', low: '#e6f3f8', sun: '#fffbea', haze: '#d2e5f1', tint: '#ffffff', sunX: 0.42, sunY: 0.14, sunR: 24, tintA: 0, warm: 0, night: 0 },
  { at: 0.5, top: '#3b82d6', mid: '#86bdea', low: '#e6f3f8', sun: '#fffbea', haze: '#d2e5f1', tint: '#ffffff', sunX: 0.58, sunY: 0.16, sunR: 24, tintA: 0, warm: 0, night: 0 },
  { at: 0.76, top: '#4d5a9a', mid: '#e3958c', low: '#ffcf86', sun: '#ffb055', haze: '#efbfa0', tint: '#ff9447', sunX: 0.8, sunY: 0.74, sunR: 40, tintA: 0.15, warm: 1, night: 0 },
  { at: 1, top: '#0b1430', mid: '#1c2a52', low: '#3b4270', sun: '#eef2ff', haze: '#2c3558', tint: '#16204a', sunX: 0.3, sunY: 0.3, sunR: 13, tintA: 0.45, warm: 0.15, night: 1 },
];
function lightAt(pos) {
  const u = Math.max(0, Math.min(1, pos / LINE_LEN));
  let i = 0;
  while (i < LIGHT.length - 2 && u > LIGHT[i + 1].at) i++;
  const A = LIGHT[i], B = LIGHT[i + 1], t = (u - A.at) / (B.at - A.at);
  const L = { u, phase: u < 0.2 ? 'morning' : u < 0.6 ? 'midday' : u < 0.87 ? 'evening' : 'night', wet: 0, snowy: 0 };
  for (const k of ['top', 'mid', 'low', 'sun', 'haze', 'tint']) L[k] = mix(hex(A[k]), hex(B[k]), t);
  for (const k of ['sunX', 'sunY', 'sunR', 'tintA', 'warm', 'night']) L[k] = A[k] + (B[k] - A[k]) * t;
  return L;
}
// Overcast light under rain or snow: a grey sky, a dimmed sun, colder colours.
function weatherLight(L, wx) {
  const a = wx.amt;
  if (a <= 0) return L;
  const grey = mix(hex(wx.kind === 'snow' ? '#c4cad6' : '#7a8592'), [24, 28, 40], L.night * 0.85);
  for (const k of ['top', 'mid', 'low', 'haze']) L[k] = mix(L[k], grey, a * 0.7);
  L.sun = mix(L.sun, grey, a * 0.6); L.tint = mix(L.tint, grey, a); L.tintA += a * 0.1 * (1 - L.night);
  L.sunR *= 1 - a * 0.3; L.warm *= 1 - a * 0.7;
  if (wx.kind === 'snow') L.snowy = a; else L.wet = a;
  return L;
}
const SNOW = [238, 242, 248];
let light = lightAt(0);
const setLight = (L) => { light = L; };
const lit = (c, k = 1) => {
  const v = mix(mix(hex(c), light.tint, light.tintA * 0.7 * k), light.sun, 0.08 * light.warm * k);
  return light.snowy ? mix(v, mix(SNOW, light.tint, light.tintA), 0.3 * light.snowy * k) : v;
};

export { lightAt, lit, light, weatherLight, setLight };
