// Merge queue for Aozora Line, run by .github/workflows/merge-queue.yml through actions/github-script.
//
// Each run looks at open PRs into main, oldest first, and works on the first one that may merge
// on its own (see `eligibility`: small, with a screenshot, no `hold` label, no workflow changes):
//   - behind main      -> rebase it onto main, re-run CI on the new commit, and wait
//   - checks running   -> wait (the next run picks it up again)
//   - a check failed   -> skip it for now and move on to the next PR
//   - all checks green -> needs a passing project review of its head commit (see `reviewState`),
//                         then squash-merge it, deploy, and start the next run
// One PR at a time, in the order they were opened, so parallel work never lands untested on main.

const REQUIRED_CHECK = 'Lint and smoke test'; // the job in ci.yml; must be present and green
const MAX_CHANGED_LINES = 800;                // bigger PRs wait for the owner ("m"), unless labelled
const ALLOW_BIG_LABEL = 'automerge';          // lets a PR over the size limit into the queue
const HOLD_LABELS = ['hold', 'do-not-merge']; // keeps a PR out of the queue
const CONFLICT_LABEL = 'queue-conflict';      // set when the queue cannot rebase a PR
const QUEUE_WORKFLOW = 'merge-queue.yml';
const CI_WORKFLOW = 'ci.yml';
const DEPLOY_WORKFLOW = 'pages.yml';
const SELF_CHECKS = ['Merge queue'];          // our own job, never wait on it
// Not counted towards the size limit: lock files and images.
const SIZE_IGNORED = [/^package-lock\.json$/, /^docs\/screens\//, /\.(png|jpe?g|gif|webp)$/i];
// GITHUB_TOKEN may not push or merge workflow changes, and those deserve the owner's eyes anyway.
const OWNER_ONLY = [/^\.github\/workflows\//];

// Project review: a Claude thread in the project reads each PR's diff and posts a PR comment ending in
// `<!-- project-review: PASS <head sha> -->` (or BLOCK). Only comments by the owner's account, members
// or the queue itself count. PRs that only touch docs and images need no review. See docs/REVIEW.md.
const REVIEW_MARKER = /<!--\s*project-review:\s*(PASS|BLOCK)\s+([0-9a-f]{7,40})\s*-->/i;
const REVIEW_TRUSTED = ['OWNER', 'MEMBER', 'COLLABORATOR'];
const REVIEW_BOTS = ['github-actions[bot]'];
const NO_REVIEW_NEEDED = [/\.md$/i, /^docs\//, /\.(png|jpe?g|gif|webp)$/i];

// REQUIREMENTS.md may say "this PR" while a PR is open (its number is not known yet when it is written);
// after merging, the queue swaps each one for a link to the PR. tests/requirements.spec.js fails if any
// is left on main.
const LOG_FILE = 'REQUIREMENTS.md';
const THIS_PR = /\bthis PR\b/gi;

// Replaces every "this PR" in `text` with a link to PR `n`. Returns the text unchanged if there is none.
function fillPrNumber(text, n, repoFullName) {
  return text.replace(THIS_PR, `[#${n}](https://github.com/${repoFullName}/pull/${n})`);
}

const BAD = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale']);

// True when the PR description shows at least one image (Markdown or HTML).
function hasScreenshot(body) {
  if (!body) return false;
  const text = body.replace(/<!--[\s\S]*?-->/g, ''); // ignore commented-out template text
  return /!\[[^\]]*\]\(\s*\S+?\s*\)/.test(text) || /<img\b[^>]*\bsrc\s*=\s*["']?[^"'\s>]+/i.test(text);
}

// Lines changed, leaving out lock files and images.
function changedLines(files) {
  return files
    .filter((f) => !SIZE_IGNORED.some((re) => re.test(f.filename)))
    .reduce((n, f) => n + (f.additions || 0) + (f.deletions || 0), 0);
}

// Decides whether a PR may merge without the owner. Returns { ok, reason }.
function eligibility(pr, files, repoFullName) {
  const labels = (pr.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  if (pr.draft) return { ok: false, reason: 'draft' };
  if (pr.base.ref !== 'main') return { ok: false, reason: 'not into main' };
  if (!pr.head.repo || pr.head.repo.full_name !== repoFullName) return { ok: false, reason: 'from a fork' };
  const hold = labels.find((l) => HOLD_LABELS.includes(l));
  if (hold) return { ok: false, reason: `labelled ${hold}` };
  if (!hasScreenshot(pr.body)) return { ok: false, reason: 'no screenshot in the description' };
  const owner = files.find((f) => OWNER_ONLY.some((re) => re.test(f.filename)));
  if (owner) return { ok: false, reason: `changes ${owner.filename}, so the owner merges it` };
  const lines = changedLines(files);
  if (lines > MAX_CHANGED_LINES && !labels.includes(ALLOW_BIG_LABEL)) {
    return { ok: false, reason: `${lines} changed lines (limit ${MAX_CHANGED_LINES}), so the owner merges it` };
  }
  return { ok: true, reason: `${lines} changed lines with a screenshot` };
}

// True when every changed file is documentation or an image, so the PR needs no code review.
function docsOnly(files) {
  return files.length > 0 && files.every((f) => NO_REVIEW_NEEDED.some((re) => re.test(f.filename)));
}

// The project review verdict for a commit, from the PR's comments: 'pass', 'block' or 'missing'.
// The newest trusted verdict for that exact commit wins, so a new push needs a new review.
function reviewState(comments, sha) {
  let state = 'missing';
  for (const c of comments) {
    const trusted = REVIEW_TRUSTED.includes(c.author_association) || REVIEW_BOTS.includes(c.user && c.user.login);
    const m = trusted && REVIEW_MARKER.exec(c.body || '');
    if (m && sha.startsWith(m[2].toLowerCase())) state = m[1].toUpperCase() === 'PASS' ? 'pass' : 'block';
  }
  return state;
}

// Sums up the check runs on a commit: 'success', 'pending', 'failure' or 'missing'.
// Only the newest run of each check counts, so a passing re-run replaces an old failure.
function checksState(runs) {
  const latest = new Map();
  for (const r of runs) {
    if (SELF_CHECKS.includes(r.name)) continue;
    const prev = latest.get(r.name);
    if (!prev || r.id > prev.id) latest.set(r.name, r);
  }
  const list = [...latest.values()];
  if (list.some((r) => r.status === 'completed' && BAD.has(r.conclusion))) return 'failure';
  if (list.some((r) => r.status !== 'completed')) return 'pending';
  if (!latest.has(REQUIRED_CHECK)) return 'missing';
  return 'success';
}

async function run({ github, context, core }) {
  const { owner, repo } = context.repo;
  const full = `${owner}/${repo}`;
  const say = (msg) => core.info(msg);
  const summary = [];

  const prs = await github.paginate(github.rest.pulls.list, {
    owner, repo, state: 'open', base: 'main', sort: 'created', direction: 'asc', per_page: 100,
  });
  if (!prs.length) { say('No open PRs into main.'); return; }

  for (const listed of prs) {
    const n = listed.number;
    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: n });
    const files = await github.paginate(github.rest.pulls.listFiles, { owner, repo, pull_number: n, per_page: 100 });
    const el = eligibility(pr, files, full);
    summary.push(`#${n}: ${el.ok ? 'in queue' : 'not in queue'} (${el.reason})`);
    if (!el.ok) { say(`#${n} skipped: ${el.reason}`); continue; }

    const labels = pr.labels.map((l) => l.name);
    if (labels.includes(CONFLICT_LABEL)) { say(`#${n} skipped: ${CONFLICT_LABEL} (fix and remove the label)`); continue; }

    // 1. Make sure it is tested on top of the current main.
    const { data: cmp } = await github.rest.repos.compareCommitsWithBasehead({
      owner, repo, basehead: `${pr.base.ref}...${pr.head.sha}`,
    });
    const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number: n, per_page: 100 });
    const review = docsOnly(files) ? 'pass' : reviewState(comments, pr.head.sha);
    if (review === 'block') { say(`#${n}: the project review found a must-fix problem. Skipping until fixed.`); continue; }
    if (review === 'missing') { say(`#${n}: waiting for the project review of ${pr.head.sha.slice(0, 7)}.`); continue; }

    if (cmp.behind_by > 0) {
      say(`#${n} is ${cmp.behind_by} commit(s) behind main: rebasing.`);
      try {
        const res = await github.graphql(
          `mutation($id: ID!, $oid: GitObjectID!) {
             updatePullRequestBranch(input: {pullRequestId: $id, expectedHeadOid: $oid, updateMethod: REBASE}) {
               pullRequest { number headRefOid }
             }
           }`,
          { id: pr.node_id, oid: pr.head.sha },
        );
        // The rebase only replays the reviewed changes on top of main, so the review carries over.
        const newSha = res && res.updatePullRequestBranch.pullRequest.headRefOid;
        if (newSha && newSha !== pr.head.sha && !docsOnly(files)) {
          await github.rest.issues.createComment({
            owner, repo, issue_number: n,
            body: `Rebased onto \`main\` by the merge queue; the project review of ${pr.head.sha.slice(0, 7)} ` +
              `carries over.\n<!-- project-review: PASS ${newSha} -->`,
          });
        }
      } catch (e) {
        say(`#${n} could not be rebased: ${e.message}`);
        await github.rest.issues.addLabels({ owner, repo, issue_number: n, labels: [CONFLICT_LABEL] });
        await github.rest.issues.createComment({
          owner, repo, issue_number: n,
          body: `The merge queue could not rebase this PR onto \`main\` (likely a conflict). ` +
            `Rebase it by hand, push, then remove the \`${CONFLICT_LABEL}\` label to put it back in the queue.`,
        });
        continue;
      }
      // Pushes made with GITHUB_TOKEN start no workflows, so start CI on the rebased branch ourselves.
      await github.rest.actions.createWorkflowDispatch({ owner, repo, workflow_id: CI_WORKFLOW, ref: pr.head.ref });
      say(`#${n} rebased; CI started on ${pr.head.ref}. Waiting for it.`);
      break;
    }

    // 2. Look at the checks on its head commit.
    const runs = await github.paginate(github.rest.checks.listForRef, { owner, repo, ref: pr.head.sha, per_page: 100 });
    const state = checksState(runs);
    if (state === 'failure') { say(`#${n} has a failing check: skipping until it is fixed.`); continue; }
    if (state === 'missing') {
      const { data: wf } = await github.rest.actions.listWorkflowRuns({
        owner, repo, workflow_id: CI_WORKFLOW, head_sha: pr.head.sha, per_page: 1,
      });
      if (!wf.total_count) {
        await github.rest.actions.createWorkflowDispatch({ owner, repo, workflow_id: CI_WORKFLOW, ref: pr.head.ref });
        say(`#${n} had no CI run on ${pr.head.sha.slice(0, 7)}: started one.`);
      } else {
        say(`#${n}: CI is queued. Waiting.`);
      }
      break;
    }
    if (state === 'pending') { say(`#${n}: checks still running. Waiting.`); break; }

    // 3. Green, current and eligible: merge it.
    if (pr.mergeable === false) { say(`#${n}: GitHub reports it cannot merge. Skipping.`); continue; }
    await github.rest.pulls.merge({
      owner, repo, pull_number: n, sha: pr.head.sha, merge_method: 'squash',
      commit_title: `${pr.title} (#${n})`,
    });
    say(`#${n} merged.`);
    await github.rest.issues.createComment({
      owner, repo, issue_number: n,
      body: `Merged by the merge queue: checks green on top of \`main\`, project review passed, ${el.reason}. ` +
        `Deploying now; the play link follows once the live site serves this commit.`,
    });
    try {
      const { data: file } = await github.rest.repos.getContent({ owner, repo, path: LOG_FILE, ref: 'main' });
      const before = Buffer.from(file.content, 'base64').toString('utf8');
      const after = fillPrNumber(before, n, full);
      if (after !== before) {
        await github.rest.repos.createOrUpdateFileContents({
          owner, repo, path: LOG_FILE, branch: 'main', sha: file.sha,
          message: `Fill in PR #${n} in ${LOG_FILE} [skip ci]`,
          content: Buffer.from(after, 'utf8').toString('base64'),
        });
        say(`Filled in #${n} in ${LOG_FILE}.`);
      }
    } catch (e) { say(`${LOG_FILE} not updated: ${e.message}`); }
    try {
      await github.rest.git.deleteRef({ owner, repo, ref: `heads/${pr.head.ref}` });
    } catch (e) { say(`Branch not deleted: ${e.message}`); }
    // A merge made with GITHUB_TOKEN does not fire "push", so start the deploy and the next queue run.
    await github.rest.actions.createWorkflowDispatch({ owner, repo, workflow_id: DEPLOY_WORKFLOW, ref: 'main' });
    await github.rest.actions.createWorkflowDispatch({ owner, repo, workflow_id: QUEUE_WORKFLOW, ref: 'main' });
    break;
  }

  await core.summary.addHeading('Merge queue').addList(summary).write();
}

module.exports = {
  run, hasScreenshot, changedLines, eligibility, MAX_CHANGED_LINES, checksState, REQUIRED_CHECK, reviewState, docsOnly,
  fillPrNumber,
};
