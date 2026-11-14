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
    { name: 'Kugenuma',         kanji: '鵠沼',       pos: 450,  run: 55 },
    { name: 'Enoshima',         kanji: '江ノ島',     pos: 900, run: 60, exp: 75 },
    { name: 'Koshigoe',         kanji: '腰越',       pos: 1500, run: 70 },
    { name: 'Kamakura-Kokomae', kanji: '鎌倉高校前', pos: 2100, run: 60, exp: 90 },
    { name: 'Shichirigahama',   kanji: '七里ヶ浜',   pos: 2550, run: 60 },
    { name: 'Inamuragasaki',    kanji: '稲村ヶ崎',   pos: 3000, run: 55, exp: 75 },
    { name: 'Hase',             kanji: '長谷',       pos: 3650, run: 75 },
    { name: 'Kamakura',         kanji: '鎌倉',       pos: 4300, run: 70, exp: 90 },
  ],
  zones: [
    { at: 0, scene: 'town', name: 'Fujisawa' },
    { at: 300, scene: 'pines', name: 'Kugenuma pine woods' },
    { at: 720, scene: 'seaside', name: 'Enoshima' },
    { at: 1250, scene: 'town', name: 'Koshigoe' },
    { at: 1750, scene: 'seaside', name: 'Shichirigahama coast' },
    { at: 3250, scene: 'temple', name: 'Hase temple hills' },
    { at: 4050, scene: 'town', name: 'Kamakura' },
  ],
  // Map layout (m) for distant landmarks: the line heads south to the sea, then east along the coast.
  turn: [650, 1350], // the curve from heading south to heading east
  landmarks: [
    { id: 'fuji', x: -60000, y: 3000 },
    { id: 'enoshima', x: 150, y: -1450 },
    { id: 'cape', x: 2950, y: -1150 },
  ],
};
const STATIONS = ROUTE.stations;
const MODES = ['local', 'express'];
const MODE_NAMES = { local: 'Local', express: 'Express' };
const LOCAL_LIMITS = [
  { at: 0, lim: 60 }, { at: 120, lim: 110 }, { at: 720, lim: 90 },
  { at: 950, lim: 110 }, { at: 1500, lim: 70 }, { at: 1800, lim: 110 },
  { at: 2180, lim: 100 }, { at: 2650, lim: 80 }, { at: 3080, lim: 115 },
  { at: 3950, lim: 90 },
];
// Gradients in per mille (‰): + uphill, - downhill, from `at` until the next entry.
// Stations sit on level track so stopping on the mark stays fair.
const GRADES = [
  { at: 0, pm: 0 }, { at: 60, pm: 10 }, { at: 240, pm: 0 },
  { at: 520, pm: -15 }, { at: 690, pm: 0 },
  { at: 960, pm: 20 }, { at: 1160, pm: -10 }, { at: 1290, pm: 0 },
  { at: 1600, pm: 25 }, { at: 1780, pm: 0 }, { at: 1800, pm: -20 }, { at: 1900, pm: 0 },
  { at: 2140, pm: -25 }, { at: 2340, pm: 0 },
  { at: 2590, pm: 15 }, { at: 2790, pm: 0 },
  { at: 3040, pm: -10 }, { at: 3240, pm: 25 }, { at: 3440, pm: 0 },
  { at: 3690, pm: -25 }, { at: 3940, pm: -10 }, { at: 4090, pm: 0 },
];
// Express: +15 km/h on the open stretches (110 km/h and up); slower sections stay as they are.
const EXPRESS_LIMITS = LOCAL_LIMITS.map((L) => (L.lim >= 110 ? { at: L.at, lim: L.lim + 15 } : L));
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
