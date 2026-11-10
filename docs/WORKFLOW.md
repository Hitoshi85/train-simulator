# How the agentic dev loop works

1. **Backlog with a veto window.** Work lives in GitHub Issues labelled `task`. Each has a goal and a
   **Done when** checklist. The owner files issues and approves them with the `ready` label, or
   Claude proposes them with the `proposed` label (from the chat or a thread; the coordinator lists
   new ones once a day). A `proposed` task becomes `ready` on its own after **36 hours** unless the
   owner vetoes it: a `hold` label, a comment starting with "no" or "drop", or "drop #N" in the
   project chat (the coordinator then closes it as not planned). At most 3 tasks are promoted a day,
   oldest first. Tasks that change controls, game modes, the real-world route or prod get
   `needs-yes` and stay `proposed` until the owner says yes. The daily backlog run
   (`.github/workflows/daily.yml`, 07:00 Japan time, rules in `.github/scripts/daily.js`, tested in
   `tests/daily.spec.js`) does the promotion.
2. **One thread per issue.** Claude picks up a `ready` issue, branches from `main`, implements it,
   runs `npm run check`, and opens a PR with `Closes #N`. Independent issues run in parallel.
3. **CI gate.** `.github/workflows/ci.yml` runs on every PR: ESLint, then a headless Chromium
   smoke test that loads the game, drives the train over the whole line with an autopilot, and
   fails on any page error, broken scoring, missing cats, or a stuck scenery cycle.
   Claude fixes failures and review comments until the PR is green.
4. **Merge queue.** `.github/workflows/merge-queue.yml` merges PRs on its own, one at a time,
   oldest first. A PR is in the queue when its description has a screenshot, it changes 800 lines or fewer
   (lock files and images not counted; an `automerge` label lets a bigger one in), it does not
   change `.github/workflows/`, and it has no `hold` label. For the PR at the head of the queue it
   waits for a passing **project review** of its latest commit (a Claude thread in the project reviews
   the diff and posts its verdict as a PR comment, see `docs/REVIEW.md`; docs-only PRs skip it),
   rebases onto `main` if needed, re-runs CI on the rebased commit, waits until every check
   has passed, then squash-merges it and deletes the branch. A PR with
   a failing check is skipped until fixed; one that cannot be rebased gets `queue-conflict`.
   The rules live in `.github/scripts/merge-queue.js` (tested in `tests/merge-queue.spec.js`).
5. **Deploy to dev, Ship to prod.** `.github/workflows/pages.yml` serves two copies of the game on
   one Pages site: **prod** at `https://hitoshi85.github.io/train-simulator/` and **dev** at
   `https://hitoshi85.github.io/train-simulator/dev/` (marked with a "DEV <commit>" tag and title). A merge to `main`
   re-runs the checks and updates dev only; prod is rebuilt from the `prod` git tag. Each site has a
   `version.json` with its commit. The build (`.github/scripts/build-site.sh`) loads `game.js`, every
   module in `src/` and `style.css` as `?v=<commit>` and adds a tiny check that reloads the page once when `version.json`
   shows a newer deploy, so phones get the latest version without a hard refresh. Then **verify-live** checks both live sites serve the right commit
   and that the game starts. The **links** job then updates the version labels next to the prod and dev links at the top of
   `README.md` and comments the dev link (with `?v=<short-sha>`) on the merged PR.
   - **Ship:** when the owner types "Ship", Claude runs the workflow with action `ship` (Actions →
     Deploy to GitHub Pages → Run workflow). It tags the commit dev serves as the next `prod-N`,
     publishes a GitHub release with notes since the last one, and moves the `prod` tag.
   - **Rollback:** when the owner types "Rollback", Claude runs the workflow with action `rollback` and
     an empty tag, which puts prod back on the release before the current one; "Rollback to prod-N"
     names the release instead. It skips the test run, so prod switches in about a minute. verify-live
     then checks prod serves that release's commit and reports its `prod-N` in `version.json`, and the
     README label follows. Dev is not touched by Ship or rollback.
6. **Daily review and Friday report.** A scheduled Claude task reviews every unreviewed PR once a day
   at 05:47 Japan time and marks big `proposed` tasks `needs-yes` (see docs/REVIEW.md). On Fridays the
   daily backlog run also opens a `report` issue, "Weekly report, week to <date>": what shipped to dev,
   what is proposed, what is blocked or waiting (`hold`, `needs-yes`, `queue-conflict`), the current
   play links, and four numbers: Hitoshi's messages per shipped PR (rows in the REQUIREMENTS.md
   feedback log), PRs merged by the queue with no "m", median lead time from `ready` to dev, and the
   share of PRs that change what players see or hear. The coordinator summarises it in the chat. Run
   the workflow by hand with "report" ticked to write one early.
7. **Feedback.** Playtest notes go in a `feedback` issue (or a chat message); Claude turns them into
   new `task` issues.

## One-time repo settings (owner)

- Settings → Pages → Source: **GitHub Actions** (so deploys go through the tested workflow).
- Settings → Branches → protect `main`: require the **Lint and smoke test** check to pass. Do not
  require approving reviews (the queue cannot approve its own merges).
- Settings → Actions → General → Workflow permissions: **Read and write permissions** (the queue
  rebases branches, merges and starts workflows with the built-in token).
- Settings → General → Pull Requests: tick **Automatically delete head branches** (optional).
- Create labels `task`, `ready`, `feedback`, `hold`, `automerge`, `queue-conflict` (the daily run adds
  `proposed`, `needs-yes` and `report` itself).
