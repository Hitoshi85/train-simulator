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
5. **Deploy and live check.** `.github/workflows/pages.yml` re-runs the checks on `main`, publishes
   the game files plus a `version.json` with the commit SHA, then **verify-live** waits until the
   live site serves that commit, loads the live game in a headless browser, and comments the play
   link for mobile, `https://hitoshi85.github.io/train-simulator/?v=<short-sha>`, on the merged PR.
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
