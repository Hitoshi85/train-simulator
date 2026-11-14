# Project review: how a Claude in the project reviews each PR

No separate setup and no API key: a Claude thread in the project (the **PR reviewer** thread) reviews
every PR, and the merge queue waits for its verdict. Hitoshi never has to review small PRs.

## When a review happens

1. **Daily, on a schedule.** A scheduled Claude task ("Aozora Line daily PR review") starts a fresh
   run every day at 7:00 New York time. It reviews every open PR whose head commit has no
   `project-review` verdict yet, following this page, and marks big `proposed` tasks `needs-yes`
   (see docs/WORKFLOW.md). Nobody has to ask for these reviews.
2. **Urgent, by request.** When a PR should not wait for the next daily run, its thread can still tell
   the coordinator `Review #N please (head <short sha>)`, and the coordinator passes it to the PR
   reviewer thread (it starts one if none is open).
3. PRs that change only Markdown files, `docs/` or images need no review: the queue lets them through.

## How the reviewer works (keep it cheap)

- Read **only the diff** (`pull_request_read` with method `get_diff`, or `git diff origin/main...<branch>`).
  Open surrounding code only when a changed line cannot be judged without it.
- Look only for real problems: bugs, crashes, broken game logic, things that break on phones (touch,
  small screens), slow per-frame drawing, broken tests or the `window.__train` test hook, a missing
  `?v=N` bump in `index.html` when `game.js`, `src/` or `style.css` changed, and anything copied from a
  commercial train game. Skip style nitpicks.
- Post **one** PR comment: a short, friendly summary (a line per finding with `file:line`, or
  "No problems found."), ending with the verdict marker for the PR's current head commit:

  ```
  <!-- project-review: PASS <full head sha> -->
  ```

  Use `BLOCK` instead of `PASS` only for a must-fix problem, and say what to fix.
- On `BLOCK`, the reviewer also tells the coordinator, so the PR's own thread fixes it and asks for
  a new review. Nits never block.

## AI playtest for PRs that touch `game.js`, `src/` or `style.css`

The reviewer judges how the change looks and plays, not only whether the code works. From the PR's
latest **CI** run (`actions_list` → the run's artifacts, then download):

- **Screenshots:** open `phone-screenshots` (this PR) and `phone-screenshots-main` (the same shots
  taken on `main`) side by side: portrait and landscape, title and mid-run. Look for broken visuals:
  blank or black areas, overlapping or cut-off text and buttons, missing train, track or HUD.
  Intended changes that the PR describes are fine.
- **Balance:** read the "AI playtest: balance per station" table in the run's job summary (also the
  `balance` artifact, `balance.json`). Three imperfect drivers (late, early, noisy) play Local and
  Express; each cell shows points, stop error and time margin. Mention big swings in a line.
- **Block only** for broken visuals or a station made impossible (marked ⚠️, every driver overran it
  or scored nothing; the balance test also fails CI then). Everything else is a note, not a block.
- One reviewer only: no second fresh-session review.

## How the merge queue uses it

`.github/scripts/merge-queue.js` (`reviewState`) reads the PR's comments. The newest verdict for the
**current head commit** counts, so every new push needs a new review. Only comments by the owner's
account (which the project's Claude posts as), repo members or the queue itself count. When the queue
rebases a reviewed PR onto `main`, it posts the verdict for the rebased commit itself, since a rebase
only replays the reviewed change. A `BLOCK` keeps the PR out of the queue until a new `PASS`.
