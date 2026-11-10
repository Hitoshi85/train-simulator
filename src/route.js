// Route data: stations, speed limits, gradients, the curve, and where the cats sit.

// ---------- Route ----------
// Based on a real seaside line in Japan, Fujisawa to Kamakura by way of Enoshima (9 of its stops;
// distances shortened to fit the game). All art is original. Kept as data so more lines can be added.
// run: scheduled seconds from the previous stop (Local). exp: seconds from the previous
// Express stop; stations without exp are passed by the Express without stopping.
// zones: which painted scene the line runs through, from `at` until the next zone.
const ROUTE = {
  id: 'shonan', name: 'Shonan Coast Line',
  stations: [
    { name: 'Fujisawa',         kanji: '藤沢',       pos: 0, exp: 0 },
    { name: 'Kugenuma',         kanji: '鵠沼',       pos: 900,  run: 95 },
    { name: 'Enoshima',         kanji: '江ノ島',     pos: 1800, run: 90, exp: 130 },
    { name: 'Koshigoe',         kanji: '腰越',       pos: 3000, run: 115 },
    { name: 'Kamakura-Kokomae', kanji: '鎌倉高校前', pos: 4200, run: 110, exp: 175 },
    { name: 'Shichirigahama',   kanji: '七里ヶ浜',   pos: 5100, run: 95 },
    { name: 'Inamuragasaki',    kanji: '稲村ヶ崎',   pos: 6000, run: 90, exp: 140 },
    { name: 'Hase',             kanji: '長谷',       pos: 7300, run: 120 },
    { name: 'Kamakura',         kanji: '鎌倉',       pos: 8600, run: 120, exp: 160 },
  ],
  zones: [
    { at: 0, scene: 'town', name: 'Fujisawa' },
    { at: 600, scene: 'pines', name: 'Kugenuma pine woods' },
    { at: 1450, scene: 'seaside', name: 'Enoshima' },
    { at: 2500, scene: 'town', name: 'Koshigoe' },
    { at: 3500, scene: 'seaside', name: 'Shichirigahama coast' },
    { at: 6500, scene: 'temple', name: 'Hase temple hills' },
    { at: 8100, scene: 'town', name: 'Kamakura' },
  ],
  // Map layout (m) for distant landmarks: the line heads south to the sea, then east along the coast.
  turn: [1300, 2700], // the curve from heading south to heading east
  landmarks: [
    { id: 'fuji', x: -60000, y: 3000 },
    { id: 'enoshima', x: 300, y: -2900 },
    { id: 'cape', x: 5900, y: -2300 },
  ],
};
const STATIONS = ROUTE.stations;
const MODES = ['local', 'express'];
const MODE_NAMES = { local: 'Local', express: 'Express' };
const LOCAL_LIMITS = [
  { at: 0, lim: 45 }, { at: 250, lim: 85 }, { at: 1450, lim: 70 },
  { at: 1900, lim: 85 }, { at: 3000, lim: 55 }, { at: 3600, lim: 85 },
  { at: 4350, lim: 75 }, { at: 5300, lim: 60 }, { at: 6150, lim: 90 },
  { at: 7900, lim: 70 },
];
// Gradients in per mille (‰): + uphill, - downhill, from `at` until the next entry.
// Stations sit on level track so stopping on the mark stays fair.
const GRADES = [
  { at: 0, pm: 0 }, { at: 200, pm: 10 }, { at: 550, pm: 0 },
  { at: 1100, pm: -15 }, { at: 1500, pm: 0 },
  { at: 2000, pm: 20 }, { at: 2450, pm: -10 }, { at: 2700, pm: 0 },
  { at: 3200, pm: 25 }, { at: 3600, pm: 0 }, { at: 3700, pm: -20 }, { at: 3950, pm: 0 },
  { at: 4400, pm: -25 }, { at: 4800, pm: 0 },
  { at: 5300, pm: 15 }, { at: 5700, pm: 0 },
  { at: 6200, pm: -10 }, { at: 6600, pm: 25 }, { at: 7000, pm: 0 },
  { at: 7500, pm: -25 }, { at: 8000, pm: -10 }, { at: 8300, pm: 0 },
];
// Express: +15 km/h on the open stretches (85 km/h and up); slower sections stay as they are.
const EXPRESS_LIMITS = LOCAL_LIMITS.map((L) => (L.lim >= 85 ? { at: L.at, lim: L.lim + 15 } : L));
let LIMITS = LOCAL_LIMITS;
function useLimits(mode) { LIMITS = mode === 'express' ? EXPRESS_LIMITS : LOCAL_LIMITS; }
// Does the train stop at station i in the given mode?
const stopsAt = (i, mode) => mode !== 'express' || STATIONS[i].exp !== undefined;
const stopCount = (mode) => STATIONS.filter((_, i) => i > 0 && stopsAt(i, mode)).length;
const TRAIN_LEN = 80;      // 4 cars of 20 m
const DWELL = 30;          // scheduled seconds at each station
const CAT_BONUS = 2; // points per cat spotted on the way

const limitAt = (p) => { let l = LIMITS[0].lim; for (const s of LIMITS) if (p >= s.at) l = s.lim; return l; };
const gradeAt = (p) => { let v = GRADES[0].pm; for (const s of GRADES) if (p >= s.at) v = s.pm; return v; };
const curvature = (p) => 0.0007 * Math.sin(p / 520) * Math.sin(p / 1300 + 1);
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
// ---------- Cats (lots of them) ----------
const CAT_COLORS = [
  ['#e8913a', '#c46d1e'], ['#2a2a2e', '#111'], ['#f2f0ea', '#cfcac0'], ['#8d8f96', '#6b6d73'], ['#f2f0ea', '#e8913a'], ['#7a5236', '#4f3322'],
];
const CAT_STEP = 2.5;
function catAt(s) {
  const h = hash(s * 1.37 + 0.21);
  if (h > 0.7) return null;
  const side = h < 0.35 ? -1 : 1;
  let x = side * (2.4 + hash(s + 9.1) * 6), y = 0;
  const onPlatform = STATIONS.some((S) => s > S.pos - 160 && s < S.pos + 30);
  if (onPlatform && x < 0) { if (x > -3.3) x = -3.3 - hash(s + 2) * 4; y = 1.1; }
  return { s, x, y, col: CAT_COLORS[Math.floor(hash(s + 5.3) * CAT_COLORS.length)], walk: hash(s + 7.7) < 0.35, face: hash(s + 3.3) < 0.5 ? -1 : 1, ph: hash(s + 1.1) * 6 };
}
function catsBetween(a, b) {
  const out = [];
  for (let s = Math.ceil(a / CAT_STEP) * CAT_STEP; s < b; s += CAT_STEP) { const c = catAt(s); if (c) out.push(c); }
  return out;
}

export { stopCount, STATIONS, useLimits, stopsAt, CAT_BONUS, limitAt, gradeAt, catsBetween, MODES, MODE_NAMES, DWELL, ROUTE, hash, GRADES, LIMITS, TRAIN_LEN, curvature };
