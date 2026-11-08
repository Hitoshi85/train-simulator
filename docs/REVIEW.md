# Project review: how a Claude in the project reviews each PR

No separate setup and no API key: a Claude thread in the project (the **PR reviewer** thread) reviews
every PR, and the merge queue waits for its verdict. Hitoshi never has to review small PRs.

## When a review happens

1. A thread opens a PR or pushes new commits to it, and tells the coordinator in one line:
   `Review #N please (head <short sha>)`.
2. The coordinator passes it to the PR reviewer thread (it starts one if none is open).
3. PRs that change only Markdown files, `docs/` or images need no review: the queue lets them through.

## How the reviewer works (keep it cheap)

- Read **only the diff** (`pull_request_read` with method `get_diff`, or `git diff origin/main...<branch>`).
  Open surrounding code only when a changed line cannot be judged without it.
- Look only for real problems: bugs, crashes, broken game logic, things that break on phones (touch,
  small screens), slow per-frame drawing, broken tests or the `window.__train` test hook, a missing
  `?v=N` bump in `index.html` when `game.js` or `style.css` changed, and anything copied from a
  commercial train game. Skip style nitpicks.
- Post **one** PR comment: a short, friendly summary (a line per finding with `file:line`, or
  "No problems found."), ending with the verdict marker for the PR's current head commit:

  ```
  <!-- project-review: PASS <full head sha> -->
  ```

  Use `BLOCK` instead of `PASS` only for a must-fix problem, and say what to fix.
- On `BLOCK`, the reviewer also tells the coordinator, so the PR's own thread fixes it and asks for
  a new review. Nits never block.

## How the merge queue uses it

`.github/scripts/merge-queue.js` (`reviewState`) reads the PR's comments. The newest verdict for the
**current head commit** counts, so every new push needs a new review. Only comments by the owner's
account (which the project's Claude posts as), repo members or the queue itself count. When the queue
rebases a reviewed PR onto `main`, it posts the verdict for the rebased commit itself, since a rebase
only replays the reviewed change. A `BLOCK` keeps the PR out of the queue until a new `PASS`.
