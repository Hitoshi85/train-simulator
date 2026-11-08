# Aozora Line: requirements and feedback log

The single, always-current record of what the game must do, what has shipped, what the owner
(Hitoshi) has asked for, and what is next. Every change to the game, and every piece of feedback,
is recorded here in the same PR or thread that handles it (see the rule in [CLAUDE.md](CLAUDE.md)).

- **Play (desktop or phone):** https://hitoshi85.github.io/train-simulator/ (add `?v=<short commit>`
  on a phone to skip a cached copy)
- **Backlog:** [open issues](https://github.com/Hitoshi85/train-simulator/issues)
- **Last updated:** 2026-11-08

## 1. Core requirements

### Game

| # | Requirement | Status |
|---|---|---|
| R1 | Original browser train-driving game in the Japanese train-sim genre. Not a copy: no names, characters, art, music, routes or UI from commercial titles. Working title "Aozora Line". | Done |
| R2 | Plain HTML/CSS/JS, no build step; runs in any modern browser. | Done |
| R3 | Power notches P1–P5, brake notches B1–B8, neutral and an emergency brake. Keyboard (↑/W, ↓/S, N, Space, Enter) and on-screen buttons for touch. | Done |
| R4 | One fictional 8.6 km line, 9 stations about 1 km apart: Hinata (0 m), Kozakura (900), Kawabe (1800), Nanohana (3000), Momijidai (4200), Hotarubashi (5100), Shiokaze (6000), Yuzuhara (7300), Tsukimino (8600); 8 stops. | Done (this PR) |
| R5 | Speed limits shown by the track and on the speedometer; overspeed costs points. | Done |
| R6 | Stop-on-the-mark scoring at each station: up to 1000 for accuracy (+500 under 30 cm), up to 500 for punctuality, +200 for a smooth stop on B1–B3, 0 for overrunning the mark by 30 m. | Done |
| R7 | Cats appear frequently: lots of cats beside the track and on platforms ("cats everywhere"). Original cats only. | Done |
| R8 | Cat-spotting counter ("Cats spotted", top left); each cat passed is worth +2 points at the next station. | Done (rebalance planned in #5) |
| R9 | Scenery changes every 10 seconds, picked at random with a short fade, between three dramatic scenes: Snowy Peaks (mountain), Red-Rock Canyon (desert), Coastal Cliffs (ocean). | Done |
| R10 | Playable on a phone from a shareable web link that always shows the latest version (no stale cache). | Done (phone comfort in #10) |
| R11 | Live camera insets in the top-right of the view, always on: FRONT CAM (outside camera ahead of the train looking back at its nose and side) and REAR CAM (from the tail looking back down the track). Rendered by the game, not real video. | Done (this PR) |
| R12 | Platform camera inset that appears in sync as the train approaches each station (last 500 m), showing the train pulling in. | Done (this PR) |
| R13 | Original synthesized sound with Web Audio, no audio files or copyrighted tunes: motor hum following speed, rolling noise, rail-joint clacks, brake hiss, lever clicks, overspeed beep, departure door chime, arrival melody, end jingle, and an original looping background tune. Mute with the M key or a "Sound" button, remembered in localStorage; audio starts only after the first key/tap. Closes #8. | Done (this PR) |
| R14 | Uphill and downhill sections up to ±25‰ (moderate) change acceleration by about g × ‰ / 1000: coasting slows uphill and speeds up downhill. Gradient posts (number and up/down arm, "L" for level) stand beside the track at each change, and the dashboard shows the current gradient. Stations stay on level track. Closes #9. | Done (gradients PR) |

### How we work

| # | Requirement | Status |
|---|---|---|
| W1 | All work runs in cloud sessions, not tied to the owner's computer. | In place |
| W2 | Before changing the game, ask clarifying questions **one at a time**, each with 3 options and a recommended one. | In place |
| W3 | Agentic loop: tasks are GitHub issues labelled `task`; the owner approves with `ready`; one thread per issue opens a small PR; CI (ESLint + headless autopilot smoke test) must be green. See [docs/WORKFLOW.md](docs/WORKFLOW.md). | In place |
| W4 | The owner merges. No merge or auto-merge unless the owner says so for that PR. | In place |
| W5 | Merges to `main` deploy to GitHub Pages through the tested workflow. | In place |
| W6 | After every shipped change, share the latest mobile link with a cache-busting suffix: `https://hitoshi85.github.io/train-simulator/?v=<short commit>`. | In place (repo rule, #13) |
| W7 | Keep all requirements and feedback in this file, updated with every change and every piece of feedback. | In place |
| W8 | Show results (e.g. test runs) in simple tables when asked. | Preference |
| W9 | Use several focused subagents in parallel for independent parts of a task, keeping token use balanced (few agents, small prompts). | In place |

## 2. Shipped changes

| Date | Change | PR |
|---|---|---|
| 2026-11-07 | Basic browser train-driving game: notches, speed limits, 4 stops, stop-on-mark scoring | [#1](https://github.com/Hitoshi85/train-simulator/pull/1) |
| 2026-11-07 | Lots of cats with a +2 cat bonus; random scenery every 10 s (Snowy Peaks, Red-Rock Canyon, Coastal Cliffs) | [#2](https://github.com/Hitoshi85/train-simulator/pull/2) |
| 2026-11-07 | Cache-busting `?v=N` on game files so browsers load the latest version | [#3](https://github.com/Hitoshi85/train-simulator/pull/3) |
| 2026-11-07 | CI (lint + headless autopilot test), tested Pages deploy, issue and PR templates | [#4](https://github.com/Hitoshi85/train-simulator/pull/4) |
| 2026-11-07 | Rule: share the latest mobile link after every shipped change | [#13](https://github.com/Hitoshi85/train-simulator/pull/13) |
| 2026-11-07 | This requirements and feedback log | [#14](https://github.com/Hitoshi85/train-simulator/pull/14) |
| 2026-11-07 | 4 new stations (9 stations, about 1 km apart); live front, rear and platform camera insets; original synthesized sound, chimes and background music with mute (M / Sound button). Closes #8 | (this PR) |

| 2026-11-08 | Uphill and downhill gradients (up to ±25‰) that change acceleration, gradient posts beside the track and a GRADIENT readout on the dashboard; stations are level. Closes #9 | (gradients PR) |

## 3. Feedback log

Newest at the bottom. "Outcome" says what was done about it.

| Date | Feedback / request from Hitoshi | Outcome |
|---|---|---|
| 2026-11-07 | Build a very basic HTML train simulator in the Densha de Go style, ready in 15 minutes, using cloud sessions. | Built as an original game, Aozora Line (#1). |
| 2026-11-07 | "How many stations are active?" | 4 stops on one line; more can be added on request. |
| 2026-11-07 | Add cats frequently and change the scenery (mountain, desert, ocean) every 10 seconds; ask clarifying questions first. | Shipped in #2. |
| 2026-11-07 | Ask the questions one by one. | Became rule W2. |
| 2026-11-07 | Answers: cats beside the track and platforms (not on the track); "lots, cats everywhere"; cat-spotting bonus; random scene order with a fade; dramatic scenes; update the link and open a PR. | Implemented as chosen in #2. |
| 2026-11-07 | Not seeing the latest updates on the original link; no cats visible. | Browser cache. Rebuilt the playable link as one file; added cache-busting (#3). |
| 2026-11-07 | Update the GitHub Pages link; how to hard refresh on mobile. | Pages live; add `?v=…` to the link on phones. |
| 2026-11-07 | Set up a full agentic workflow. | CI, tested deploy, templates and issues #5–#12 (#4). Pages switched to GitHub Actions by Hitoshi. |
| 2026-11-07 | Show test results in a simple table. | Done; all 7 tests pass. Became preference W8. |
| 2026-11-07 | Always share the latest link for mobile. | Project rule; repo rule merged in #13 (W6). |
| 2026-11-07 | Keep track of all requirements and feedback in one shareable, constantly updated place. | This file (W7), #14. |
| 2026-11-07 | Asked for: a synchronous view of the train pulling into the station; a rear view video stream; stations closer together; sound and music. Asked to be asked clarifying questions one by one with options and recommendations. | Implemented in this PR (R4, R11, R12, R13); questions asked one by one (W2). |
| 2026-11-07 | Answers: platform camera inset (live, synced) on approach; always-on rear inset; more stations about 1 km apart (keep the 8.6 km line, 9 stations); train sounds plus chimes plus original background music, with a mute button. | Implemented in this PR. |
| 2026-11-07 | "Live front side video stream at all times", clarified as an always-on outside view of the train's front. | Implemented in this PR (FRONT CAM, R11). |
| 2026-11-07 | New standing rule: always ask clarifying questions one by one, each with 3 options and a recommendation. | Implemented in this PR (W2, CLAUDE.md). |
| 2026-11-07 | New standing rule: always use multiple subagents that work in parallel, but balance token usage. | Implemented in this PR (W9, CLAUDE.md). |

| 2026-11-08 | Backlog review: approved #9 (gradients) as written. | Implemented in the gradients PR (R14); default steepness "moderate, up to ±25‰" pending Hitoshi's answer to the clarifying question. |

## 4. Open backlog

Add the `ready` label to an issue to start it.

| Issue | Task |
|---|---|
| [#5](https://github.com/Hitoshi85/train-simulator/issues/5) | Rebalance the cat bonus so driving skill decides the score (cats are ~40% of a stop's score today) |
| [#6](https://github.com/Hitoshi85/train-simulator/issues/6) | Save the best score and rank in the browser |
| [#7](https://github.com/Hitoshi85/train-simulator/issues/7) | Add pause with P / Esc and a pause button |
| [#10](https://github.com/Hitoshi85/train-simulator/issues/10) | Make the game comfortable to play on a phone |
| [#11](https://github.com/Hitoshi85/train-simulator/issues/11) | Add an Express mode that skips a station |
| [#12](https://github.com/Hitoshi85/train-simulator/issues/12) | Add an evening run with lighting and rain |

## 5. Ideas mentioned, not yet requested

- Extra lines.
- A native iOS version (SwiftUI + SceneKit) of the same original game.
- CI posting a test-results table on each PR.
