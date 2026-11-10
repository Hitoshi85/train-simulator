// Train physics: lever notches and acceleration.

// ---------- Train physics ----------
// lever: -4 = EB, -3..-1 = B3..B1, 0 = N, 1..3 = P1..P3. P3 and B3 match the old top notches.
const P_MAX = 3, B_MAX = 3, EB = -(B_MAX + 1);
const leverName = (l) => l === EB ? 'EB' : l < 0 ? 'B' + (-l) : l === 0 ? 'N' : 'P' + l;
// grade in ‰: gravity adds about g × ‰ / 1000 (slows uphill, speeds up downhill).
function accel(lever, v, grade = 0) {
  const kmh = v * 3.6;
  let a = 0;
  if (lever > 0) a = lever * 0.28 * (kmh < 40 ? 1 : 40 / kmh);
  else if (lever === EB) a = -1.4;
  else if (lever < 0) a = lever * 0.35;
  a -= 0.02 + 0.00003 * v * v; // rolling + air resistance
  a -= 9.8 * grade / 1000;
  return a;
}

export { B_MAX, EB, accel, P_MAX, leverName };
