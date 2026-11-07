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
4. **Review and merge.** The owner reviews and merges. Auto-merge is off unless the owner turns it
   on for a specific PR or label.
5. **Deploy.** `.github/workflows/pages.yml` re-runs the checks on `main` and publishes the game
   files to GitHub Pages. Claude then shares the latest play link for mobile,
   `https://hitoshi85.github.io/train-simulator/?v=<short-sha>`, so phones skip any cached copy.
6. **Feedback.** Playtest notes go in a `feedback` issue (or a chat message); Claude turns them into
   new `task` issues.

## One-time repo settings (owner)

- Settings → Pages → Source: **GitHub Actions** (so deploys go through the tested workflow).
- Settings → Branches → protect `main`: require the **Lint and smoke test** check to pass.
- Create labels `task`, `ready`, `feedback`.
