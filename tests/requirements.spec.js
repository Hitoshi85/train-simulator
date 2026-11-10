// Lint checks for REQUIREMENTS.md, the shared requirements and feedback log (no browser needed).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const log = read('REQUIREMENTS.md');
const MAX_FEEDBACK_ROWS = 20;

// The table rows of one "## N. Title" section.
function rows(title) {
  const m = log.match(new RegExp(`\\n## \\d+\\. ${title}\\n([\\s\\S]*?)(?=\\n## |$)`));
  expect(m, `section "${title}"`).toBeTruthy();
  return m[1].split('\n').filter((l) => /^\| \d{4}-\d{2}-\d{2} \|/.test(l));
}

// Checked on every branch, so a placeholder can never reach main (PRs merged by hand included).
test('no "this PR" placeholders', () => {
  for (const f of ['REQUIREMENTS.md', 'docs/feedback-archive.md']) {
    const left = read(f).split('\n').filter((l) => /\bthis PR\b/i.test(l));
    expect(left, `${f} says "this PR"; write the PR number once the PR is open`).toEqual([]);
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
