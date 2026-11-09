# Aozora Line: getting more from agentic AI

Nov 8, 2026 · @Hitoshi

## Summary

You are already well ahead of typical agentic use: 39 PRs in about 31 hours, auto-merge, an AI reviewer, dev/prod with Ship and Rollback, and a living requirements log. What still holds the system back is that **you are the scheduler, the product manager and the only judge of quality**. Claude builds well but waits for you to start each piece of work, answer its questions and tell it whether the game got better.

Your stated goals for this review:

- **Less of your time.** You are happy to hand over the backlog, not just small decisions.
- **Claude runs the backlog.** It turns feedback and its own ideas into tasks and builds them unless you object.
- **AI playtesting on feature PRs.** Claude should look at the screenshots and check balance, not only correctness.

The five changes that matter most, in order:

1. **Scheduled Claude runs** that triage feedback, propose tasks with a 24-hour veto window, review PRs and run a weekly report. This replaces you typing "Review #N please" and approving backlog items one by one.
2. **A narrower question rule (W2).** Claude decides small, reversible choices on dev by itself and shows a screenshot. It asks you only about taste-defining or prod-facing choices.
3. **AI playtest in review.** The reviewer views the CI phone screenshots and reads a balance report from a new headless test.
4. **Smaller context.** Split `game.js` (98 KB, about 25k tokens) into native ES modules and slim `REQUIREMENTS.md` (32 KB and growing with every PR). Parallel threads stop colliding and sessions get cheaper.
5. **Test the deploy workflow itself.** The Ship bug fixed in #39 reached prod because nothing tests `pages.yml`.

## What the repo shows

About half of all PRs went into the delivery machine rather than the game, and every step still started with a message from you. Figures below come from the repo at commit `1f81731` (8 Nov 2026).

| Signal | What I found | Why it matters |
| --- | --- | --- |
| Pace | 35 commits, PRs #1 to #39, from 13:00 on 7 Nov to 20:17 on 8 Nov | Claude can build fast; it waits for input, not on the work |
| Game vs. process PRs | About 16 player-facing PRs (cats, cameras, gradients, Express, painted look, weather, saves, sounds) and about 15 on process or infra (CI, queue, review, dev/prod, README links, fixes) | On day 2, only 3 of 11 PRs (#26, #28, #38) changed the game |
| Your touchpoints | The feedback log has 55 rows. Most are answers to one-at-a-time questions, "m" merges, backlog approvals and "Ship" | Each one is a round trip where work stops until you reply |
| Review trigger | A thread must tell the coordinator `Review #N please`, which is relayed to a reviewer thread (docs/REVIEW.md) | A chat relay, not an event. Reviews wait for an active session |
| Reviewer scope | It reads only the diff; it does not look at the phone screenshots CI already produces | Visual quality is the heart of this game, and nobody but you looks at it |
| Tests | 43 Playwright tests: autopilot over the whole line, physics, phone layout, a 16 ms frame budget, saves, merge-queue rules | Strong correctness net; nothing measures fun, difficulty or visual regressions |
| Workflow tests | `merge-queue.js` is unit-tested; the Ship/Rollback logic inline in `pages.yml` is not | The Ship run skipped its live check in prod (fixed in #39) |
| Context size | `game.js` 98 KB in one file; `REQUIREMENTS.md` 32 KB; CLAUDE.md 5.5 KB | Every thread loads tens of thousands of tokens, and parallel threads edit the same two files |
| Log hygiene | 16 rows still say "this PR" instead of a PR number; W15 sits after W18; W6 still shows the pre-dev/prod link | An agent-maintained log drifts without a check |
| Backlog | 0 open issues; ideas parked in section 5; the daily grooming routine was dropped | When you stop typing, the project stops |

## Scorecard

The build-and-ship half is strong; deciding what to build and judging the result are still manual. Scores run from 1 (manual) to 5 (fully agentic).

| Area | Score | Strength | Gap |
| --- | --- | --- | --- |
| Instructions and memory | 4 | CLAUDE.md, a test hook spec, REQUIREMENTS.md as shared memory, standing rules W1–W18 | Memory files keep growing and drifting; nothing checks them |
| Build | 4 | Issue-driven threads, small PRs, subagents in parallel, screenshots in every PR | One 98 KB file limits real parallel work and makes every session expensive |
| Verify | 4 | Lint, autopilot, phone layout, frame budget, live check after deploy | No visual or balance judgement; deploy workflow logic untested |
| Review | 3 | An AI reviewer with a PASS/BLOCK gate the queue enforces | Started by a chat relay; the same model reviews what it wrote; it sees only the diff |
| Merge and deploy | 5 | Merge queue, dev/prod, Ship, one-minute Rollback, self-updating README links | Nothing important missing |
| Planning and backlog | 2 | Clean issue templates; one-at-a-time questions with options | You start every task; no scheduled triage; empty backlog means idle |
| Feedback from players | 2 | In-game button opens a prefilled GitHub issue with context | Needs a GitHub account; no agent processes these issues automatically |
| Measurement | 1 | Frame times in the CI summary | No numbers on your time, lead time, or how players actually play |

## Ranked recommendations

The first three remove most of your round trips; the rest make that autonomy safe and cheaper. Each one is drafted as an issue in the next section.

| # | Change | What you stop doing | Effort |
| --- | --- | --- | --- |
| 1 | Scheduled Claude runs (A) | Typing review requests, approving each backlog item, relaying feedback | S |
| 2 | Veto-window backlog (B) | Adding `ready` to every task | S |
| 3 | Narrower question rule (C) | Answering 1–3 questions per feature | S |
| 4 | AI playtest on feature PRs (D) | Opening dev on your phone to judge every change | M |
| 5 | Split `game.js` into modules (E) | Nothing directly; fewer queue conflicts and cheaper threads | M |
| 6 | Slim and auto-check REQUIREMENTS.md (F) | Spotting stale rows yourself | S |
| 7 | Test the deploy workflow (G) | Finding Ship/Rollback bugs in prod | S |
| 8 | Weekly report and metrics (H) | Asking "where are we?" | S |

### 1. Scheduled Claude runs instead of chat relays

Claude can run on a schedule as a fresh session in this cloud environment, with no API key and no extra setup in GitHub. Three scheduled tasks cover what you now trigger by hand:

- **Reviewer, hourly.** Finds open PRs whose head commit has no `project-review` verdict and reviews them. No more `Review #N please`.
- **Triage, daily.** Reads new `feedback` issues and parked ideas, merges duplicates and drafts `task` issues.
- **Builder, every few hours.** Picks the oldest `ready` task and opens a PR. Your merge queue does the rest.

Keep your rule that you talk to one orchestrator: the scheduled runs post to GitHub, and the orchestrator summarises.

### 2. Backlog with a veto window

You chose to hand over the backlog, so flip the default from "wait for approval" to "go unless stopped". The triage run labels new tasks `proposed`. After 24 hours without a `hold` label or a "no" comment from you, it becomes `ready`. Your W10 rule (an option to remove) becomes a single reply: "drop #N". Cap it at 3 auto-approved tasks a day so a bad idea can't snowball.

### 3. Ask fewer, better questions

W2 now applies to every change, so a sound tweak costs as many round trips as a new mode. Dev and one-minute Rollback make most choices cheap to undo. Proposed rule:

- **Decide and show:** reversible choices on dev (colours, sound levels, layout details). Claude picks its recommended option, logs it as "Claude's call" and puts the screenshot in the PR so you can veto.
- **Ask first:** anything that changes the game's identity (new modes, real-world locations, controls), touches prod, or costs money.
- **Batch:** when several questions are needed, send them together in one message, each still with 3 options and a recommendation.

### 4. AI playtest on feature PRs

As you chose, add it to feature PRs only (any PR touching `game.js` or `style.css`):

- **Look:** the reviewer opens the `phone-screenshots` artifact and compares it with the same shots from `main`. It flags clipped buttons, unreadable text, a scene that got darker or emptier, or anything that looks off-style.
- **Balance:** a new `tests/balance.spec.js` drives the line many times with imperfect autopilots (late braking, early braking, random notch noise). It writes a table of score spread, overruns and timetable margin per station to the CI summary. The reviewer blocks only on big swings, such as a station that becomes impossible to hit on time.
- **Fresh eyes:** for big features, use a separate reviewer session that has not seen the build thread. That way the work isn't grading itself.

### 5. Split game.js into native modules

The game is one 98 KB file with about 80 functions. Native `<script type="module">` keeps your "no build step" rule. Split it into `route.js`, `physics.js`, `audio.js`, `save.js`, `ui.js` and `render/` (sky, scenery, train, cameras, weather). Gains: two threads can work at once without rebase conflicts, and a sound fix loads 5 KB of context instead of 98 KB. Keep `window.__train` as is so all tests still pass.

### 6. Slim and check REQUIREMENTS.md

- Keep sections 1 (requirements) and 4 (backlog) as they are.
- Generate "Shipped changes" from merged PR titles; your `prod-N` releases already have generated notes.
- Move older feedback-log rows to `docs/feedback-archive.md`. Agents read only the last 20 rows.
- Add a lint test: no "this PR" left on `main`, W-rules in order, links match README.

### 7. Test the deploy workflow

Move the `plan` step of `pages.yml` into `.github/scripts/plan.sh` and unit-test deploy, ship and rollback against a throwaway git repo, the same way `merge-queue.js` is tested. Add `actionlint` to CI. This is the class of bug behind #34 and #39.

### 8. Weekly report

A Sunday scheduled run posts one short issue or chat note: what shipped, what is proposed, what was blocked, and four numbers. The numbers are listed in the last section.

## Ready-to-paste task issues

Each block follows your `task` issue form (Goal, Done when, Notes, Size). Paste them into the project chat with "file these", or open them yourself. A, B, C and F are good first picks: they only change rules and docs.

```markdown
### A. Scheduled Claude runs for review, triage and building
**Goal:** Work starts and gets reviewed without a chat message from Hitoshi.
**Done when:**
- [ ] Hourly scheduled task reviews every open PR whose head has no project-review verdict, following docs/REVIEW.md
- [ ] Daily scheduled task turns new `feedback` issues into `task` issues (see B) and comments on each feedback issue with the link
- [ ] Scheduled builder picks the oldest `ready` task every 4 hours and opens a PR, max 2 open PRs at a time
- [ ] docs/REVIEW.md and docs/WORKFLOW.md describe the schedule; the "Review #N please" relay becomes optional
- [ ] REQUIREMENTS.md W13 and W15 updated
**Notes:** Scheduled runs start fresh sessions, so each prompt must be self-contained and point at CLAUDE.md. They need GitHub access to this repo.
**Size:** S
```

```markdown
### B. Backlog runs itself with a 24-hour veto window
**Goal:** Hitoshi no longer approves each task; he only stops the ones he doesn't want.
**Done when:**
- [ ] New label `proposed`; triage files tasks with it and pings the orchestrator once a day with the list
- [ ] A `proposed` task with no `hold` label and no "no"/"drop" comment from Hitoshi after 24 h gets `ready`
- [ ] At most 3 tasks auto-approved per day; anything that changes controls, modes, the real-world route or prod stays `proposed` until Hitoshi says yes
- [ ] "drop #N" in chat closes the issue as not planned (keeps W10)
- [ ] merge-queue-style unit test for the promotion rule
**Size:** S
```

```markdown
### C. Narrower clarifying-question rule
**Goal:** Fewer round trips per feature without losing Hitoshi's say on what matters.
**Done when:**
- [ ] CLAUDE.md step 2 and W2 rewritten: decide-and-show for reversible dev choices; ask first for game identity, prod or cost; batch several questions in one message, each with 3 options and a recommendation
- [ ] Feedback log gets an "Outcome: Claude's call, veto by replying" pattern
- [ ] PR template has a "Decisions Claude made" section
**Size:** S
```

```markdown
### D. AI playtest on feature PRs
**Goal:** The reviewer judges how a change looks and plays, not only whether it works.
**Done when:**
- [ ] tests/balance.spec.js runs 3 imperfect autopilots (late, early, noisy) over Local and Express and writes a per-station table (score, stop error, time margin, overruns) to the CI job summary and balance.json artifact
- [ ] CI also uploads the same phone screenshots taken on main for comparison
- [ ] docs/REVIEW.md: for PRs touching game.js or style.css, the reviewer views both screenshot sets and the balance table; BLOCK only for broken visuals or a station made impossible
- [ ] Large features (>400 lines) get a second review from a session that did not build them
**Size:** M
```

```markdown
### E. Split game.js into native ES modules
**Goal:** Cheaper sessions and parallel threads that don't collide.
**Done when:**
- [ ] game.js split into modules under src/ (route, physics, audio, save, ui, render/*), loaded with <script type="module">, no build step
- [ ] window.__train unchanged; all 43 tests pass unchanged
- [ ] build-site.sh versions every module (?v=<commit>) and the reload check still works
- [ ] 16 ms phone frame budget still met
- [ ] CLAUDE.md lists which module owns what
**Notes:** Pure refactor, no gameplay change. Over 800 lines, so it needs Hitoshi's "m".
**Size:** M
```

```markdown
### F. Slim REQUIREMENTS.md and check it in CI
**Goal:** The shared record stays accurate and small enough to load every session.
**Done when:**
- [ ] "Shipped changes" generated from merged PR titles by the deploy workflow (or replaced by a link to releases)
- [ ] Feedback-log rows older than the latest 20 moved to docs/feedback-archive.md
- [ ] Every "this PR" replaced with its PR number; the queue fills it in on merge from now on
- [ ] A lint test fails on "this PR" on main, W-rules out of order, or play links that differ from README
**Size:** S
```

```markdown
### G. Test the deploy workflow logic
**Goal:** Ship and Rollback bugs are caught in CI, not in prod.
**Done when:**
- [ ] The plan step of pages.yml moves to .github/scripts/plan.sh
- [ ] tests/plan.spec.js covers deploy, first deploy, ship, ship when already prod, rollback, rollback to prod-N, no earlier release, unreadable dev version
- [ ] actionlint runs in CI on .github/workflows/
**Notes:** Changes .github/workflows/, so it waits for Hitoshi's "m".
**Size:** S
```

```markdown
### H. Weekly report
**Goal:** Hitoshi sees progress once a week without asking.
**Done when:**
- [ ] Sunday scheduled task posts a short report: shipped, proposed, blocked, and the 4 metrics in the analysis doc
- [ ] The report links the current prod and dev play links
**Size:** S
```

## What stays with you, and how to measure it

After these changes, your job is to set direction, veto, and say "Ship". Claude handles the rest.

- **Stays with you:** Ship to prod, big-identity choices (new modes, routes, controls), merging PRs over 800 lines or that change workflows, and anything that costs money.
- **Moves to Claude:** reviews, triage, task creation, small taste calls on dev, and judging visuals and balance.

Track four numbers in the weekly report. Compare the first two weeks with the 55 log rows from 7–8 Nov:

| Metric | How it's counted | Target |
| --- | --- | --- |
| Your messages per shipped PR | Feedback-log rows from Hitoshi ÷ merged PRs | Below 0.5 |
| PRs merged with no human message | Merged PRs with no chat or comment from Hitoshi between issue and merge | Over 60% |
| Lead time | Issue becomes `ready` → live on dev | Under 4 hours |
| Player-facing share | Merged PRs that change game.js or style.css | Over 60% |

One caution: more autonomy means more unreviewed taste choices on dev. Play dev briefly before each Ship. Rollback keeps the cost of a miss to about a minute.
