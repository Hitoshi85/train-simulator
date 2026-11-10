// Lint checks for REQUIREMENTS.md, the shared requirements and feedback log (no browser needed).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const log = read('REQUIREMENTS.md');
const MAX_FEEDBACK_ROWS = 20;

// True on main: CI pushes to main, or a local checkout of main. PR branches may still say "this PR";
// the merge queue swaps it for the PR number when it merges.
function onMain() {
  if (process.env.GITHUB_REF) return process.env.GITHUB_REF === 'refs/heads/main';
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: root }).toString().trim() === 'main';
  } catch {
    return false;
  }
}

// The table rows of one "## N. Title" section.
function rows(title) {
  const m = log.match(new RegExp(`\\n## \\d+\\. ${title}\\n([\\s\\S]*?)(?=\\n## |$)`));
  expect(m, `section "${title}"`).toBeTruthy();
  return m[1].split('\n').filter((l) => /^\| \d{4}-\d{2}-\d{2} \|/.test(l));
}

test('no "this PR" placeholders left on main', () => {
  test.skip(!onMain(), 'only enforced on main; the merge queue fills in the number on merge');
  for (const f of ['REQUIREMENTS.md', 'docs/feedback-archive.md']) {
    const left = read(f).split('\n').filter((l) => /\bthis PR\b/i.test(l));
    expect(left, `${f} still says "this PR"; use the PR number`).toEqual([]);
  }
});

test('requirement numbers are in order with no gaps', () => {
  for (const kind of ['R', 'W']) {
    const nums = [...log.matchAll(new RegExp(`^\\| ${kind}(\\d+) \\|`, 'gm'))].map((m) => Number(m[1]));
    expect(nums.length, `${kind} rules`).toBeGreaterThan(0);
    expect(nums, `${kind} rules must run ${kind}1, ${kind}2, ... in order`).toEqual(nums.map((_, i) => i + 1));
  }
});

test('play links match README', () => {
  const block = read('README.md').match(/<!-- play-links:start -->([\s\S]*?)<!-- play-links:end -->/);
  expect(block, 'README play-links block').toBeTruthy();
  const links = (text) => [...new Set(text.match(/https:\/\/hitoshi85\.github\.io\/train-simulator\/[^\s)`]*/g) || [])]
    .map((u) => u.replace(/\?v=.*$/, '')).sort();
  const header = log.split('\n## ')[0].split('\n').filter((l) => /\*\*Play /.test(l)).join('\n');
  expect(links(header).length).toBeGreaterThan(0);
  expect(links(header)).toEqual(links(block[1]));
});

test(`feedback log keeps only the latest ${MAX_FEEDBACK_ROWS} rows`, () => {
  const fb = rows('Feedback log');
  expect(fb.length, `move the oldest rows to docs/feedback-archive.md`).toBeLessThanOrEqual(MAX_FEEDBACK_ROWS);
  const dates = fb.map((l) => l.slice(2, 12));
  expect(dates, 'feedback rows are oldest first').toEqual([...dates].sort());
});
