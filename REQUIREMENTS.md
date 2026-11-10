# Aozora Line: requirements and feedback log

The single, always-current record of what the game must do, what has shipped, what the owner
(Hitoshi) has asked for, and what is next. Every change to the game, and every piece of feedback,
is recorded here in the same PR or thread that handles it (see the rule in [CLAUDE.md](CLAUDE.md)).

- **Play prod (stable):** https://hitoshi85.github.io/train-simulator/
- **Play dev (latest main):** https://hitoshi85.github.io/train-simulator/dev/ (add `?v=<short commit>`
  on a phone to skip a cached copy; the current links with that suffix are always in [README.md](README.md))
- **Backlog:** [open issues](https://github.com/Hitoshi85/train-simulator/issues)
- **Last updated:** 2026-11-10

## 1. Core requirements

### Game

| # | Requirement | Status |
|---|---|---|
| R1 | Original browser train-driving game in the Japanese train-sim genre. Not a copy: no names, characters, art, music, routes or UI from commercial titles. Working title "Aozora Line". | Done |
| R2 | Plain HTML/CSS/JS, no build step; runs in any modern browser. | Done |
| R3 | Three power notches P1–P3 and three brake notches B1–B3 (P3 and B3 as strong as the old top notches), neutral and an emergency brake; every departure starts on P1 (Hitoshi's choice, 2026-11-08). Keyboard (↑/W, ↓/S, N, Space, Enter) and on-screen buttons for touch. | Done |
| R4 | One 8.6 km line, 9 stations about 1 km apart, based on a real seaside line in Japan (distances shortened for the game): Fujisawa (0 m), Kugenuma (900), Enoshima (1800), Koshigoe (3000), Kamakura-Kokomae (4200), Shichirigahama (5100), Inamuragasaki (6000), Hase (7300), Kamakura (8600); 8 stops. Station boards show the name in kanji and romaji. (Replaced the fictional Hinata to Tsukimino names.) | Done (#15, real towns in #24) |
| R5 | Speed limits shown by the track and on the speedometer; overspeed costs points. | Done |
| R6 | Stop-on-the-mark scoring at each station: up to 1000 for accuracy (+500 under 30 cm), up to 500 for punctuality, +200 for a smooth stop on B1–B3, 0 for overrunning the mark by 30 m. | Done |
| R7 | Cats appear frequently: lots of cats beside the track and on platforms ("cats everywhere"). Original cats only. | Done |
| R8 | Cat-spotting counter ("Cats spotted", top left); each cat passed is worth +2 points at the next station. | Done (rebalance #5 dropped by owner, 2026-11-08) |
| R9 | Scenery follows the real towns along the line with a short fade and a "Now entering" notice: Fujisawa town, Kugenuma pine woods, the Enoshima coast, Koshigoe town, the Shichirigahama coast, the Hase temple hills and Kamakura town. Replaces the random change every 10 seconds. | Done (#19, by town in #24) |
| R10 | Playable on a phone from a shareable web link that always shows the latest version (no stale cache). | Done (phone layout in R14) |
| R11 | Live camera insets in the top-right of the view, always on: FRONT CAM (outside camera ahead of the train looking back at its nose and side) and REAR CAM (from the tail looking back down the track). Rendered by the game, not real video. | Done (#15) |
| R12 | Platform camera inset that appears in sync as the train approaches each station (last 500 m), showing the train pulling in. | Done (#15) |
| R13 | Original synthesized sound with Web Audio, no audio files or copyrighted tunes: motor hum following speed, rolling noise, rail-joint clacks, brake hiss, lever clicks, overspeed beep, departure door chime, arrival melody, end jingle, and an original looping background tune. Mute with the M key or a "Sound" button, remembered in localStorage; audio starts only after the first key/tap. Closes #8. | Done (#15) |
| R14 | Comfortable on a phone: in portrait (390×844) and landscape (844×390) the view and all touch buttons fit on one screen with no scrolling; touch buttons at least 44 px tall (portrait: big buttons at thumb height; landscape: two-thumb layout with brake side left, power side right); keyboard help hidden on touch screens. Closes #10. | Done (#17) |
| R15 | Pause with P or Esc and a Pause / Resume button; the train, clock and sound freeze; switching tabs or apps pauses automatically; tap, P, Esc or Enter resumes. Closes #7. | Done (#17) |
| R16 | Uphill and downhill sections up to ±25‰ (moderate, chosen by Hitoshi) change acceleration by about g × ‰ / 1000: coasting slows uphill and speeds up downhill. Gradient posts (number and up/down arm, "L" for level) stand beside the track at each change, and the dashboard shows the current gradient. Stations stay on level track. Closes #9. | Done (#18) |
| R17 | Express mode chosen on the title screen (▲/▼ or L/E, touch ▲/▼): stops at Enoshima, Kamakura-Kokomae, Inamuragasaki and Kamakura (formerly Kawabe, Momijidai, Shiokaze, Tsukimino) and passes the other 4 stations (green PASS board, no judging), with a tighter timetable (about 35–40% shorter than the Local runs it replaces) and +15 km/h on open track (85 → 100, 90 → 105). The end screen names the mode. Closes #11. | Done (#20) |
| R18 | Hand-painted pastoral look inspired by the soft style of Japanese animated films, with original art only (no characters, creatures or scenes from any film): watercolour skies with towering clouds, layered hazy hills, lush greenery, warm light and paper grain. Covers scenery, stations, the train and cats; the dashboard stays clean. | Done (#19) |
| R19 | Light shifts along the line: morning at Fujisawa, bright midday mid-line, a golden evening in the Hase temple hills, and night by Kamakura (dark sky, stars and moon, lit house windows, platform lamps, the train's headlights and lit carriages, a headlight beam down the track). | Done (#19, night in #25) |
| R20 | Rich living world: drifting clouds, flocks of birds, swaying trees and grass, wildflowers, drifting petals by day, rippling rice paddies, washing lines, sailboats, sun rays and fireflies in the evening. | Done (#19) |
| R21 | Camera insets match the cab view: same scene and time of day, with the sea, hills and hillside town on the correct side for cameras that look back along the train; no centre pillar across the cab window. | Done |
| R22 | Real towns in Japan with original art in the painted style: houses with tiled roofs and coastal black pines in the towns, the sea, sailboats and Enoshima island with its lighthouse tower on the coast, temple halls, a vermilion shrine gate, maples and hydrangeas in the Hase hills. Distant landmarks (Mt Fuji across the bay, Enoshima island, the Inamuragasaki cape) are placed by real map bearing, so each camera sees them where they really are (Mt Fuji shows in the rear camera along the coast). Route data (stations, scene zones, map layout, landmarks) lives in one `ROUTE` object so more lines can be added. | Done (#24) |
| R23 | Weather that changes during the run (Hitoshi's choice): each run picks rain or snow at random, which rolls in partway (after about 3.2 to 5 km) and may clear before the end. Rain: grey overcast sky, rain streaks, drops on the cab glass. Snow: falling flakes and snow settling on the ground, hills and roofs. A notice says when it starts and clears, and the label shows "rain" or "snow". All camera insets show it too. Stays within the 16 ms phone frame budget, also checked at night in rain and snow near a station. Closes #12. | Done (#25) |
| R24 | Players can send feedback from the game: a 💬 Feedback button (and the F key) pauses the run and opens a prefilled GitHub issue from the repo's feedback form, labelled `feedback`, so it lands in the backlog and GitHub notifies Hitoshi as the repo owner. The game fills in its context (version, Local/Express, where on the line, speed, time of day, weather, screen and browser). Players need a GitHub account (Hitoshi's choice); no token is shipped in the game. | Done (#26) |
| R25 | Progress is saved on the device (browser localStorage, no account): best score and rank per mode, settings (mode, sound), and a run in progress at the last station reached. On reopening, the title offers "Continue from the station" (Enter / tap) or "New run" (N). One versioned record (`aozora.save`, v1) so it can later move to cloud accounts. The dev site keeps a separate save (`aozora.save.dev`) so testing never touches prod saves. | Done (#28, dev split in #33) |
| R26 | Power and brake sounds like a modern commuter EMU, soft and never harsh: a smooth inverter whine that rises in pitch with speed under power, falls under regenerative braking and fades out below about 7 km/h, silent when coasting; a gentle "pshh" when the brake goes on harder and a sigh on release; a faint air hiss only on B3 and EB. | Done (#38) |

### How we work

| # | Requirement | Status |
|---|---|---|
| W1 | All work runs in cloud sessions, not tied to the owner's computer. | In place |
| W2 | Before changing the game, ask **all of a feature's clarifying questions together in one message**, each with exactly 3 options, the recommended one first. Claude still asks about every change (no deciding small choices alone). Replaces "one at a time" (Hitoshi's choice, 2026-11-10). | Done (#50) |
| W3 | Agentic loop: tasks are GitHub issues labelled `task`; the owner approves with `ready`; one thread per issue opens a small PR; CI (ESLint + headless autopilot smoke test) must be green. See [docs/WORKFLOW.md](docs/WORKFLOW.md). | In place |
| W4 | PRs merge on their own through the merge queue when every check is green on top of `main` and the description has a screenshot, for small PRs only: 800 changed lines or fewer, lock files and images not counted (Hitoshi's choice). Bigger PRs wait for "m" unless labelled `automerge`. A `hold` label keeps a PR out; PRs that change `.github/workflows/` still wait for the owner's "m". Replaces "the owner merges". | Done (#22) |
| W5 | Merges to `main` deploy to GitHub Pages through the tested workflow, to **dev** only (`/train-simulator/dev/`). | In place (dev/prod split in #29) |
| W6 | After every shipped change, share the latest mobile link with a cache-busting suffix: `https://hitoshi85.github.io/train-simulator/dev/?v=<short commit>` (prod after "Ship"). Since #22 the deploy workflow checks the live site first (`version.json` shows the new commit and the game starts) and comments the link on the merged PR. | In place (repo rule #13; live check in #22) |
| W7 | Keep all requirements and feedback in this file, updated with every change and every piece of feedback. Kept small: the latest 20 feedback rows (older ones in `docs/feedback-archive.md`), PR numbers instead of placeholders (written once the PR is open), and a CI test (`tests/requirements.spec.js`) that checks it. | In place; slimmed and checked in CI (#53) |
| W8 | Show results (e.g. test runs) in simple tables when asked. | Preference |
| W9 | Use several focused subagents in parallel for independent parts of a task, keeping token use balanced (few agents, small prompts). | In place |
| W10 | When asking for approval on backlog items, ask one item at a time with 3 options, and always include an option to remove the item from the backlog without doing it (the issue is closed as not planned). | In place |
| W11 | With each PR, share a screenshot of the game that highlights the new feature. | In place (2026-11-08) |
| W12 | Automatic phone and speed checks on every PR: CI takes phone screenshots (portrait 390×844 and landscape 844×390, title and mid-run; artifact `phone-screenshots`) and fails a PR if the median time to draw one frame at phone size is over 16 ms (60 fps). Frame times appear in the CI job summary. | In place (#21) |
| W13 | PR review inside the project, no separate setup or API key: a Claude "PR reviewer" thread reviews only the diff of each PR and posts one comment with a `project-review: PASS/BLOCK <sha>` verdict. The merge queue waits for a PASS on the latest commit (a rebase by the queue carries it over); BLOCK keeps the PR out until fixed. Docs-only PRs skip the review. Hitoshi does not review small PRs. Process: `docs/REVIEW.md`. | Built (#27); the old API-key review workflow is removed |
| W14 | Merge queue: one PR at a time, oldest first; the queue rebases it onto `main`, re-runs CI, merges when green, deploys, then moves to the next. A PR it cannot rebase gets a `queue-conflict` label and a comment. | Done (#22) |
| W15 | Hitoshi talks only in the project chat with one orchestrator; threads send questions, ready PRs and manual steps through it instead of asking in their own thread. | In place |
| W16 | Separate dev and prod web links: prod stays at `https://hitoshi85.github.io/train-simulator/` (Hitoshi's choice), dev is at `/dev/` and clearly marked: a small "DEV <commit>" tag at the top of the screen and "DEV" in the page title (prod is unmarked). When Hitoshi types "Ship" in the project chat, the version dev serves is promoted to prod as a tagged GitHub release (`prod-1`, `prod-2`, …); a rollback re-points prod at an earlier release. The live check verifies both sites. README.md always shows the latest prod and dev links with a `?v=<short-sha>` suffix, updated by the deploy workflow. | Done (#29) |
| W17 | Both dev and prod are phone friendly and always play the latest version without a hard refresh, even from a plain bookmark with no `?v=`: the deploy loads `game.js` and `style.css` as `?v=<commit>`, marks `index.html` no-cache, and a tiny check reads `version.json` (never cached) when the page opens or is restored, reloading once onto a newer deploy. The phone layout tests run against the repo copy and both built sites, and the post-deploy check also runs a phone-size check on each live site. | Done (#29) |
| W18 | Fast rollback: typing "Rollback" in the project chat puts prod back on the previous `prod-N` release in about a minute (no test run, since releases were already tested); "Rollback to prod-N" picks a specific release. The live check confirms prod serves that release's commit and reports its name, and the README label shows the current release. Dev is untouched. | Done (#37) |

## 2. Shipped changes

Every merged change is a [merged PR](https://github.com/Hitoshi85/train-simulator/pulls?q=is%3Apr+is%3Amerged) (titles say what changed,
numbers link back from this file), and every promotion to prod is a [`prod-N` release](https://github.com/Hitoshi85/train-simulator/releases)
with generated notes. Changes up to 2026-11-10 are listed in
[docs/feedback-archive.md](docs/feedback-archive.md#shipped-changes-up-to-2026-11-10).

## 3. Feedback log

Newest at the bottom, latest 20 rows only: when a new row would make 21, move the oldest row to
[docs/feedback-archive.md](docs/feedback-archive.md). "Outcome" says what was done about it.

| Date | Feedback / request from Hitoshi | Outcome |
|---|---|---|
| 2026-11-08 | Question: how should day, night, rain and snow be chosen? (options: pick before each run, random each run, change during the run) | Hitoshi chose change during the run: morning to evening to night, with rain or snow rolling in partway. Built in #25 (R19, R23), closes #12. |
| 2026-11-08 | New list: dev/prod environments with separate links; "Ship" promotes a version to prod; prod/dev links in the README; save progress on the device; players can submit feedback that goes to the backlog and notifies Hitoshi; a review agent inside the project. | Split across threads; player feedback built in #26 (R24); review agent built in #27 (W13). |
| 2026-11-08 | Question: how should a player's feedback reach the backlog? (options: prefilled GitHub issue link, form service copied into issues daily, serverless relay holding a token) | Hitoshi chose the prefilled GitHub issue (R24). |
| 2026-11-08 | Question: what should the feedback issue include automatically? (options: game context, only the player's words, context plus a frame snapshot) | Hitoshi chose the game context (R24). |
| 2026-11-08 | "Review agent but within the project and not a separate setup." | Replaces the API-key review workflow with a Claude reviewer thread in the project (W13). |
| 2026-11-08 | Question: how should auto-merge wait for the review? (options: queue waits for a passing review of the latest commit, every PR starts on hold, advice only). Hitoshi: "I don't want to review small PRs for dev." | Built the first option: the reviewer thread, not Hitoshi, reviews; small PRs still merge on their own (W13). |
| 2026-11-08 | Question: what should be saved? (options: best scores and settings; plus resume a run from the last station; plus run history and lifetime totals) | Hitoshi chose best scores, settings and resume (R25). |
| 2026-11-08 | Question: how should resuming work? (options: title offers Continue or New run; jump straight back in; small Continue button on the normal title) | Hitoshi chose Continue or New run on the title (R25). |
| 2026-11-08 | Question: which links should dev and prod use? (options: prod keeps the current link and dev moves to /dev/, both under /prod/ and /dev/, dev keeps the current link and prod moves to /prod/) | Hitoshi chose prod at the current link, dev at /dev/ (W16). |
| 2026-11-08 | Question: how should the dev game show it is dev? (options: small DEV tag in a corner, no marker, tags on both) | Hitoshi chose no marker: dev and prod look the same; `version.json` on each site names its commit (W16). |
| 2026-11-08 | "Make sure that both dev and prod are mobile friendly and does not require a hard refresh to play the latest version." | Added to the dev/prod PR: commit-versioned assets, no-cache page, a version check that reloads once onto a newer deploy, and phone checks on both sites (W17). |
| 2026-11-08 | "Make dev link clear that it is dev." (changes the earlier no-marker choice) | Dev now shows a small "DEV <commit>" tag at the top centre, ignoring taps, and "DEV" in the page title; prod is unchanged (W16). |
| 2026-11-08 | "Update dev/prod links in README.md." | The deploy had already updated them (prod 3a22128, dev ffc1cab); moved them to the top of the README as a "Play now" table with the plain links to bookmark plus the current versions. |
| 2026-11-08 | "Links don't match up" (README on a phone showed a table of plain links and a second list of ?v= links; the table was cut off). | One short list, each site once: "Prod (prod-1, sha): link" and "Dev (sha): link"; the deploy only updates the version labels. |
| 2026-11-09 | New list: fast rollback of versions/releases; more realistic, less obnoxious acceleration/deceleration sounds; label screenshots with the PR; label threads with the PR. | Fast rollback built in #37 (W18); sounds and labels handled in other threads. |
| 2026-11-09 | "More realistic and less obnoxious acceleration/deceleration sounds." | Asked two questions: motor sound, A modern inverter whine; braking, A gentle air (soft puff on harder braking, faint hiss only on heavy braking, falling regen whine). Implemented (R26). |
| 2026-11-09 | "Ship" | Promoted dev d2c93ab to prod as release prod-2. The Ship run skipped its live check (workflow bug, fixed in #39); a follow-up deploy run verified prod-2 live and updated the README. |
| 2026-11-10 | Review the tasks in the agentic AI review doc and decide them one by one. | Decided A to H one at a time; all eight filed as `task` issues, none built yet. A: scheduled reviewer only, run daily, not hourly (#41). B: veto window with no triage run, 36 hours instead of 24 (#42). C: batch all of a task's questions in one message, no "decide and show" (#43). D: screenshot comparison and balance test, one reviewer, no second fresh-session review (#44). E: split game.js as written, after A to D land (#45). F: as written (#46). G: as written (#47). H: weekly report folded into the daily reviewer run, on Fridays (#48). |
| 2026-11-10 | Agentic review item C (narrower clarifying-question rule): Hitoshi chose **batch only**, Claude still asks about every change but sends all of a feature's questions together. | Implemented in #50 (W2, CLAUDE.md); closes #43. |
| 2026-11-10 | Build agentic review item F (#46) as written: slim REQUIREMENTS.md and check it in CI; "proceed with all in the order that makes sense". | Built in #53: Shipped changes now points to merged PRs and releases, feedback rows older than the latest 20 and the old shipped table moved to docs/feedback-archive.md, every placeholder replaced with its number, and a lint test in CI (W7). Instead of the queue filling in PR numbers on merge, threads write the number once the PR is open and CI rejects the placeholder on every branch, because hand-merged workflow PRs skip the queue (found in project review). |

## 4. Open backlog

Add the `ready` label to an issue to start it.

| Issue | Task | Status |
|---|---|---|
| [#41](https://github.com/Hitoshi85/train-simulator/issues/41) | A. Daily scheduled reviewer run (agentic review) | Approved, not started |
| [#42](https://github.com/Hitoshi85/train-simulator/issues/42) | B. Backlog veto window (36 hours), after #41 | Approved, not started |
| [#43](https://github.com/Hitoshi85/train-simulator/issues/43) | C. Batch clarifying questions in one message | In PR [#50](https://github.com/Hitoshi85/train-simulator/pull/50) |
| [#44](https://github.com/Hitoshi85/train-simulator/issues/44) | D. AI playtest on feature PRs (screenshots and balance) | Approved, not started |
| [#45](https://github.com/Hitoshi85/train-simulator/issues/45) | E. Split game.js into native ES modules, after A to D | Approved, not started |
| [#46](https://github.com/Hitoshi85/train-simulator/issues/46) | F. Slim REQUIREMENTS.md and check it in CI | In PR [#53](https://github.com/Hitoshi85/train-simulator/pull/53) |
| [#47](https://github.com/Hitoshi85/train-simulator/issues/47) | G. Test the deploy workflow logic (needs "m") | Approved, not started |
| [#48](https://github.com/Hitoshi85/train-simulator/issues/48) | H. Weekly report on Fridays, after #41 | Approved, not started |

Removed by the owner on 2026-11-08 (closed as not planned): [#5](https://github.com/Hitoshi85/train-simulator/issues/5) cat bonus rebalance, [#6](https://github.com/Hitoshi85/train-simulator/issues/6) save best score.

## 5. Ideas mentioned, not yet requested

- Extra lines.
- A native iOS version (SwiftUI + SceneKit) of the same original game.
- CI posting a test-results table on each PR.
- A daily backlog-grooming routine (proposed 2026-11-08, dropped by Hitoshi).
