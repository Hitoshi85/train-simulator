# How the agentic dev loop works

1. **Backlog.** Work lives in GitHub Issues labelled `task`. Each has a goal and a
   **Done when** checklist. The owner files issues (or asks Claude to draft them) and approves
   them by adding the `ready` label.
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
   `version.json` with its commit. The build (`.github/scripts/build-site.sh`) loads `game.js` and
   `style.css` as `?v=<commit>` and adds a tiny check that reloads the page once when `version.json`
   shows a newer deploy, so phones get the latest version without a hard refresh. Then **verify-live** checks both live sites serve the right commit
   and that the game starts. The **links** job then rewrites the play links in `README.md` (with
   `?v=<short-sha>` to skip phone caches) and comments the dev link on the merged PR.
   - **Ship:** when the owner types "Ship", Claude runs the workflow with action `ship` (Actions →
     Deploy to GitHub Pages → Run workflow). It tags the commit dev serves as the next `prod-N`,
     publishes a GitHub release with notes since the last one, and moves the `prod` tag.
   - **Rollback:** run it with action `rollback` (optionally naming a `prod-N` tag; empty means the
     release before the current one). Dev is not touched by Ship or rollback.
6. **Feedback.** Playtest notes go in a `feedback` issue (or a chat message); Claude turns them into
   new `task` issues.

## One-time repo settings (owner)

- Settings → Pages → Source: **GitHub Actions** (so deploys go through the tested workflow).
- Settings → Branches → protect `main`: require the **Lint and smoke test** check to pass. Do not
  require approving reviews (the queue cannot approve its own merges).
- Settings → Actions → General → Workflow permissions: **Read and write permissions** (the queue
  rebases branches, merges and starts workflows with the built-in token).
- Settings → General → Pull Requests: tick **Automatically delete head branches** (optional).
- Create labels `task`, `ready`, `feedback`, `hold`, `automerge`, `queue-conflict`.
