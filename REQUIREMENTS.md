# Aozora Line: requirements and feedback log

The single, always-current record of what the game must do, what has shipped, what the owner
(Hitoshi) has asked for, and what is next. Every change to the game, and every piece of feedback,
is recorded here in the same PR or thread that handles it (see the rule in [CLAUDE.md](CLAUDE.md)).

- **Play prod (stable):** https://hitoshi85.github.io/train-simulator/
- **Play dev (latest main):** https://hitoshi85.github.io/train-simulator/dev/ (add `?v=<short commit>`
  on a phone to skip a cached copy; the current links with that suffix are always in [README.md](README.md))
- **Backlog:** [open issues](https://github.com/Hitoshi85/train-simulator/issues)
- **Last updated:** 2026-11-08

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
| R24 | Players can send feedback from the game: a 💬 Feedback button (and the F key) pauses the run and opens a prefilled GitHub issue from the repo's feedback form, labelled `feedback`, so it lands in the backlog and GitHub notifies Hitoshi as the repo owner. The game fills in its context (version, Local/Express, where on the line, speed, time of day, weather, screen and browser). Players need a GitHub account (Hitoshi's choice); no token is shipped in the game. | Done (this PR) |
| R25 | Progress is saved on the device (browser localStorage, no account): best score and rank per mode, settings (mode, sound), and a run in progress at the last station reached. On reopening, the title offers "Continue from the station" (Enter / tap) or "New run" (N). One versioned record (`aozora.save`, v1) so it can later move to cloud accounts. The dev site keeps a separate save (`aozora.save.dev`) so testing never touches prod saves. | Done (#28, dev split in #33) |

### How we work

| # | Requirement | Status |
|---|---|---|
| W1 | All work runs in cloud sessions, not tied to the owner's computer. | In place |
| W2 | Before changing the game, ask clarifying questions **one at a time**, each with 3 options and a recommended one. | In place |
| W3 | Agentic loop: tasks are GitHub issues labelled `task`; the owner approves with `ready`; one thread per issue opens a small PR; CI (ESLint + headless autopilot smoke test) must be green. See [docs/WORKFLOW.md](docs/WORKFLOW.md). | In place |
| W4 | PRs merge on their own through the merge queue when every check is green on top of `main` and the description has a screenshot, for small PRs only: 800 changed lines or fewer, lock files and images not counted (Hitoshi's choice). Bigger PRs wait for "m" unless labelled `automerge`. A `hold` label keeps a PR out; PRs that change `.github/workflows/` still wait for the owner's "m". Replaces "the owner merges". | Done (#22) |
| W5 | Merges to `main` deploy to GitHub Pages through the tested workflow, to **dev** only (`/train-simulator/dev/`). | In place (dev/prod split in this PR) |
| W6 | After every shipped change, share the latest mobile link with a cache-busting suffix: `https://hitoshi85.github.io/train-simulator/?v=<short commit>`. Since #22 the deploy workflow checks the live site first (`version.json` shows the new commit and the game starts) and comments the link on the merged PR. | In place (repo rule #13; live check in #22) |
| W7 | Keep all requirements and feedback in this file, updated with every change and every piece of feedback. | In place |
| W8 | Show results (e.g. test runs) in simple tables when asked. | Preference |
| W9 | Use several focused subagents in parallel for independent parts of a task, keeping token use balanced (few agents, small prompts). | In place |
| W10 | When asking for approval on backlog items, ask one item at a time with 3 options, and always include an option to remove the item from the backlog without doing it (the issue is closed as not planned). | In place |
| W11 | With each PR, share a screenshot of the game that highlights the new feature. | In place (2026-11-08) |
| W12 | Automatic phone and speed checks on every PR: CI takes phone screenshots (portrait 390×844 and landscape 844×390, title and mid-run; artifact `phone-screenshots`) and fails a PR if the median time to draw one frame at phone size is over 16 ms (60 fps). Frame times appear in the CI job summary. | In place (#21) |
| W13 | PR review inside the project, no separate setup or API key: a Claude "PR reviewer" thread reviews only the diff of each PR and posts one comment with a `project-review: PASS/BLOCK <sha>` verdict. The merge queue waits for a PASS on the latest commit (a rebase by the queue carries it over); BLOCK keeps the PR out until fixed. Docs-only PRs skip the review. Hitoshi does not review small PRs. Process: `docs/REVIEW.md`. | Built (#27); the old API-key review workflow is removed |
| W14 | Merge queue: one PR at a time, oldest first; the queue rebases it onto `main`, re-runs CI, merges when green, deploys, then moves to the next. A PR it cannot rebase gets a `queue-conflict` label and a comment. | Done (#22) |
| W16 | Separate dev and prod web links: prod stays at `https://hitoshi85.github.io/train-simulator/` (Hitoshi's choice), dev is at `/dev/` and clearly marked: a small "DEV <commit>" tag at the top of the screen and "DEV" in the page title (prod is unmarked). When Hitoshi types "Ship" in the project chat, the version dev serves is promoted to prod as a tagged GitHub release (`prod-1`, `prod-2`, …); a rollback re-points prod at an earlier release. The live check verifies both sites. README.md always shows the latest prod and dev links with a `?v=<short-sha>` suffix, updated by the deploy workflow. | Done (this PR) |
| W17 | Both dev and prod are phone friendly and always play the latest version without a hard refresh, even from a plain bookmark with no `?v=`: the deploy loads `game.js` and `style.css` as `?v=<commit>`, marks `index.html` no-cache, and a tiny check reads `version.json` (never cached) when the page opens or is restored, reloading once onto a newer deploy. The phone layout tests run against the repo copy and both built sites, and the post-deploy check also runs a phone-size check on each live site. | Done (this PR) |
| W15 | Hitoshi talks only in the project chat with one orchestrator; threads send questions, ready PRs and manual steps through it instead of asking in their own thread. | In place |

## 2. Shipped changes

| Date | Change | PR |
|---|---|---|
| 2026-11-08 | README "Play now" shows each site once (prod and dev plain links with version labels), no table; the deploy only updates the labels | this PR |
| 2026-11-08 | README opens with a "Play now" table: the prod and dev links to bookmark, then the current version of each (kept current by the deploy) | this PR |
| 2026-11-08 | Fix the post-deploy phone check: it expected exactly 7 touch buttons, but the Feedback button made 8, so the first dev/prod deploy was marked failed although both sites were live | this PR |
| 2026-11-08 | Dev and prod sites: merges go to dev (`/dev/`, marked with a DEV tag and title), "Ship" promotes dev to prod as a `prod-N` release with one-click rollback, live check on both, latest links kept in README.md; both sites phone friendly and self-updating without a hard refresh | this PR |
| 2026-11-07 | Basic browser train-driving game: notches, speed limits, 4 stops, stop-on-mark scoring | [#1](https://github.com/Hitoshi85/train-simulator/pull/1) |
| 2026-11-07 | Lots of cats with a +2 cat bonus; random scenery every 10 s (Snowy Peaks, Red-Rock Canyon, Coastal Cliffs) | [#2](https://github.com/Hitoshi85/train-simulator/pull/2) |
| 2026-11-07 | Cache-busting `?v=N` on game files so browsers load the latest version | [#3](https://github.com/Hitoshi85/train-simulator/pull/3) |
| 2026-11-07 | CI (lint + headless autopilot test), tested Pages deploy, issue and PR templates | [#4](https://github.com/Hitoshi85/train-simulator/pull/4) |
| 2026-11-07 | Rule: share the latest mobile link after every shipped change | [#13](https://github.com/Hitoshi85/train-simulator/pull/13) |
| 2026-11-07 | This requirements and feedback log | [#14](https://github.com/Hitoshi85/train-simulator/pull/14) |
| 2026-11-07 | 4 new stations (9 stations, about 1 km apart); live front, rear and platform camera insets; original synthesized sound, chimes and background music with mute (M / Sound button). Closes #8 | [#15](https://github.com/Hitoshi85/train-simulator/pull/15) |
| 2026-11-08 | Phone layout without scrolling in portrait and landscape, bigger touch buttons, help hidden on touch (closes #10); pause with P / Esc / button and auto-pause on tab switch (closes #7) | [#17](https://github.com/Hitoshi85/train-simulator/pull/17) |
| 2026-11-08 | Uphill and downhill gradients (up to ±25‰) that change acceleration, gradient posts beside the track and a GRADIENT readout on the dashboard; stations are level. Closes #9 | [#18](https://github.com/Hitoshi85/train-simulator/pull/18) |
| 2026-11-08 | Express mode: pick Local or Express on the title screen; Express passes 4 of the 8 stops, runs a tighter timetable and has higher limits on open track. Closes #11 | [#20](https://github.com/Hitoshi85/train-simulator/pull/20) |
| 2026-11-08 | Hand-painted pastoral look: watercolour sky and clouds, three pastoral scenes, morning-to-evening light along the line, living details (birds, swaying trees and grass, petals, paddies, sailboats, fireflies), repainted stations and train. Preview: [docs/screens/painted-look.png](docs/screens/painted-look.png) | [#19](https://github.com/Hitoshi85/train-simulator/pull/19) |
| 2026-11-08 | CI phone screenshots and a 16 ms frame-draw budget at phone size on every PR; Claude review agent workflow | [#21](https://github.com/Hitoshi85/train-simulator/pull/21) |
| 2026-11-08 | Merge queue with auto-merge (green + screenshot + 800 lines or fewer, oldest first, rebase and re-test) and a post-deploy live check that posts the phone link | [#22](https://github.com/Hitoshi85/train-simulator/pull/22) |
| 2026-11-08 | 3 power and 3 brake notches, departures start on P1; black centre line (cab window pillar) removed; front and rear cameras now show the sea, hills and town on the matching side; insets render at a quarter of the screen size so three cameras near a station stay inside the 16 ms phone frame budget | This PR |
| 2026-11-08 | Real towns in Japan: the line now follows the seaside line from Fujisawa to Kamakura via Enoshima (real station names, kanji boards), scenery by town (towns, pine woods, coast, temple hills), and Mt Fuji, Enoshima island and the Inamuragasaki cape placed by map bearing in every camera. Preview: [docs/screens/real-towns.png](docs/screens/real-towns.png) | [#24](https://github.com/Hitoshi85/train-simulator/pull/24) |
| 2026-11-08 | Morning to night along the line, with rain or snow rolling in partway (random each run) and clearing; night lights; also in every camera inset; phone frame check at night in rain and snow. Closes #12. Preview: [docs/screens/time-and-weather.png](docs/screens/time-and-weather.png) | [#25](https://github.com/Hitoshi85/train-simulator/pull/25) |
| 2026-11-08 | Player feedback: 💬 Feedback button and F key open a prefilled GitHub feedback issue with the game context; the run pauses while the player writes. Preview: [docs/screens/feedback-button.png](docs/screens/feedback-button.png) | [#26](https://github.com/Hitoshi85/train-simulator/pull/26) |
| 2026-11-08 | In-project PR review: a Claude thread reviews each PR's diff and posts a verdict; the merge queue waits for a PASS. The API-key review workflow is removed. Process: [docs/REVIEW.md](docs/REVIEW.md) | [#27](https://github.com/Hitoshi85/train-simulator/pull/27) |
| 2026-11-08 | Progress saved on the device: best score and rank per mode, mode and sound settings, and resume a run from the last station (Continue or New run on the title). Versioned save format for later cloud accounts. Preview: [docs/screens/save-progress.png](docs/screens/save-progress.png) | [#28](https://github.com/Hitoshi85/train-simulator/pull/28) |
| 2026-11-08 | The dev site keeps its own save, apart from prod (both share one web origin) | This PR |

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
| 2026-11-08 | New standing rule: with each PR, share a screenshot of the game and highlight the new feature. | Rule W11; #19 includes [docs/screens/painted-look.png](docs/screens/painted-look.png). |
| 2026-11-08 | Hitoshi sent "M" for the painted-look PR. | Merged the painted-look PR (#19) after bringing in #17, #18 and #20, once CI was green. |
| 2026-11-08 | Asked whether the setup is fully agentic; approved all six proposed upgrades, then dropped the daily backlog routine (item 3). | Auto-merge, merge queue and post-deploy check built in #22; phone screenshots, frame budget and review agent built in #21 (W12, W13). |
| 2026-11-08 | Hitoshi wants to talk only in the project chat (one orchestrator), not in each thread. | Threads send questions, ready PRs and manual steps through the project chat (W15). |
| 2026-11-08 | Question: how strict should the frame-rate check be? (options: fixed 60 fps budget, no slowdown vs main, report only) | Hitoshi chose the fixed budget: fail over 16 ms median at phone size (W12, #21). |
| 2026-11-08 | Question: how should the review agent sign in? (options: Claude subscription token, Anthropic API key, not yet) | Hitoshi chose "not yet": the review workflow ships and skips until a secret is added (W13, #21). |
| 2026-11-08 | Question: which PRs should merge by themselves? (options: small PRs with a screenshot, every PR with a screenshot, only PRs labelled automerge) | Hitoshi first chose every PR with a screenshot, then changed it to small PRs with a screenshot (under about 800 changed lines); built that way (W4). |
| 2026-11-08 | Hitoshi sent "M" for the merge-queue PR (#22). | Merged after #19 and #21, once CI was green. |
| 2026-11-08 | New list: 3 acceleration and 3 brake levels; start at acceleration 1; remove the black line in the middle of the screen; make the front and rear cams match the landscape; real towns in Japan; day/night/rain/snow; bullet train option; course/train select like a kart racer (on hold). | Controls, black line and cameras built in one small PR (R3, R21); towns and weather in a parallel thread; bullet train and course select still to plan. |
| 2026-11-08 | Question: what should "start at acceleration 1" do? (options: P1 at every departure, P1 only at the first departure, first Power press jumps to P1) | Hitoshi chose P1 at every departure (R3). |
| 2026-11-08 | Hitoshi dropped the bullet train and course select for now ("Don't do 4 for now", "Don't do 3 either"). | Not planned for now; the route data is still kept in one object so more lines are easy later. |
| 2026-11-08 | Question: which real line should the 9 stations follow? (options: seaside line Fujisawa to Kamakura via Enoshima, mountain line Odawara to Gora, city corridor Tokyo to Yokohama) | Hitoshi chose the seaside line; built in #24 (R4, R9, R22). |
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

## 4. Open backlog

Add the `ready` label to an issue to start it.

| Issue | Task | Status |
|---|---|---|
| (none open) | | |

Removed by the owner on 2026-11-08 (closed as not planned): [#5](https://github.com/Hitoshi85/train-simulator/issues/5) cat bonus rebalance, [#6](https://github.com/Hitoshi85/train-simulator/issues/6) save best score.

## 5. Ideas mentioned, not yet requested

- Extra lines.
- A native iOS version (SwiftUI + SceneKit) of the same original game.
- CI posting a test-results table on each PR.
- A daily backlog-grooming routine (proposed 2026-11-08, dropped by Hitoshi).
