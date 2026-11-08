// Unit tests for the merge queue rules in .github/scripts/merge-queue.js (no browser needed).
const { test, expect } = require('@playwright/test');
const q = require('../.github/scripts/merge-queue.js');

const REPO = 'Hitoshi85/train-simulator';
const pr = (over = {}) => ({
  draft: false,
  base: { ref: 'main' },
  head: { repo: { full_name: REPO } },
  labels: [],
  body: '## What changed\n\n![Express board](https://github.com/user-attachments/assets/abc.png)',
  ...over,
});
const files = (lines, name = 'game.js') => [{ filename: name, additions: lines, deletions: 0 }];

test('screenshot detection', () => {
  expect(q.hasScreenshot('![shot](https://x/y.png)')).toBe(true);
  expect(q.hasScreenshot('<img width="300" src="https://x/y.png">')).toBe(true);
  expect(q.hasScreenshot('No image here, see https://x/y.png')).toBe(false);
  expect(q.hasScreenshot('<!-- ![example](a.png) -->')).toBe(false);
  expect(q.hasScreenshot(null)).toBe(false);
});

test('size ignores lock files and images', () => {
  expect(q.changedLines([
    { filename: 'game.js', additions: 10, deletions: 5 },
    { filename: 'package-lock.json', additions: 5000, deletions: 0 },
    { filename: 'docs/screens/a.png', additions: 0, deletions: 0 },
  ])).toBe(15);
});

test('which PRs may merge on their own', () => {
  expect(q.eligibility(pr(), files(100), REPO).ok).toBe(true);
  expect(q.eligibility(pr({ draft: true }), files(100), REPO).ok).toBe(false);
  expect(q.eligibility(pr({ body: 'no picture' }), files(100), REPO).reason).toMatch(/screenshot/);
  expect(q.eligibility(pr({ labels: [{ name: 'hold' }] }), files(100), REPO).reason).toMatch(/hold/);
  expect(q.eligibility(pr({ head: { repo: { full_name: 'someone/fork' } } }), files(100), REPO).ok).toBe(false);
  expect(q.eligibility(pr(), files(10, '.github/workflows/ci.yml'), REPO).reason).toMatch(/owner merges/);
  // Small PRs only (owner's choice, 2026-11-08); the automerge label lets a big one in.
  expect(q.eligibility(pr(), files(q.MAX_CHANGED_LINES), REPO).ok).toBe(true);
  const big = files(q.MAX_CHANGED_LINES + 1);
  expect(q.eligibility(pr(), big, REPO).reason).toMatch(/limit/);
  expect(q.eligibility(pr({ labels: [{ name: 'automerge' }] }), big, REPO).ok).toBe(true);
});

test('check states', () => {
  const ok = (name, id = 1) => ({ id, name, status: 'completed', conclusion: 'success' });
  expect(q.checksState([ok(q.REQUIRED_CHECK), ok('Claude review', 2)])).toBe('success');
  expect(q.checksState([ok('Claude review')])).toBe('missing');
  expect(q.checksState([ok(q.REQUIRED_CHECK), { id: 2, name: 'Claude review', status: 'in_progress' }])).toBe('pending');
  expect(q.checksState([{ id: 1, name: q.REQUIRED_CHECK, status: 'completed', conclusion: 'failure' }])).toBe('failure');
  // A passing re-run replaces an earlier failure; the queue's own job is ignored.
  expect(q.checksState([
    { id: 1, name: q.REQUIRED_CHECK, status: 'completed', conclusion: 'failure' }, ok(q.REQUIRED_CHECK, 5),
    { id: 9, name: 'Merge queue', status: 'in_progress' },
  ])).toBe('success');
});
