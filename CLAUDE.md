# Aozora Line: notes for Claude

An original browser train-driving game (genre-inspired, never a copy of an existing game: no names,
characters, art, music, routes or UI lifted from commercial titles). Plain HTML/CSS/JS, no build step.
GitHub Pages deploys `index.html`, `game.js`, `style.css` (and `assets/` if present) from `main`.

## Working on a task

1. Each task is a GitHub issue labelled `task` with a **Done when** list. Work only on that issue.
2. Before building, ask the owner clarifying questions one at a time, each with 3 options and a
   recommendation.
3. Use a few focused subagents in parallel for independent parts of a task; keep token use
   balanced (few agents, small prompts).
4. Branch from `main`, keep the PR small, and put `Closes #N` in the PR body.
5. Run `npm ci` once, then `npm run check` (ESLint + Playwright smoke test) before every push.
   Locally, Chromium is usually preinstalled; in CI the workflow installs it.
6. Add or extend a test in `tests/` for new behaviour whenever it can be checked headlessly.
7. If `game.js` or `style.css` changed, bump `?v=N` on both asset URLs in `index.html` so
   browsers load the new version.
8. Open the PR, wait for CI, fix failures until green. Never skip or weaken a test to get green.
9. The owner merges. Do not merge or enable auto-merge unless the owner said so for that PR or label.
10. After every shipped change (PR merged and the Pages deploy green), always share the latest
   mobile play link with a cache-busting suffix of the deployed commit's short SHA:
   `https://hitoshi85.github.io/train-simulator/?v=<short-sha>`

## Test hook

`game.js` exposes `window.__train` for tests: `state` (live game state), `act(action)`,
`step(dt)` (advance the simulation; does nothing while the player has paused), `setPaused(bool)` (player pause, also `state.paused`), `render()` (draw one frame), `paused` (stop the real-time loop),
`stats` (`frames`, `catsDrawn`, `trainDrawn`, `insets` (count per camera id: front, rear, platform),
`lastInsets` (ids of insets drawn in the last frame)), `sound` (`muted`, `started`, `toggle()`), plus `STATIONS`, `LIMITS`, `accel`, `limitAt`, `catsBetween`.
Keep it working when refactoring; add to it when a new feature needs checking.
`tests/smoke.spec.js` has an `autopilot()` that drives the full line through `act()`.

## Requirements and feedback log

`REQUIREMENTS.md` is the single shareable record of requirements, shipped changes, the owner's
feedback and the backlog. Every thread keeps it current in the same PR as its change:
add a row to **Shipped changes** for each change, log every piece of owner feedback (dated, with
the outcome) in **Feedback log**, update requirement statuses, and keep **Open backlog** in step
with the issues. A thread that only receives feedback (no code change) still opens a small PR
updating the log.

## Commands

- `npm run serve` serves the game at http://127.0.0.1:8080/
- `npm run lint`, `npm test`, `npm run check`
