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
| R4 | One fictional 8.6 km line, 9 stations about 1 km apart: Hinata (0 m), Kozakura (900), Kawabe (1800), Nanohana (3000), Momijidai (4200), Hotarubashi (5100), Shiokaze (6000), Yuzuhara (7300), Tsukimino (8600); 8 stops. | Done (#15) |
| R5 | Speed limits shown by the track and on the speedometer; overspeed costs points. | Done |
| R6 | Stop-on-the-mark scoring at each station: up to 1000 for accuracy (+500 under 30 cm), up to 500 for punctuality, +200 for a smooth stop on B1–B3, 0 for overrunning the mark by 30 m. | Done |
| R7 | Cats appear frequently: lots of cats beside the track and on platforms ("cats everywhere"). Original cats only. | Done |
| R8 | Cat-spotting counter ("Cats spotted", top left); each cat passed is worth +2 points at the next station. | Done (rebalance #5 dropped by owner, 2026-11-08) |
| R9 | Scenery changes every 10 seconds, picked at random with a short fade, between three pastoral scenes: Rice Paddy Valley, Forest Hills, Seaside Town (replaced Snowy Peaks, Red-Rock Canyon and Coastal Cliffs in the painted-look PR). | Done (this PR) |
| R10 | Playable on a phone from a shareable web link that always shows the latest version (no stale cache). | Done (phone layout in R14) |
| R11 | Live camera insets in the top-right of the view, always on: FRONT CAM (outside camera ahead of the train looking back at its nose and side) and REAR CAM (from the tail looking back down the track). Rendered by the game, not real video. | Done (#15) |
| R12 | Platform camera inset that appears in sync as the train approaches each station (last 500 m), showing the train pulling in. | Done (#15) |
| R13 | Original synthesized sound with Web Audio, no audio files or copyrighted tunes: motor hum following speed, rolling noise, rail-joint clacks, brake hiss, lever clicks, overspeed beep, departure door chime, arrival melody, end jingle, and an original looping background tune. Mute with the M key or a "Sound" button, remembered in localStorage; audio starts only after the first key/tap. Closes #8. | Done (#15) |
| R14 | Comfortable on a phone: in portrait (390×844) and landscape (844×390) the view and all touch buttons fit on one screen with no scrolling; touch buttons at least 44 px tall (portrait: big buttons at thumb height; landscape: two-thumb layout with brake side left, power side right); keyboard help hidden on touch screens. Closes #10. | Done (#17) |
| R15 | Pause with P or Esc and a Pause / Resume button; the train, clock and sound freeze; switching tabs or apps pauses automatically; tap, P, Esc or Enter resumes. Closes #7. | Done (#17) |
| R16 | Uphill and downhill sections up to ±25‰ (moderate, chosen by Hitoshi) change acceleration by about g × ‰ / 1000: coasting slows uphill and speeds up downhill. Gradient posts (number and up/down arm, "L" for level) stand beside the track at each change, and the dashboard shows the current gradient. Stations stay on level track. Closes #9. | Done (#18) |
| R17 | Express mode chosen on the title screen (▲/▼ or L/E, touch ▲/▼): stops at Kawabe, Momijidai, Shiokaze and Tsukimino and passes the other 4 stations (green PASS board, no judging), with a tighter timetable (about 35–40% shorter than the Local runs it replaces) and +15 km/h on open track (85 → 100, 90 → 105). The end screen names the mode. Closes #11. | Done (this PR) |
| R18 | Hand-painted pastoral look inspired by the soft style of Japanese animated films, with original art only (no characters, creatures or scenes from any film): watercolour skies with towering clouds, layered hazy hills, lush greenery, warm light and paper grain. Covers scenery, stations, the train and cats; the dashboard stays clean. | Done (this PR) |
| R19 | Light shifts along the line: morning at Hinata, bright midday mid-line, a golden evening near Tsukimino. | Done (this PR) |
| R20 | Rich living world: drifting clouds, flocks of birds, swaying trees and grass, wildflowers, drifting petals by day, rippling rice paddies, washing lines, sailboats, sun rays and fireflies in the evening. | Done (this PR) |

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
| W10 | When asking for approval on backlog items, ask one item at a time with 3 options, and always include an option to remove the item from the backlog without doing it (the issue is closed as not planned). | In place |
| W11 | With each PR, share a screenshot of the game that highlights the new feature. | In place (2026-11-08) |

## 2. Shipped changes

| Date | Change | PR |
|---|---|---|
| 2026-11-07 | Basic browser train-driving game: notches, speed limits, 4 stops, stop-on-mark scoring | [#1](https://github.com/Hitoshi85/train-simulator/pull/1) |
| 2026-11-07 | Lots of cats with a +2 cat bonus; random scenery every 10 s (Snowy Peaks, Red-Rock Canyon, Coastal Cliffs) | [#2](https://github.com/Hitoshi85/train-simulator/pull/2) |
| 2026-11-07 | Cache-busting `?v=N` on game files so browsers load the latest version | [#3](https://github.com/Hitoshi85/train-simulator/pull/3) |
| 2026-11-07 | CI (lint + headless autopilot test), tested Pages deploy, issue and PR templates | [#4](https://github.com/Hitoshi85/train-simulator/pull/4) |
| 2026-11-07 | Rule: share the latest mobile link after every shipped change | [#13](https://github.com/Hitoshi85/train-simulator/pull/13) |
| 2026-11-07 | This requirements and feedback log | [#14](https://github.com/Hitoshi85/train-simulator/pull/14) |
| 2026-11-07 | 4 new stations (9 stations, about 1 km apart); live front, rear and platform camera insets; original synthesized sound, chimes and background music with mute (M / Sound button). Closes #8 | [#15](https://github.com/Hitoshi85/train-simulator/pull/15) |
| 2026-11-08 | Phone layout without scrolling in portrait and landscape, bigger touch buttons, help hidden on touch (closes #10); pause with P / Esc / button and auto-pause on tab switch (closes #7) | [#17](https://github.com/Hitoshi85/train-simulator/pull/17) |
| 2026-11-08 | Uphill and downhill gradients (up to ±25‰) that change acceleration, gradient posts beside the track and a GRADIENT readout on the dashboard; stations are level. Closes #9 | [#18](https://github.com/Hitoshi85/train-simulator/pull/18) |
| 2026-11-08 | Express mode: pick Local or Express on the title screen; Express passes 4 of the 8 stops, runs a tighter timetable and has higher limits on open track. Closes #11 | (this PR) |
| 2026-11-08 | Hand-painted pastoral look: watercolour sky and clouds, three pastoral scenes, morning-to-evening light along the line, living details (birds, swaying trees and grass, petals, paddies, sailboats, fireflies), repainted stations and train. Preview: [docs/screens/painted-look.png](docs/screens/painted-look.png) | (this PR) |

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
| 2026-11-07 | Asked for: a synchronous view of the train pulling into the station; a rear view video stream; stations closer together; sound and music. Asked to be asked clarifying questions one by one with options and recommendations. | Implemented in #15 (R4, R11, R12, R13); questions asked one by one (W2). |
| 2026-11-07 | Answers: platform camera inset (live, synced) on approach; always-on rear inset; more stations about 1 km apart (keep the 8.6 km line, 9 stations); train sounds plus chimes plus original background music, with a mute button. | Implemented in #15. |
| 2026-11-07 | "Live front side video stream at all times", clarified as an always-on outside view of the train's front. | Implemented in #15 (FRONT CAM, R11). |
| 2026-11-07 | New standing rule: always ask clarifying questions one by one, each with 3 options and a recommendation. | Implemented in #15 (W2, CLAUDE.md). |
| 2026-11-07 | New standing rule: always use multiple subagents that work in parallel, but balance token usage. | Implemented in #15 (W9, CLAUDE.md). |
| 2026-11-08 | Show the backlog and ask for approval on each item. | Reviewed one at a time. Approved: #10, #7, #9 as written; #11 changed to skip about half of the 8 stops (not one), since the line now has 9 stations. Skipped for now: #12, until the restyle lands. Removed (closed as not planned): #5, #6. |
| 2026-11-08 | For the backlog, always include an option to remove an item without addressing it. | New standing rule W10. |
| 2026-11-08 | Question: where should the buttons go when the phone is held sideways? (options: split on both sides, one column on the right, row below the view) | Built with the recommended split on both sides for two thumbs; can switch if Hitoshi picks another option. |
| 2026-11-08 | #10 and #7 built together in one PR; Hitoshi said "Merge". | Merged #17 once CI was green. |
| 2026-11-08 | Question: how steep should the hills be? (options: gentle up to 10‰, moderate up to 25‰, steep up to 40‰) | Hitoshi chose moderate, up to 25‰; built that way in #18 (R16). |
| 2026-11-08 | Hitoshi said "Merge" for the gradients PR. | Merged #18 once CI was green. |
| 2026-11-08 | Express build after the backlog review: approved Express mode (#11) with one change, skip about half of the 8 stops instead of just one; keep the tighter timetable, higher limits and the mode choice on the title screen. | Issue #11 updated; built in this PR (R17): Express stops at Kawabe, Momijidai, Shiokaze and Tsukimino. |
| 2026-11-08 | New shorthand: a message of only "m" means merge the PR. Hitoshi sent "M" for the Express PR. | Express PR rebased onto #17 and #18 and merged once CI was green. |
| 2026-11-08 | "Change graphics to Ghibli style." | Built as an original hand-painted pastoral look (R18), no film characters, creatures or scenes. |
| 2026-11-08 | Answers: scenery plus train and stations (dashboard stays clean); light shifts along the line (morning, midday, evening); rich living world; swap the three scenes for pastoral ones (rice paddies, forest hills, seaside town). | Implemented in the painted-look PR (R9, R18–R20). |
| 2026-11-08 | New standing rule: with each PR, share a screenshot of the game and highlight the new feature. | Rule W11; this PR includes [docs/screens/painted-look.png](docs/screens/painted-look.png). |
| 2026-11-08 | Hitoshi sent "M" for the painted-look PR. | Merged the painted-look PR (#19) after bringing in #17, #18 and #20, once CI was green. |

## 4. Open backlog

Add the `ready` label to an issue to start it.

| Issue | Task | Status |
|---|---|---|
| [#12](https://github.com/Hitoshi85/train-simulator/issues/12) | Add an evening run with lighting and rain | Skipped for now (after the restyle) |

Removed by the owner on 2026-11-08 (closed as not planned): [#5](https://github.com/Hitoshi85/train-simulator/issues/5) cat bonus rebalance, [#6](https://github.com/Hitoshi85/train-simulator/issues/6) save best score.

## 5. Ideas mentioned, not yet requested

- Extra lines.
- A native iOS version (SwiftUI + SceneKit) of the same original game.
- CI posting a test-results table on each PR.
