# Aozora Line: feedback archive

Older rows of the feedback log in [REQUIREMENTS.md](../REQUIREMENTS.md), which keeps only the latest
20. When a row leaves REQUIREMENTS.md, append it to the bottom of the table here, unchanged.

## Feedback log, older rows

Oldest at the top.

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
| 2026-11-08 | Express build after the backlog review: approved Express mode (#11) with one change, skip about half of the 8 stops instead of just one; keep the tighter timetable, higher limits and the mode choice on the title screen. | Issue #11 updated; built in #20 (R17): Express stops at Kawabe, Momijidai, Shiokaze and Tsukimino. |
| 2026-11-08 | New shorthand: a message of only "m" means merge the PR. Hitoshi sent "M" for the Express PR. | Express PR rebased onto #17 and #18 and merged once CI was green. |
| 2026-11-08 | "Change graphics to Ghibli style." | Built as an original hand-painted pastoral look (R18), no film characters, creatures or scenes. |
| 2026-11-08 | Answers: scenery plus train and stations (dashboard stays clean); light shifts along the line (morning, midday, evening); rich living world; swap the three scenes for pastoral ones (rice paddies, forest hills, seaside town). | Implemented in #19 (R9, R18–R20). |
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

## Shipped changes up to 2026-11-10

Frozen copy of the table REQUIREMENTS.md kept before it pointed at merged PRs and releases.

| Date | Change | PR |
|---|---|---|
| 2026-11-09 | Fix: Ship and Rollback now run the live check and README update (they were skipped because the test job is skipped for those actions) | [#39](https://github.com/Hitoshi85/train-simulator/pull/39) |
| 2026-11-09 | "Rollback" and "Rollback to prod-N" commands documented; the post-deploy check now also confirms prod's release name | [#37](https://github.com/Hitoshi85/train-simulator/pull/37) |
| 2026-11-08 | README "Play now" shows each site once (prod and dev plain links with version labels), no table; the deploy only updates the labels | [#36](https://github.com/Hitoshi85/train-simulator/pull/36) |
| 2026-11-08 | README opens with a "Play now" table: the prod and dev links to bookmark, then the current version of each (kept current by the deploy) | [#35](https://github.com/Hitoshi85/train-simulator/pull/35) |
| 2026-11-08 | Fix the post-deploy phone check: it expected exactly 7 touch buttons, but the Feedback button made 8, so the first dev/prod deploy was marked failed although both sites were live | [#34](https://github.com/Hitoshi85/train-simulator/pull/34) |
| 2026-11-08 | Dev and prod sites: merges go to dev (`/dev/`, marked with a DEV tag and title), "Ship" promotes dev to prod as a `prod-N` release with one-click rollback, live check on both, latest links kept in README.md; both sites phone friendly and self-updating without a hard refresh | [#29](https://github.com/Hitoshi85/train-simulator/pull/29) |
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
| 2026-11-08 | 3 power and 3 brake notches, departures start on P1; black centre line (cab window pillar) removed; front and rear cameras now show the sea, hills and town on the matching side; insets render at a quarter of the screen size so three cameras near a station stay inside the 16 ms phone frame budget | [#23](https://github.com/Hitoshi85/train-simulator/pull/23) |
| 2026-11-08 | Real towns in Japan: the line now follows the seaside line from Fujisawa to Kamakura via Enoshima (real station names, kanji boards), scenery by town (towns, pine woods, coast, temple hills), and Mt Fuji, Enoshima island and the Inamuragasaki cape placed by map bearing in every camera. Preview: [docs/screens/real-towns.png](docs/screens/real-towns.png) | [#24](https://github.com/Hitoshi85/train-simulator/pull/24) |
| 2026-11-08 | Morning to night along the line, with rain or snow rolling in partway (random each run) and clearing; night lights; also in every camera inset; phone frame check at night in rain and snow. Closes #12. Preview: [docs/screens/time-and-weather.png](docs/screens/time-and-weather.png) | [#25](https://github.com/Hitoshi85/train-simulator/pull/25) |
| 2026-11-08 | Player feedback: 💬 Feedback button and F key open a prefilled GitHub feedback issue with the game context; the run pauses while the player writes. Preview: [docs/screens/feedback-button.png](docs/screens/feedback-button.png) | [#26](https://github.com/Hitoshi85/train-simulator/pull/26) |
| 2026-11-08 | In-project PR review: a Claude thread reviews each PR's diff and posts a verdict; the merge queue waits for a PASS. The API-key review workflow is removed. Process: [docs/REVIEW.md](docs/REVIEW.md) | [#27](https://github.com/Hitoshi85/train-simulator/pull/27) |
| 2026-11-08 | Progress saved on the device: best score and rank per mode, mode and sound settings, and resume a run from the last station (Continue or New run on the title). Versioned save format for later cloud accounts. Preview: [docs/screens/save-progress.png](docs/screens/save-progress.png) | [#28](https://github.com/Hitoshi85/train-simulator/pull/28) |
| 2026-11-08 | The dev site keeps its own save, apart from prod (both share one web origin) | [#33](https://github.com/Hitoshi85/train-simulator/pull/33) |
| 2026-11-09 | Softer, more realistic power and brake sounds: modern inverter whine following speed, gentle air brakes (R26) | [#38](https://github.com/Hitoshi85/train-simulator/pull/38) |
| 2026-11-10 | Clarifying questions are batched: all of a feature's questions go out together in one message, each with 3 options and the recommendation first (W2, CLAUDE.md step 2). Closes #43 | [#50](https://github.com/Hitoshi85/train-simulator/pull/50) |
