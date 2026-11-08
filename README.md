# Aozora Line – Train Driver

## Play now

| Site | Link (bookmark this) | What it is |
|---|---|---|
| **Prod** | https://hitoshi85.github.io/train-simulator/ | Stable version, changes only when Hitoshi types "Ship" |
| **Dev** | https://hitoshi85.github.io/train-simulator/dev/ | Latest merged changes, marked "DEV" |

Both work on phones and switch to a new version on their own, no hard refresh needed.
Current versions (updated automatically after every deploy):

<!-- play-links:start -->
- **Prod** (stable, promoted with "Ship"): https://hitoshi85.github.io/train-simulator/?v=3a22128 ([prod-1](https://github.com/Hitoshi85/train-simulator/releases/tag/prod-1))
- **Dev** (latest main, may be unfinished, marked "DEV"): https://hitoshi85.github.io/train-simulator/dev/?v=aa99d03
<!-- play-links:end -->

A tiny, original train-driving game for the browser. Plain HTML/CSS/JS, no build step.

## Play

Open `index.html` in any modern browser, or play the web builds linked at the top of this page.

Every merge to `main` goes to **dev** only. Typing "Ship" in the project chat promotes the version dev
serves to **prod** as a tagged GitHub release (`prod-1`, `prod-2`, …), so a rollback is one click.
Both are run by `.github/workflows/pages.yml`; see [docs/WORKFLOW.md](docs/WORKFLOW.md).

## How to drive

- **↑ / W**: more power (P1–P3); every departure starts on P1
- **↓ / S**: more brake (B1–B3)
- **N**: neutral, **Space**: emergency brake
- **Enter** (or tap): start / continue

Drive 9 stations of a seaside line based on real towns in Japan, Fujisawa to Kamakura via Enoshima. Stay under the speed limit (red arc on the speedometer, signs by the track),
stop with the front of the train on the yellow **STOP** mark, and arrive on time.
Each stop scores up to 1000 for accuracy (+500 for a perfect stop under 30 cm), up to 500 for punctuality,
+200 for a smooth stop on B1–B2, minus overspeed penalties. Overrunning the mark by 30 m scores nothing.

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

Requirements, feedback and the backlog are kept in [REQUIREMENTS.md](REQUIREMENTS.md).
Work is tracked as GitHub issues and shipped as small PRs gated by CI. See [docs/WORKFLOW.md](docs/WORKFLOW.md).
