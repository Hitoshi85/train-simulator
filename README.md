# Aozora Line – Train Driver

A tiny, original train-driving game for the browser. Plain HTML/CSS/JS, no build step.

## Play

Open `index.html` in any modern browser, or play the GitHub Pages build (deployed from `main` by `.github/workflows/pages.yml`).

## How to drive

- **↑ / W**: more power (P1–P5)
- **↓ / S**: more brake (B1–B8)
- **N**: neutral, **Space**: emergency brake
- **Enter** (or tap): start / continue

Drive through 4 fictional stations. Stay under the speed limit (red arc on the speedometer, signs by the track),
stop with the front of the train on the yellow **STOP** mark, and arrive on time.
Each stop scores up to 1000 for accuracy (+500 for a perfect stop under 30 cm), up to 500 for punctuality,
+200 for a smooth stop on B1–B3, minus overspeed penalties. Overrunning the mark by 30 m scores nothing.

### Cats and scenery

Lots of cats sit and stroll beside the track and wait on the platforms. Every cat you pass counts toward
**Cats spotted** (top left) and is worth +2 points at the next station.
Every 10 seconds the scenery fades to a random new scene: Snowy Peaks, Red-Rock Canyon or Coastal Cliffs.

## Development

No build step for the game. Dev tooling (lint and tests) needs Node 22:

```sh
npm ci
npm run serve   # play at http://127.0.0.1:8080/
npm run check   # ESLint + headless Playwright smoke test that drives the whole line
```

Work is tracked as GitHub issues and shipped as small PRs gated by CI. See [docs/WORKFLOW.md](docs/WORKFLOW.md).
