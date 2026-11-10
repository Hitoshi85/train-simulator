# Aozora Line: notes for Claude

An original browser train-driving game (genre-inspired, never a copy of an existing game: no names,
characters, art, music, routes or UI lifted from commercial titles). Plain HTML/CSS/JS, no build step.
GitHub Pages deploys `index.html`, `game.js`, `style.css` (and `assets/` if present) from `main`.

## Working on a task

1. Each task is a GitHub issue labelled `task` with a **Done when** list. Work only on that issue.
   Tasks Claude proposes get `proposed` (not `ready`); they turn `ready` after a 36-hour veto window
   (`docs/WORKFLOW.md`). Mark ones that change controls, modes, the route or prod `needs-yes`.
2. Before building, ask the owner all of the task's clarifying questions together in one message
   (one card with every question), each with exactly 3 options, the recommended one first and
   marked "(Recommended)". Ask about every change, small ones too; do not decide on the owner's
   behalf. Only ask a follow-up round if an answer opens a new question.
3. Use a few focused subagents in parallel for independent parts of a task; keep token use
   balanced (few agents, small prompts).
4. Branch from `main`, keep the PR small, and put `Closes #N` in the PR body.
5. Run `npm ci` once, then `npm run check` (ESLint + Playwright smoke test) before every push.
   Locally, Chromium is usually preinstalled; in CI the workflow installs it.
6. Add or extend a test in `tests/` for new behaviour whenever it can be checked headlessly.
7. If `game.js` or `style.css` changed, bump `?v=N` on both asset URLs in `index.html` so
   browsers load the new version. (The Pages build also rewrites them to `?v=<commit>` and adds a
   reload-on-new-deploy check, see `.github/scripts/build-site.sh`.)
8. Open the PR with a screenshot of the game that highlights the new feature (commit it under
   `docs/screens/` and embed it as an image in the PR body; the merge queue looks for it).
   Wait for CI, fix failures until green. Never skip or weaken a test to get green.
9. The merge queue (`.github/workflows/merge-queue.yml`) merges small green PRs (800 changed lines or
   fewer) that have a screenshot in the description and a passing project review (see below), oldest first, rebasing each onto `main` and re-running CI before it merges. It
   may rebase your branch: pull before pushing again. Label a PR `hold` to keep it out. Bigger PRs and PRs that
   change `.github/workflows/` are merged by hand only when the owner says so ("m").
10. Merges to `main` deploy to **dev** only (`https://hitoshi85.github.io/train-simulator/dev/`). After every
   shipped change, wait for the Pages workflow's **verify-live** job (it checks that `version.json` on both
   live sites shows the expected commit and the game runs), then share the latest dev link with a
   cache-busting suffix of the deployed commit's short SHA: `.../train-simulator/dev/?v=<short-sha>`.
   When the owner says "Ship", run `pages.yml` with action `ship` (promotes what dev serves to prod at
   `https://hitoshi85.github.io/train-simulator/` as release `prod-N`) and share the prod link the same way;
   When the owner says "Rollback", run `pages.yml` with action `rollback` and an empty tag (prod goes back
   to the release before the current one); "Rollback to prod-N" passes that tag. Rollback skips the tests,
   so prod switches in about a minute; verify-live then confirms prod reports that commit and release, and
   the README label follows. Share the prod link afterwards. README.md always lists the current links.
11. The owner talks only in the project chat; send questions, ready PRs and manual steps through
   the coordinator, not in your own thread.

## Test hook

`game.js` exposes `window.__train` for tests: `state` (live game state), `act(action)`,
`save` (on-device progress: `data` with `v`, `settings`, `best`, `run`; `record()`, `setRun()`, `clear()`), `step(dt)` (advance the simulation; does nothing while the player has paused), `setPaused(bool)` (player pause, also `state.paused`), `render()` (draw one frame), `paused` (stop the real-time loop),
`stats` (`frames`, `catsDrawn`, `trainDrawn`, `gradePostsDrawn`, `trees`, `birds`, `fireflies`, `insets` (count per camera id: front, rear, platform),
`lastInsets` (ids of insets drawn in the last frame)), `sound` (`muted`, `started`, `toggle()`, `mix(v, lever, state)` (power/brake sound levels: `whineHz`, `whine`, `hiss`)), plus `STATIONS`, `LIMITS`, `GRADES`, `accel(lever, v, grade‰)`, `limitAt`, `gradeAt`, `catsBetween`, `lightAt(pos)` (time-of-day light, `.phase` morning, midday or evening).
Keep it working when refactoring; add to it when a new feature needs checking.
`tests/smoke.spec.js` has an `autopilot()` that drives the full line through `act()`.
`tests/phone-checks.spec.js` saves phone screenshots to `phone-screenshots/` (a CI artifact) and enforces a
16 ms median frame-draw budget at phone size.
`tests/balance.spec.js` is the AI playtest: three imperfect drivers (late, early, noisy) play Local and Express and
write a per-station balance table to the CI summary and `balance-report/` (artifact `balance`); it fails only if a
station becomes impossible. On PRs, CI also uploads main's phone screenshots (`phone-screenshots-main`).

## Project review

A scheduled Claude run reviews every PR without a verdict on its latest commit once a day (05:47 Japan
time). When a PR should not wait for it, tell the coordinator `Review #N please (head <short sha>)`.
The reviewer reviews the diff and posts a PR comment with a
`<!-- project-review: PASS|BLOCK <sha> -->` verdict; the merge queue waits for a PASS on the latest
commit (docs-only PRs skip it). On BLOCK, fix it and ask again. Full process: `docs/REVIEW.md`.

## Requirements and feedback log

`REQUIREMENTS.md` is the single shareable record of requirements, the owner's feedback and the
backlog. Every thread keeps it current in the same PR as its change: log every piece of owner
feedback (dated, with the outcome) in **Feedback log**, update requirement statuses, and keep
**Open backlog** in step with the issues. A thread that only receives feedback (no code change) still
opens a small PR updating the log. Shipped changes are the merged PRs and `prod-N` releases (no table).
Keep it small, `tests/requirements.spec.js` checks it in CI:
- The feedback log keeps the latest 20 rows; move older rows to the bottom of `docs/feedback-archive.md`.
- Write PR numbers, never "this PR": open the PR, then push its number into the log (CI fails on the
  placeholder on every branch).
- R and W requirements stay numbered in order with no gaps; the play links match README.md.

## Commands

- `npm run serve` serves the game at http://127.0.0.1:8080/
- `npm run lint`, `npm test`, `npm run check`
