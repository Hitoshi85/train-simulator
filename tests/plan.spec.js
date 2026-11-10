// Unit tests for .github/scripts/plan.sh, the step of pages.yml that decides which commit prod and
// dev serve for deploy, Ship and Rollback. Each test builds a throwaway git repository with its own
// commits and prod tags, serves a fake live dev/version.json, runs the script and reads its outputs,
// so a Ship or Rollback bug fails here instead of on the live site.
const { test, expect } = require('@playwright/test');
const { execFileSync, spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const PLAN = path.resolve(__dirname, '../.github/scripts/plan.sh');

function makeRepo(commits) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('config', 'commit.gpgsign', 'false');
  git('config', 'tag.gpgsign', 'false');
  const shas = [];
  for (let i = 0; i < commits; i += 1) {
    git('commit', '-q', '--allow-empty', '-m', `c${i}`);
    shas.push(git('rev-parse', 'HEAD'));
  }
  // Tags: { 'prod-1': 0, prod: 0 } points each tag at commit index.
  const tag = (tags) => Object.entries(tags).forEach(([name, i]) => git('tag', '-f', name, shas[i]));
  return { dir, shas, tag };
}

// Serves `body` as /dev/version.json (null: 404) and returns the site URL.
async function fakeSite(body) {
  const server = http.createServer((req, res) => {
    if (body !== null && req.url.startsWith('/dev/version.json')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

async function plan(repo, { action, rollbackTag = '', head = repo.shas.at(-1), devBody = null }) {
  const site = await fakeSite(devBody);
  const out = path.join(repo.dir, 'github-output');
  fs.writeFileSync(out, '');
  try {
    // Async so the fake site can answer the script's curl while it runs.
    const res = await new Promise((resolve) => {
      const child = spawn('bash', [PLAN], {
        cwd: repo.dir,
        env: {
          PATH: process.env.PATH, HOME: process.env.HOME,
          ACTION: action, ROLLBACK_TAG: rollbackTag, GITHUB_SHA: head, SITE: site.url, GITHUB_OUTPUT: out,
        },
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.on('data', (d) => { stderr += d; });
      child.on('close', (status) => resolve({ status, stdout, stderr }));
    });
    const outputs = Object.fromEntries(fs.readFileSync(out, 'utf8').trim().split('\n').filter(Boolean)
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
    return { ...res, log: res.stdout + res.stderr, outputs };
  } finally {
    site.close();
  }
}

test.describe('pages.yml plan step', () => {
  test.skip(spawnSync('bash', ['-c', 'command -v git && command -v curl && command -v jq']).status !== 0,
    'needs git, curl and jq');

  test('deploy puts the new commit on dev and keeps prod', async () => {
    const repo = makeRepo(3);
    repo.tag({ 'prod-1': 0, 'prod-2': 1, prod: 1 });
    const r = await plan(repo, { action: 'deploy' });
    expect(r.status, r.log).toBe(0);
    expect(r.outputs).toEqual({
      prod_sha: repo.shas[1], prod_tag: 'prod-2', dev_sha: repo.shas[2], new_release: 'false', prev_tag: 'prod-2',
    });
  });

  test('first deploy starts prod as prod-1 on the same commit', async () => {
    const repo = makeRepo(1);
    const r = await plan(repo, { action: 'deploy' });
    expect(r.status, r.log).toBe(0);
    expect(r.outputs).toEqual({
      prod_sha: repo.shas[0], prod_tag: 'prod-1', dev_sha: repo.shas[0], new_release: 'true', prev_tag: '',
    });
  });

  test('ship promotes exactly what dev serves as the next prod-N', async () => {
    const repo = makeRepo(4);
    repo.tag({ 'prod-1': 0, 'prod-2': 1, prod: 1 });
    // Dev serves commit 2, not the newest commit: Ship must take dev's commit.
    const r = await plan(repo, { action: 'ship', devBody: { sha: repo.shas[2], env: 'dev', tag: '' } });
    expect(r.status, r.log).toBe(0);
    expect(r.outputs).toEqual({
      prod_sha: repo.shas[2], prod_tag: 'prod-3', dev_sha: repo.shas[2], new_release: 'true', prev_tag: 'prod-2',
    });
  });

  test('ship numbers after the highest release, even after a rollback', async () => {
    const repo = makeRepo(4);
    repo.tag({ 'prod-1': 0, 'prod-2': 1, 'prod-10': 2, prod: 0 });
    const r = await plan(repo, { action: 'ship', devBody: { sha: repo.shas[3] } });
    expect(r.status, r.log).toBe(0);
    expect(r.outputs.prod_tag).toBe('prod-11');
    expect(r.outputs.prev_tag).toBe('prod-1');
  });

  test('ship when dev is already prod makes no new release', async () => {
    const repo = makeRepo(2);
    repo.tag({ 'prod-1': 0, 'prod-2': 1, prod: 1 });
    const r = await plan(repo, { action: 'ship', devBody: { sha: repo.shas[1] } });
    expect(r.status, r.log).toBe(0);
    expect(r.log).toContain('is already prod');
    expect(r.outputs).toMatchObject({ prod_sha: repo.shas[1], prod_tag: 'prod-2', new_release: 'false' });
  });

  test('rollback goes to the release before the current one and keeps dev', async () => {
    const repo = makeRepo(4);
    repo.tag({ 'prod-1': 0, 'prod-2': 1, 'prod-3': 2, prod: 2 });
    const r = await plan(repo, { action: 'rollback', devBody: { sha: repo.shas[3] } });
    expect(r.status, r.log).toBe(0);
    expect(r.outputs).toEqual({
      prod_sha: repo.shas[1], prod_tag: 'prod-2', dev_sha: repo.shas[3], new_release: 'false', prev_tag: 'prod-3',
    });
  });

  test('rollback compares release numbers, not text (prod-10 to prod-9)', async () => {
    const repo = makeRepo(3);
    repo.tag({ 'prod-9': 0, 'prod-10': 1, prod: 1 });
    const r = await plan(repo, { action: 'rollback', devBody: { sha: repo.shas[2] } });
    expect(r.status, r.log).toBe(0);
    expect(r.outputs).toMatchObject({ prod_sha: repo.shas[0], prod_tag: 'prod-9' });
  });

  test('rollback to prod-N goes to that release', async () => {
    const repo = makeRepo(4);
    repo.tag({ 'prod-1': 0, 'prod-2': 1, 'prod-3': 2, prod: 2 });
    const r = await plan(repo, { action: 'rollback', rollbackTag: 'prod-1', devBody: { sha: repo.shas[3] } });
    expect(r.status, r.log).toBe(0);
    expect(r.outputs).toMatchObject({ prod_sha: repo.shas[0], prod_tag: 'prod-1', dev_sha: repo.shas[3], new_release: 'false' });
  });

  test('rollback to a release that does not exist stops', async () => {
    const repo = makeRepo(2);
    repo.tag({ 'prod-1': 0, prod: 0 });
    const r = await plan(repo, { action: 'rollback', rollbackTag: 'prod-7', devBody: { sha: repo.shas[1] } });
    expect(r.status).not.toBe(0);
    expect(r.log).toContain("No release called 'prod-7'");
    expect(r.outputs).toEqual({});
  });

  test('rollback with no earlier release stops', async () => {
    const repo = makeRepo(2);
    repo.tag({ 'prod-1': 0, prod: 0 });
    const r = await plan(repo, { action: 'rollback', devBody: { sha: repo.shas[1] } });
    expect(r.status).not.toBe(0);
    expect(r.log).toContain('no earlier prod release');
    expect(r.outputs).toEqual({});
  });

  for (const [name, devBody] of [
    ['missing', null],
    ['not JSON', '<html>404</html>'],
    ['an unknown commit', { sha: 'f'.repeat(40) }],
  ]) {
    for (const action of ['ship', 'rollback']) {
      test(`${action} stops when dev's version is ${name}`, async () => {
        const repo = makeRepo(3);
        repo.tag({ 'prod-1': 0, 'prod-2': 1, prod: 1 });
        const r = await plan(repo, { action, devBody });
        expect(r.status).not.toBe(0);
        expect(r.log).toContain('Could not read which commit dev serves');
        expect(r.outputs).toEqual({});
      });
    }
  }

  test('an unknown action stops', async () => {
    const repo = makeRepo(1);
    const r = await plan(repo, { action: 'promote' });
    expect(r.status).not.toBe(0);
    expect(r.log).toContain("Unknown action 'promote'");
  });
});
